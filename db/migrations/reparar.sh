#!/bin/bash
# ================================================================
# Re-verifica las migraciones marcadas como @idempotente.
#
# Para que existe:
#   Restaurar un respaldo desde la interfaz (Corte.vue) reemplaza las
#   tablas con las del dump. Si el dump es viejo, se pierden columnas y
#   restricciones que agregaron las migraciones, pero
#   public.schema_migrations sigue diciendo "al dia" y apply.sh no
#   vuelve a aplicarlas. El backend entonces falla en runtime
#   (por ejemplo: "column v1_0.es_ambulante does not exist").
#
# Que hace:
#   Vuelve a aplicar, en cada "docker compose up", todos los .sql que
#   llevan la marca "-- @idempotente" en su cabecera. Esas migraciones
#   estan escritas para poder correrse varias veces sin efectos
#   secundarios (CREATE ... IF NOT EXISTS, DROP ... IF EXISTS, etc.).
#
# Que NO hace:
#   No toca las migraciones sin la marca: esas se aplican una sola vez
#   desde apply.sh, porque podrian duplicar datos.
# ================================================================
set -euo pipefail

MIGRACIONES_DIR="${MIGRACIONES_DIR:-/migrations}"
BASE_DULCESNC="${BASE_DULCESNC:-dulcesnc}"
BASE_ABARROTERA="${BASE_ABARROTERA:-dulcesnc_abarrotera}"
ESQUEMA_DULCESNC="${ESQUEMA_DULCESNC:-tiendadb}"
ESQUEMA_ABARROTERA="${ESQUEMA_ABARROTERA:-tiendadb_abarrotera}"
USUARIO="${POSTGRES_USER:-user}"
export PGPASSWORD="${PGPASSWORD:-password}"

psql_bd() {
    psql -v ON_ERROR_STOP=1 --username "$USUARIO" "$@"
}

esperar_base() {
    local base="$1"
    local intento
    for intento in $(seq 1 60); do
        if pg_isready --username "$USUARIO" --dbname "$base" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
    done
    echo "ERROR: la base $base no respondio despues de 120 segundos" >&2
    return 1
}

asegurar_tabla_control() {
    local base="$1"
    psql_bd --dbname "$base" -q -c "
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
            archivo     TEXT PRIMARY KEY,
            aplicado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );"
}

es_idempotente() {
    local archivo="$1"
    grep -q '^-- @idempotente' "$archivo"
}

reparar_en_base() {
    local base="$1"
    local esquema="$2"
    local rewrite="${3:-}"
    local archivo nombre tmp

    echo "--- Verificando invariantes en $base (esquema $esquema) ---"
    esperar_base "$base"
    asegurar_tabla_control "$base"

    for archivo in "$MIGRACIONES_DIR"/*.sql; do
        [ -e "$archivo" ] || continue
        nombre="$(basename "$archivo")"

        if ! es_idempotente "$archivo"; then
            continue
        fi

        tmp="$(mktemp)"
        awk -v base="$base" -v esquema="$esquema" -v rewrite="$rewrite" \
            -f "$MIGRACIONES_DIR/filtrar.awk" "$archivo" > "$tmp"

        if ! grep -q '^-- @@stmt$' "$tmp"; then
            rm -f "$tmp"
            continue
        fi

        echo "  ~ $nombre (verificada)"
        psql_bd --single-transaction --dbname "$base" -q -f "$tmp"
        psql_bd --dbname "$base" -q -c \
            "INSERT INTO public.schema_migrations (archivo) VALUES ('$nombre')
             ON CONFLICT (archivo) DO NOTHING;"
        rm -f "$tmp"
    done
}

echo "=== Verificando invariantes de esquema (migraciones idempotentes) ==="
reparar_en_base "$BASE_DULCESNC" "$ESQUEMA_DULCESNC"
reparar_en_base "$BASE_ABARROTERA" "$ESQUEMA_ABARROTERA"

# ==================================================================
# Registro de control de sucursales (proyecto generico)
# ==================================================================
# La tabla tiendadb_control.sucursales vive SOLO en la base principal y
# mapea cada sucursal con su slot fisico (b1..b6). Las ramas dinamicas
# (b3..b6) tienen su propia base, creada desde la plantilla.
echo "=== Asegurando registro de sucursales en $BASE_DULCESNC ==="
psql_bd --dbname "$BASE_DULCESNC" -q <<'EOSQL'
CREATE SCHEMA IF NOT EXISTS tiendadb_control;

CREATE TABLE IF NOT EXISTS tiendadb_control.sucursales (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(60) NOT NULL,
    slug           VARCHAR(40) NOT NULL UNIQUE,
    slot           VARCHAR(8)  NOT NULL UNIQUE,
    db_name        VARCHAR(60) NOT NULL UNIQUE,
    esquema        VARCHAR(60) NOT NULL,
    estado         VARCHAR(10) NOT NULL DEFAULT 'ACTIVA',
    orden          INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tiendadb_control.sucursales (nombre, slug, slot, db_name, esquema, orden)
VALUES ('Sucursal Principal', 'dulceria', 'b1', 'dulcesnc', 'tiendadb', 1)
ON CONFLICT (slot) DO NOTHING;
-- El generico arranca con UNA sola sucursal. "abarrotera" es una rama
-- historica de La Leyenda: su base existe en el servidor pero NO se registra
-- ni se ofrece en el login; las demas ramas se crean dinamicamente (b3..b6).
EOSQL

# --- Plantilla para sucursales nuevas (dulcesnc_tpl) ---
# Estructura actual de la base principal, sin datos. Se reconstruye en cada
# arranque para que las ramas nuevas nazcan siempre al dia de migraciones.
# Requiere que nadie tenga sesiones abiertas en la plantilla (el backend
# todavia no arranco: db-init corre antes).
echo "=== Reconstruyendo plantilla dulcesnc_tpl ==="
if ! psql_bd --dbname postgres -q -c "DROP DATABASE IF EXISTS dulcesnc_tpl" 2>/dev/null; then
    echo "  ! no se pudo borrar la plantilla (en uso); se deja la existente"
else
    if psql_bd --dbname postgres -q -c "CREATE DATABASE dulcesnc_tpl" 2>/dev/null; then
        {
            pg_dump --schema-only --no-owner --no-privileges \
                --username "$USUARIO" "$BASE_DULCESNC"
            # Datos de referencia que las ramas nuevas necesitan nacer con ellos
            # (tipos_usuario por FK del alta, categorias/renta/ajuste semilla).
            pg_dump --data-only --no-owner --no-privileges \
                -t 'tiendadb.tipos_usuario' -t 'tiendadb.categorias' \
                -t 'tiendadb.renta_local' -t 'tiendadb.ajuste_precio' \
                --username "$USUARIO" "$BASE_DULCESNC"
            psql_bd --dbname "$BASE_DULCESNC" -tA -c \
                "SELECT format('INSERT INTO public.schema_migrations (archivo) VALUES (%L);', archivo)
                 FROM public.schema_migrations"
        } | psql_bd --dbname dulcesnc_tpl -q -v ON_ERROR_STOP=1 \
            && echo "  + plantilla lista" \
            || echo "  ! fallo al cargar la plantilla"
    else
        echo "  ! no se pudo crear la plantilla"
    fi
fi

# --- Ramas dinamicas registradas (b3..b6) ---
while read -r rama_db rama_esq; do
    [ -n "$rama_db" ] || continue
    if psql_bd --dbname postgres -tA -c \
        "SELECT 1 FROM pg_database WHERE datname = '$rama_db'" 2>/dev/null | grep -q '^1$'; then
        reparar_en_base "$rama_db" "$rama_esq" rewrite
    fi
done <<EOF
$(psql_bd --dbname "$BASE_DULCESNC" -tA -c \
    "SELECT db_name || ' ' || esquema FROM tiendadb_control.sucursales
     WHERE estado = 'ACTIVA' AND slot NOT IN ('b1', 'b2')" 2>/dev/null || true)
EOF

echo "=== Invariantes verificados ==="

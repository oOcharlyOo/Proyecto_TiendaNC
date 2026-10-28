#!/bin/bash
# ================================================================
# Aplica las migraciones pendientes de db/migrations.
#
# - Solo se ejecutan los .sql que estan directamente en db/migrations.
#   La carpeta db/migrations/historicas/ NO se ejecuta: esas migraciones
#   (001-016) ya estan consolidadas en db/init/init.sh.
# - Cada archivo .sql se aplica una sola vez por base. El registro
#   queda en public.schema_migrations.
# - Las migraciones traen sentencias para las dos bases en el mismo
#   archivo; filtrar.awk deja solo las que aplican a cada una.
# - Cada archivo se aplica en una transaccion (--single-transaction):
#   si una sentencia falla, no queda la migracion a medias.
#
# Se ejecuta desde db/init/init.sh, que a su vez corre el servicio
# db-init de docker compose en cada "up".
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

# Espera a que la base acepte conexiones (en el arranque del contenedor de
# Postgres todavia no estan listas). Usa PGHOST/PGPORT del entorno cuando
# existen; si no, cae al socket local.
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

aplicar_en_base() {
    local base="$1"
    local esquema="$2"
    local rewrite="${3:-}"
    local archivo nombre ya tmp

    echo "--- Migraciones en $base (esquema $esquema) ---"
    esperar_base "$base"
    asegurar_tabla_control "$base"

    for archivo in "$MIGRACIONES_DIR"/*.sql; do
        [ -e "$archivo" ] || continue
        nombre="$(basename "$archivo")"

        ya="$(psql_bd --dbname "$base" -tA -c \
            "SELECT 1 FROM public.schema_migrations WHERE archivo = '$nombre';")"
        if [ "$ya" = "1" ]; then
            echo "  = $nombre (ya aplicada)"
            continue
        fi

        tmp="$(mktemp)"
        awk -v base="$base" -v esquema="$esquema" -v rewrite="$rewrite" \
            -f "$MIGRACIONES_DIR/filtrar.awk" "$archivo" > "$tmp"

        # Si el archivo no tiene sentencias para esta base, no se registra:
        # asi, si algun dia se le agregan, se aplican en la siguiente corrida.
        if ! grep -q '^-- @@stmt$' "$tmp"; then
            echo "  . $nombre (sin sentencias para $base)"
            rm -f "$tmp"
            continue
        fi

        echo "  + $nombre"
        psql_bd --single-transaction --dbname "$base" -q -f "$tmp"
        psql_bd --dbname "$base" -q -c \
            "INSERT INTO public.schema_migrations (archivo) VALUES ('$nombre')
             ON CONFLICT (archivo) DO NOTHING;"
        rm -f "$tmp"
    done
}

# Bases de las ramas dinamicas (sucursales b3..b6) registradas por el backend.
# Si el registro de control aun no existe (instalacion virgen), devuelve nada.
listar_ramas_dinamicas() {
    psql_bd --dbname "$BASE_DULCESNC" -tA -c \
        "SELECT db_name || ' ' || esquema FROM tiendadb_control.sucursales
         WHERE estado = 'ACTIVA' AND slot NOT IN ('b1', 'b2')" 2>/dev/null || true
}

existe_base() {
    psql_bd --dbname postgres -tA -c \
        "SELECT 1 FROM pg_database WHERE datname = '$1'" 2>/dev/null | grep -q '^1$'
}

echo "=== Aplicando migraciones pendientes ==="
aplicar_en_base "$BASE_DULCESNC" "$ESQUEMA_DULCESNC"
aplicar_en_base "$BASE_ABARROTERA" "$ESQUEMA_ABARROTERA"

while read -r rama_db rama_esq; do
    [ -n "$rama_db" ] || continue
    if existe_base "$rama_db"; then
        aplicar_en_base "$rama_db" "$rama_esq" rewrite
    fi
done <<EOF
$(listar_ramas_dinamicas)
EOF
echo "=== Migraciones al dia ==="

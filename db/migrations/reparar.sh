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
        awk -v base="$base" -v esquema="$esquema" \
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
echo "=== Invariantes verificados ==="

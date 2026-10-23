# Migraciones de base de datos

Se ejecutan solas en cada `docker compose up`, desde el servicio `db-init`
(`db/init/init.sh` → `db/migrations/apply.sh` y `db/migrations/reparar.sh`).

## Cómo agregar una migración

1. Crea `0NN_descripcion.sql` en esta carpeta.
2. Escribe las sentencias para **los dos** esquemas en el mismo archivo
   (`tiendadb.*` y `tiendadb_abarrotera.*`). `filtrar.awk` deja en cada base
   solo las que le corresponden.
3. Si la migración se puede correr más de una vez sin efectos secundarios
   (`CREATE ... IF NOT EXISTS`, `DROP ... IF EXISTS`, normalizaciones
   idempotentes), agrega `-- @idempotente` en la cabecera.

## apply.sh vs reparar.sh

- `apply.sh`: aplica cada archivo **una sola vez** por base y lo registra en
  `public.schema_migrations`.
- `reparar.sh`: vuelve a aplicar en cada arranque los archivos marcados
  `-- @idempotente`, sin importar el registro.

## Por qué existe reparar.sh

Restaurar un respaldo desde la interfaz (`Corte.vue`) reemplaza las tablas con
las del dump. Si el dump es anterior a una migración, se pierden columnas y
restricciones, pero `public.schema_migrations` sigue diciendo "al día": el
backend falla en runtime (por ejemplo
`column v1_0.es_ambulante does not exist`). `reparar.sh` devuelve esas
invariantes en el siguiente `up` sin intervención manual.

Por eso **toda migración que solo agrega columnas, tablas, índices o
restricciones debe marcarse `-- @idempotente`**: así sobrevive a una
restauración.

## Migraciones históricas

`historicas/` (001–016) no se ejecutan: están consolidadas en
`db/init/init.sh`. Ver `historicas/LEEME.md`.

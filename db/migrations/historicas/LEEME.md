# Migraciones historicas (001 - 016)

Estos archivos **no se ejecutan automaticamente**. Se conservan como
referencia de la evolucion del esquema.

`db/init/init.sh` es la linea base consolidada: ya crea el esquema actual
completo de las dos sucursales (`tiendadb` y `tiendadb_abarrotera`), incluyendo
todo lo que agregaron estas migraciones.

Se archivaron por dos motivos:

1. Ya estan aplicadas en produccion y en cualquier instalacion nueva las cubre
   `init.sh`.
2. Algunas no son seguras de re-ejecutar. Por ejemplo, la `007` elimina
   `productos.presentacion_caja`, columna que el backend usa hoy.

Las migraciones nuevas van en `db/migrations/` (junto a `apply.sh`) y se
aplican solas en cada `docker compose up`.

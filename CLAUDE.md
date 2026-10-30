# Proyecto TiendaNC — contexto

Sistema POS / administración de tienda (dulcería "La Leyenda del Dulce"). La rama `generico` es el despliegue del proyecto genérico (base multi-sucursal). Ramas de despliegue: `generico`, `leyendadeldulce`, `panaderiaSucursal` (cada una con su docker-compose.yml aislado).

## Módulos
- `Proyecto_TiendaNC/` — backend **Quarkus 3.30 (Java 17)** con extensión de compatibilidad Spring Web (`@RestController`, `@GetMapping`...). Paquete `dulcesNC`: `controller/`, `service/`, `repository/`, `model/` (entidades, `dto/`, `response/RespuestaPersonalizada`), `filter/`, `scheduler/`, `context/`. Respuestas siempre `{ codigo, mensaje, datos }`. Lista de endpoints en `Proyecto_TiendaNC/ENDPOINTS.md`. Imagen: `Dockerfile.jvm`.
- `Proyecto_Tienda_frontend/` — **Vue 3 + Vite + TS** (vue-router, chart.js, sweetalert2). Lógica por módulo en `src/components/<Modulo>/logica/use*.ts`, vistas en `secciones/`, modales en `modals/`. Rutas SPA: `/`, `/ventas`, `/productos`, `/inventario`, `/corte`, `/usuarios`, `/finanzas`, `/rental`.
- `Proyecyo_Tienda_Movil/` — app Android (Kotlin, Room, paquete `com.dulcesnc.pos`).
- `Proyecto_TiendaNC_interfaz/` — interfaz HTML/Tailwind antigua (legacy).
- `db/` — `init/init.sh` (lo ejecuta el contenedor `db-init`), `migrations/` numeradas (+ `historicas/`), `backups/`.

## Despliegue (docker-compose.yml raíz)
Servicios (contenedores con prefijo `generico-`): `backend` (8080), `frontend` nginx (8081), `database` postgres:13 (5432, db `dulcesnc`), `db-init`, `minio` (9000/9001), `db-backup`, `ollama` (puerto host 11436), `tunnel` cloudflared (token `CLOUDFLARE_TUNNEL_TOKEN_GENERICO` en `.env`).

## Enrutamiento API — IMPORTANTE
- El frontend se compila con `.env.production` → `VITE_API_URL=https://api.laleyendadeldulce.com`: el navegador llama al backend directo por su dominio (túnel → `backend:8080`), no por el nginx del frontend. El `environment` de compose NO afecta: Vite resuelve en build.
- El nginx del frontend (inline en `Proyecto_Tienda_frontend/Dockerfile`) también proxea a `backend:8080` como respaldo (p. ej. si se compila con el dominio del frontend). La regex solo proxea `/<recurso>/<algo>` porque `/ventas`, `/productos`, etc. son rutas de la SPA.
- Cada prefijo nuevo de controlador (`@Path`/`@RequestMapping`) debe agregarse a esa regex; y los endpoints que se llaman **sin subruta** (`/apartado`, `/rentaLocal`, `/ajustePrecio`) necesitan su propio `location` exacto, si no caen en `location /` y un PUT/POST devuelve 405.
- El backend `Proyecto_TiendaNC/` está en `.gitignore`: no se versiona en ninguna rama.

## Responsividad (frontend)
- `src/components/styles/responsive.css`: escala el `font-size` del `html` en ≥1920 / 2560 / 3200 / 3840px. Casi todo usa `rem`, así que usar `rem` (no `px`) para que escale en 2K/4K.
- Submenús (barras de pestañas de cada módulo): usar la directiva global `v-submenu` (`src/directives/submenu.ts`). Desplazamiento horizontal, desvanecido de bordes, rueda del mouse y centra la pestaña con clase `.active`/`.is-active`.
- En grids usar `minmax(0,1fr)` en lugar de `1fr` para que el contenido no desborde en celular.

# Proyecto TiendaNC — contexto

Sistema POS / administración de tienda (dulcería "La Leyenda del Dulce"). La rama `panaderiaSucursal` es un despliegue aislado para la sucursal panadería.

## Módulos
- `Proyecto_TiendaNC/` — backend **Quarkus 3.30 (Java 17)** con extensión de compatibilidad Spring Web (`@RestController`, `@GetMapping`...). Paquete `dulcesNC`: `controller/`, `service/`, `repository/`, `model/` (entidades, `dto/`, `response/RespuestaPersonalizada`), `filter/`, `scheduler/`, `context/`. Respuestas siempre `{ codigo, mensaje, datos }`. Lista de endpoints en `Proyecto_TiendaNC/ENDPOINTS.md`. Imagen: `Dockerfile.jvm`.
- `Proyecto_Tienda_frontend/` — **Vue 3 + Vite + TS** (vue-router, chart.js, sweetalert2). Lógica por módulo en `src/components/<Modulo>/logica/use*.ts`, vistas en `secciones/`, modales en `modals/`. Rutas SPA: `/`, `/ventas`, `/productos`, `/inventario`, `/corte`, `/usuarios`, `/finanzas`, `/rental`.
- `Proyecyo_Tienda_Movil/` — app Android (Kotlin, Room, paquete `com.dulcesnc.pos`).
- `Proyecto_TiendaNC_interfaz/` — interfaz HTML/Tailwind antigua (legacy).
- `db/` — `init/init.sh` (lo ejecuta el contenedor `db-init`), `migrations/` numeradas (+ `historicas/`), `backups/`.

## Despliegue (docker-compose.yml raíz)
Servicios: `backend` (18080), `frontend` nginx (18081), `database` postgres:13 (15432, db `dulcesnc`), `db-init`, `minio` (19000/19001), `db-backup` (backups/restores por archivos trigger), `ollama` (qwen2.5:7b), `tunnel` cloudflared (token `CLOUDFLARE_TUNNEL_TOKEN_PANADERIA` en `.env`, ingress gestionado remotamente en Cloudflare).

## Enrutamiento API — IMPORTANTE
- El frontend se compila con `.env.production` → `VITE_API_URL=https://panaderia.laleyendadeldulce.com` (el `environment` de compose NO afecta: Vite resuelve en build).
- Por eso las llamadas API llegan al **nginx del frontend**, configurado inline en `Proyecto_Tienda_frontend/Dockerfile`, que hace proxy a `backend:8080`.
- La regex general solo proxea `/<recurso>/<algo>` (requiere subruta) porque rutas sin subruta como `/ventas` o `/productos` son rutas de la SPA.
- Cada prefijo nuevo de controlador (`@Path`/`@RequestMapping`) debe agregarse a esa regex; si no, nginx devuelve `index.html` y el frontend falla al parsear JSON (pasó con `/inteligencia` y `/ventasAmbulante`).
- Endpoints que se llaman **sin subruta** (`/sucursales`, `/apartado`, `/rentaLocal`, `/ajustePrecio`) necesitan su propio `location` exacto; si no, caen en `location /` (archivos estáticos) y un PUT/POST devuelve **405**. Al agregar un endpoint nuevo sin subruta, añadirlo ahí y reconstruir la imagen `frontend`.

## Responsividad (frontend)
- `src/components/styles/responsive.css`: escala el `font-size` del `html` en ≥1920 / 2560 / 3200 / 3840px. Casi todo usa `rem`, así que usar `rem` (no `px`) para que escale en 2K/4K.
- Submenús (barras de pestañas de cada módulo): usar la directiva global `v-submenu` (`src/directives/submenu.ts`). Desplazamiento horizontal, desvanecido de bordes, rueda del mouse y centra la pestaña con clase `.active`/`.is-active`.
- En grids usar `minmax(0,1fr)` en lugar de `1fr` para que el contenido no desborde en celular.

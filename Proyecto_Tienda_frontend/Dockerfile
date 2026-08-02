# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Usar archivo de producción

RUN npm run build-only

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 256; \
    gzip_proxied any; \
    gzip_comp_level 6; \
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml; \
    gzip_disable "MSIE [1-6]\."; \
    gzip_static on; \
    \
    open_file_cache max=1000 inactive=20s; \
    open_file_cache_valid 30s; \
    open_file_cache_min_uses 2; \
    open_file_cache_errors on; \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ { \
        expires 30d; \
        add_header Cache-Control "public, immutable"; \
        access_log off; \
    } \
    \
    location ~ ^/(backup|caja|ventas|ventasDetalle|boveda|ganancias|gananciasAcumuladas|usuarios|apartado|corte|productos|producto-proveedor|producto-presentacion-caja|categorias|subcategorias|proveedores|pedidos-proveedor|promociones|imagenes|credito|asistencias|voice)/ { \
        proxy_pass http://backend:8080; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_connect_timeout 60s; \
        proxy_send_timeout 60s; \
        proxy_read_timeout 60s; \
        proxy_buffering off; \
    } \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
        expires 7d; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

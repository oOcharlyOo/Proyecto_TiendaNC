FROM nginx:alpine

# 1. Limpiar la carpeta por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# 2. Copiar todo el contenido del proyecto
# Esto copiará los .css de la raíz a la raíz
# Y la carpeta resources/style/ con sus .css a su lugar correspondiente
COPY . /usr/share/nginx/html/

# 3. Forzar permisos (Esto evita el 404 por bloqueo de lectura)
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
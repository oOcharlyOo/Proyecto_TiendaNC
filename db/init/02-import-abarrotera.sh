#!/bin/bash
set -e

# Crear la base de datos de abarrotera
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE dulcesnc_abarrotera;
EOSQL

# Crear todas las tablas y sincronizar usuarios
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dulcesnc_abarrotera" <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS tiendadb_abarrotera;

    -- 1. Tipos de Usuario
    CREATE TABLE tiendadb_abarrotera.tipos_usuario (
        id_tipo_usuario SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        descripcion TEXT
    );

    -- 2. Usuarios
    CREATE TABLE tiendadb_abarrotera.usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        apellido_p VARCHAR(255) NOT NULL,
        apellido_m VARCHAR(255) NOT NULL,
        usuario VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        id_tipo_usuario INTEGER NOT NULL,
        avatar TEXT,
        sueldo_hora DECIMAL(10, 2) DEFAULT 0.00,
        dias_semana INT DEFAULT 6,
        horas_trabajadas INT DEFAULT 8,
        CONSTRAINT fk_tipo_usuario_abarrotera
            FOREIGN KEY(id_tipo_usuario) REFERENCES tiendadb_abarrotera.tipos_usuario(id_tipo_usuario)
            ON DELETE RESTRICT ON UPDATE CASCADE
    );

    -- 3. Categoria
    CREATE TABLE tiendadb_abarrotera.categorias (
        id_categoria SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE,
        descripcion TEXT,
        estatus VARCHAR(1) DEFAULT 'A'
    );

    INSERT INTO tiendadb_abarrotera.categorias (nombre, descripcion, estatus) VALUES 
    ('Sin asignar', 'Categoria por defecto', 'A');

    -- 4. Productos
    CREATE TABLE tiendadb_abarrotera.productos (
        id_producto SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo_barras VARCHAR(255),
        id_categoria INT NOT NULL DEFAULT 1,
        precio_costo DECIMAL(10, 2) NOT NULL,
        precio_venta DECIMAL(10, 2) NOT NULL,
        cantidad_min INT NOT NULL,
        cantidad_max INT NOT NULL,
        stock INT NOT NULL,
        precio_mayoreo DECIMAL(10, 2),
        is_gramaje BOOLEAN DEFAULT FALSE,
        estatus VARCHAR(1) DEFAULT 'A',
        CONSTRAINT fk_categoria_producto_abarrotera
            FOREIGN KEY(id_categoria) REFERENCES tiendadb_abarrotera.categorias(id_categoria)
            ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE OR REPLACE FUNCTION tiendadb_abarrotera.fn_limpiar_codigo_barras()
    RETURNS TRIGGER AS \$\$
    BEGIN
        IF NEW.codigo_barras = '' THEN
            NEW.codigo_barras := NULL;
        END IF;
        RETURN NEW;
    END;
    \$\$ LANGUAGE plpgsql;

    CREATE TRIGGER tr_productos_limpiar_codigo_abarrotera
    BEFORE INSERT OR UPDATE ON tiendadb_abarrotera.productos
    FOR EACH ROW
    EXECUTE FUNCTION tiendadb_abarrotera.fn_limpiar_codigo_barras();

    -- 5. Ventas
    CREATE TABLE tiendadb_abarrotera.ventas (
        id_venta SERIAL PRIMARY KEY,
        id_usuario INT NOT NULL,
        fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        monto_total DECIMAL(12, 2) NOT NULL,
        estatus VARCHAR(1) DEFAULT 'P',
        numero_ticket INT NOT NULL DEFAULT 0,
        metodo_pago VARCHAR(50) DEFAULT 'EFECTIVO',
        CONSTRAINT fk_usuario_venta_abarrotera
            FOREIGN KEY(id_usuario) REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
    );

    -- 6. Ventas Detalle
    CREATE TABLE tiendadb_abarrotera.ventas_detalle (
        id_venta_detalle SERIAL PRIMARY KEY,
        id_venta INT NOT NULL,
        id_producto INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario_venta DECIMAL(10, 2) NOT NULL,
        tipo_precio_aplicado VARCHAR(50) DEFAULT 'VENTA',
        CONSTRAINT fk_venta_detalle_abarrotera
            FOREIGN KEY(id_venta) REFERENCES tiendadb_abarrotera.ventas(id_venta) ON DELETE CASCADE,
        CONSTRAINT fk_producto_detalle_abarrotera
            FOREIGN KEY(id_producto) REFERENCES tiendadb_abarrotera.productos(id_producto)
    );

    -- 7. Caja
    CREATE TABLE tiendadb_abarrotera.caja (
        id_caja SERIAL PRIMARY KEY,
        fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tipo_movimiento VARCHAR(50) NOT NULL,
        monto DECIMAL(12, 2) NOT NULL,
        descripcion TEXT,
        saldo_resultante DECIMAL(12, 2) NOT NULL,
        id_usuario INT NOT NULL,
        estatus VARCHAR(1) DEFAULT 'P',
        CONSTRAINT fk_usuario_caja_abarrotera
            FOREIGN KEY(id_usuario) REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
            ON DELETE RESTRICT ON UPDATE CASCADE
    );

    -- 8. Boveda
    CREATE TABLE tiendadb_abarrotera.boveda (
        id_boveda SERIAL PRIMARY KEY,
        fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        monto_total DECIMAL(12, 2) NOT NULL,
        monto_ajuste DECIMAL(12, 2) NOT NULL DEFAULT 0,
        tipo_movimiento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        id_usuario INT NOT NULL,
        CONSTRAINT fk_usuario_boveda_abarrotera
            FOREIGN KEY(id_usuario) REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
            ON DELETE RESTRICT ON UPDATE CASCADE
    );

    -- 9. Ganancias Acumuladas
    CREATE TABLE tiendadb_abarrotera.ganancias_acumuladas (
        id_ganancia BIGSERIAL PRIMARY KEY,
        fecha_movimiento TIMESTAMP NOT NULL DEFAULT NOW(),
        monto_total DECIMAL(12, 2) NOT NULL,
        monto_ajuste DECIMAL(12, 2) NOT NULL,
        tipo_movimiento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        id_usuario BIGINT NOT NULL REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
    );

    CREATE INDEX idx_ganancias_fecha_abarrotera ON tiendadb_abarrotera.ganancias_acumuladas(fecha_movimiento DESC);

    -- 10. Promociones
    CREATE TABLE tiendadb_abarrotera.promociones (
        id_promocion BIGSERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        precio_original DECIMAL(10,2) NOT NULL,
        precio_promocion DECIMAL(10,2) NOT NULL,
        imagen_url VARCHAR(500),
        activa BOOLEAN DEFAULT TRUE,
        fecha_inicio TIMESTAMP,
        fecha_fin TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. Promocion Detalles
    CREATE TABLE tiendadb_abarrotera.promocion_detalles (
        id_detalle BIGSERIAL PRIMARY KEY,
        id_promocion BIGINT NOT NULL,
        id_producto BIGINT NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT fk_promocion_abarrotera FOREIGN KEY (id_promocion) REFERENCES tiendadb_abarrotera.promociones(id_promocion) ON DELETE CASCADE,
        CONSTRAINT fk_producto_abarrotera FOREIGN KEY (id_producto) REFERENCES tiendadb_abarrotera.productos(id_producto) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_promociones_activa_abarrotera ON tiendadb_abarrotera.promociones(activa);
    CREATE INDEX IF NOT EXISTS idx_promociones_fechas_abarrotera ON tiendadb_abarrotera.promociones(fecha_inicio, fecha_fin);
    CREATE INDEX IF NOT EXISTS idx_promocion_detalles_promocion_abarrotera ON tiendadb_abarrotera.promocion_detalles(id_promocion);

    -- 12. Apartados
    CREATE TABLE tiendadb_abarrotera.apartado (
        id_apartado SERIAL PRIMARY KEY,
        nombre_producto VARCHAR(255) NOT NULL,
        monto_total DECIMAL(12,2) NOT NULL,
        monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
        frecuencia_pago VARCHAR(20) NOT NULL,
        monto_por_periodo DECIMAL(12,2) NOT NULL,
        monto_diario DECIMAL(12,2) NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE,
        estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
        id_usuario INTEGER NOT NULL REFERENCES tiendadb_abarrotera.usuarios(id_usuario),
        fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_apartado_usuario_abarrotera ON tiendadb_abarrotera.apartado(id_usuario);
    CREATE INDEX idx_apartado_estatus_abarrotera ON tiendadb_abarrotera.apartado(estatus);

    -- 13. Apartado Pagos
    CREATE TABLE tiendadb_abarrotera.apartado_pago (
        id_pago SERIAL PRIMARY KEY,
        id_apartado INTEGER NOT NULL REFERENCES tiendadb_abarrotera.apartado(id_apartado),
        monto DECIMAL(12,2) NOT NULL,
        fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_usuario INTEGER NOT NULL REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
    );

    CREATE INDEX idx_apartado_pago_apartado_abarrotera ON tiendadb_abarrotera.apartado_pago(id_apartado);
    CREATE INDEX idx_apartado_pago_usuario_abarrotera ON tiendadb_abarrotera.apartado_pago(id_usuario);

    -- ============================================
    -- Sincronizacion de usuarios desde dulcesnc
    -- ============================================
    CREATE EXTENSION IF NOT EXISTS dblink;

    -- Sincronizar tipos de usuario
    INSERT INTO tiendadb_abarrotera.tipos_usuario (id_tipo_usuario, nombre, descripcion)
    SELECT id_tipo_usuario, nombre, descripcion
    FROM dblink('dbname=dulcesnc user=user password=password', 
        'SELECT id_tipo_usuario, nombre, descripcion FROM tiendadb.tipos_usuario')
        AS t(id_tipo_usuario int, nombre varchar(50), descripcion text)
    ON CONFLICT (id_tipo_usuario) DO NOTHING;

    -- Sincronizar usuarios
    INSERT INTO tiendadb_abarrotera.usuarios (id_usuario, nombre, apellido_p, apellido_m, usuario, password_hash, id_tipo_usuario, avatar, sueldo_hora, dias_semana, horas_trabajadas)
    SELECT id_usuario, nombre, apellido_p, apellido_m, usuario, password_hash, id_tipo_usuario, avatar, sueldo_hora, dias_semana, horas_trabajadas
    FROM dblink('dbname=dulcesnc user=user password=password',
        'SELECT id_usuario, nombre, apellido_p, apellido_m, usuario, password_hash, id_tipo_usuario, avatar, sueldo_hora, dias_semana, horas_trabajadas FROM tiendadb.usuarios')
        AS t(id_usuario int, nombre varchar(255), apellido_p varchar(255), apellido_m varchar(255), usuario varchar(100), password_hash varchar(255), id_tipo_usuario int, avatar text, sueldo_hora numeric, dias_semana int, horas_trabajadas int)
    ON CONFLICT (id_usuario) DO NOTHING;

    -- Reiniciar secuencias
    SELECT setval('tiendadb_abarrotera.tipos_usuario_id_tipo_usuario_seq', (SELECT COALESCE(MAX(id_tipo_usuario), 1) FROM tiendadb_abarrotera.tipos_usuario));
    SELECT setval('tiendadb_abarrotera.usuarios_id_usuario_seq', (SELECT COALESCE(MAX(id_usuario), 1) FROM tiendadb_abarrotera.usuarios));
EOSQL
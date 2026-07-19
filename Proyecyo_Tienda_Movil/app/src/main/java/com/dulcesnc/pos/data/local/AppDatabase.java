package com.dulcesnc.pos.data.local;

import androidx.room.Database;
import androidx.room.RoomDatabase;
import androidx.room.TypeConverters;

import com.dulcesnc.pos.data.local.converter.Converters;
import com.dulcesnc.pos.data.local.entity.ApartadoEntity;
import com.dulcesnc.pos.data.local.entity.CajaMovimientoEntity;
import com.dulcesnc.pos.data.local.entity.CategoriaEntity;
import com.dulcesnc.pos.data.local.entity.PedidoProveedorEntity;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.local.entity.PromocionEntity;
import com.dulcesnc.pos.data.local.entity.SubcategoriaEntity;
import com.dulcesnc.pos.data.local.entity.TicketEntity;
import com.dulcesnc.pos.data.local.entity.TicketItemEntity;
import com.dulcesnc.pos.data.local.entity.UsuarioEntity;
import com.dulcesnc.pos.data.local.entity.VentaDetalleEntity;
import com.dulcesnc.pos.data.local.entity.VentaEntity;

@Database(
    entities = {
        ProductoEntity.class,
        CategoriaEntity.class,
        SubcategoriaEntity.class,
        UsuarioEntity.class,
        VentaEntity.class,
        VentaDetalleEntity.class,
        TicketEntity.class,
        TicketItemEntity.class,
        PedidoProveedorEntity.class,
        ApartadoEntity.class,
        PromocionEntity.class,
        CajaMovimientoEntity.class
    },
    version = 4,
    exportSchema = true
)
@TypeConverters(Converters.class)
public abstract class AppDatabase extends RoomDatabase {
    public abstract com.dulcesnc.pos.data.local.dao.ProductoDao productoDao();
    public abstract com.dulcesnc.pos.data.local.dao.CategoriaDao categoriaDao();
    public abstract com.dulcesnc.pos.data.local.dao.SubcategoriaDao subcategoriaDao();
    public abstract com.dulcesnc.pos.data.local.dao.UsuarioDao usuarioDao();
    public abstract com.dulcesnc.pos.data.local.dao.VentaDao ventaDao();
    public abstract com.dulcesnc.pos.data.local.dao.VentaDetalleDao ventaDetalleDao();
    public abstract com.dulcesnc.pos.data.local.dao.TicketDao ticketDao();
    public abstract com.dulcesnc.pos.data.local.dao.TicketItemDao ticketItemDao();
    public abstract com.dulcesnc.pos.data.local.dao.PedidoProveedorDao pedidoProveedorDao();
    public abstract com.dulcesnc.pos.data.local.dao.ApartadoDao apartadoDao();
    public abstract com.dulcesnc.pos.data.local.dao.PromocionDao promocionDao();
    public abstract com.dulcesnc.pos.data.local.dao.CajaMovimientoDao cajaMovimientoDao();
}

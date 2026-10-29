package com.dulcesnc.pos.sync;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import static androidx.work.ExistingWorkPolicy.REPLACE;

import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.ApartadoEntity;
import com.dulcesnc.pos.data.local.entity.CajaMovimientoEntity;
import com.dulcesnc.pos.data.local.entity.CategoriaEntity;
import com.dulcesnc.pos.data.local.entity.PedidoProveedorEntity;
import com.dulcesnc.pos.data.local.entity.PromocionEntity;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.local.entity.SubcategoriaEntity;
import com.dulcesnc.pos.data.local.entity.UsuarioEntity;
import com.dulcesnc.pos.data.local.entity.VentaEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApartadoDTO;
import com.dulcesnc.pos.data.remote.dto.CajaAperturaDTO;
import com.dulcesnc.pos.data.remote.dto.CrearApartadoDTO;
import com.dulcesnc.pos.data.remote.dto.CrearPromocionDTO;
import com.dulcesnc.pos.data.remote.dto.EntradaSalidaDTO;
import com.dulcesnc.pos.data.remote.dto.PedidoProveedorDTO;
import com.dulcesnc.pos.data.remote.dto.ProductoDTO;
import com.dulcesnc.pos.data.remote.dto.PromocionDTO;
import com.dulcesnc.pos.data.remote.dto.SincronizacionMovilDTO;
import com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO;
import com.dulcesnc.pos.data.remote.dto.UsuarioDTO;
import com.dulcesnc.pos.data.remote.dto.VentaRequestDTO;
import com.dulcesnc.pos.utils.Constants;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import io.reactivex.rxjava3.schedulers.Schedulers;

public class SyncWorker extends Worker {

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            SharedPreferences prefs = getApplicationContext()
                    .getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE);
            String sucursal = prefs.getString(Constants.KEY_SUCURSAL, Constants.SUCURSAL_DULCERIA);
            RetrofitClient.getInstance().setSucursal(sucursal);

            subirVentasPendientes();
            subirPedidos();
            subirApartados();
            subirPromociones();
            subirCaja();
            subirCatalogo();

            descargarDatosMovil();

            return Result.success();
        } catch (Exception e) {
            android.util.Log.e("SyncWorker", "Error en sync", e);
            return Result.success();
        }
    }

    public static void syncNow(Context context) {
        try {
            OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(SyncWorker.class)
                    .setConstraints(new androidx.work.Constraints.Builder()
                            .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                            .build())
                    .build();
            WorkManager.getInstance(context)
                    .enqueueUniqueWork("sync_manual", REPLACE, request);
        } catch (Exception e) {
            android.util.Log.e("SyncWorker", "Error al programar sync manual", e);
        }
    }

    private DatabaseClient db() {
        return DatabaseClient.getInstance(getApplicationContext());
    }

    private void subirVentasPendientes() {
        List<VentaEntity> pendientes = db().getAppDatabase().ventaDao().getNoSincronizadas();
        if (pendientes == null) return;
        for (VentaEntity venta : pendientes) {
            try {
                VentaRequestDTO request = new VentaRequestDTO(
                        venta.getIdUsuario(), venta.getMontoTotal(),
                        venta.getEstatus(), venta.getNumeroTicket(),
                        venta.getMetodoPago(), new ArrayList<>());
                request.setIdVenta(venta.getIdVenta());
                RetrofitClient.getInstance().getApiService()
                        .agregarVenta(request)
                        .subscribeOn(Schedulers.io())
                        .blockingGet();
                venta.setSincronizado(true);
                db().getAppDatabase().ventaDao().update(venta);
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir venta " + venta.getIdVenta(), e);
            }
        }
    }

    private void subirPedidos() {
        List<PedidoProveedorEntity> lista = db().getAppDatabase().pedidoProveedorDao().getNoSincronizados();
        if (lista == null) return;
        for (PedidoProveedorEntity p : lista) {
            try {
                PedidoProveedorDTO dto = new PedidoProveedorDTO();
                dto.setIdProveedor(p.getIdProveedor());
                dto.setNombreProveedor(p.getNombreProveedor());
                dto.setFechaCreacion(p.getFechaCreacion());
                dto.setFechaEntregaEsperada(p.getFechaEntregaEsperada());
                dto.setMontoTotal(p.getMontoTotal());
                dto.setMontoApartado(p.getMontoApartado());
                dto.setEstatus(p.getEstatus());
                dto.setNotas(p.getNotas());
                if (p.getIdPedido() != null && p.getIdPedido() > 0) {
                    RetrofitClient.getInstance().getApiService()
                            .actualizarPedido(p.getIdPedido(), dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .crearPedido(dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                }
                p.setSincronizado(true);
                db().getAppDatabase().pedidoProveedorDao().update(p);
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir pedido", e);
            }
        }
    }

    private void subirApartados() {
        List<ApartadoEntity> lista = db().getAppDatabase().apartadoDao().getNoSincronizados();
        if (lista == null) return;
        for (ApartadoEntity a : lista) {
            try {
                CrearApartadoDTO dto = new CrearApartadoDTO(
                        a.getNombreProducto(), a.getMontoTotal(),
                        a.getFrecuenciaPago(), 0, a.getFechaInicio(), a.getIdUsuario());
                RetrofitClient.getInstance().getApiService()
                        .crearApartado(dto)
                        .subscribeOn(Schedulers.io()).blockingGet();
                a.setSincronizado(true);
                db().getAppDatabase().apartadoDao().update(a);
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir apartado", e);
            }
        }
    }

    private void subirPromociones() {
        List<PromocionEntity> lista = db().getAppDatabase().promocionDao().getNoSincronizados();
        if (lista == null) return;
        for (PromocionEntity p : lista) {
            try {
                CrearPromocionDTO dto = new CrearPromocionDTO();
                dto.setNombre(p.getNombre());
                dto.setDescripcion(p.getDescripcion());
                dto.setPrecioPromocion(p.getPrecioPromocion());
                dto.setImagenUrl(p.getImagenUrl());
                dto.setActiva(p.getActiva());
                dto.setFechaInicio(p.getFechaInicio());
                dto.setFechaFin(p.getFechaFin());
                if (p.getIdPromocion() != null && p.getIdPromocion() > 0) {
                    RetrofitClient.getInstance().getApiService()
                            .actualizarPromocion(p.getIdPromocion(), dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .crearPromocion(dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                }
                p.setSincronizado(true);
                db().getAppDatabase().promocionDao().update(p);
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir promocion", e);
            }
        }
    }

    private void subirCaja() {
        List<CajaMovimientoEntity> lista = db().getAppDatabase().cajaMovimientoDao().getNoSincronizados();
        if (lista == null) return;
        for (CajaMovimientoEntity m : lista) {
            try {
                EntradaSalidaDTO dto = new EntradaSalidaDTO();
                dto.setMontoEoS(java.math.BigDecimal.valueOf(m.getMonto()));
                dto.setDescripcion(m.getDescripcion());
                dto.setIdUsuario(m.getIdUsuario());
                if ("ENTRADA".equals(m.getTipo())) {
                    RetrofitClient.getInstance().getApiService()
                            .entradaEfectivo(dto).subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .salidaEfectivo(dto).subscribeOn(Schedulers.io()).blockingGet();
                }
                m.setSincronizado(true);
                db().getAppDatabase().cajaMovimientoDao().marcarSincronizado(m.getIdMovimiento());
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir caja", e);
            }
        }
    }

    private void subirCatalogo() {
        subirProductos();
        subirCategorias();
        subirSubcategorias();
        subirUsuarios();
    }

    private void subirProductos() {
        List<ProductoEntity> lista = db().getAppDatabase().productoDao().getNoSincronizados();
        if (lista == null) return;
        for (ProductoEntity p : lista) {
            try {
                ProductoDTO dto = new ProductoDTO();
                dto.setIdProducto(p.getIdProducto());
                dto.setNombre(p.getNombre());
                dto.setPrecioCosto(p.getPrecioCosto());
                dto.setPrecioVenta(p.getPrecioVenta());
                dto.setStock(p.getStock());
                dto.setCantidadMin(p.getCantidadMin());
                dto.setCantidadMax(p.getCantidadMax());
                dto.setPrecioMayoreo(p.getPrecioMayoreo());
                dto.setIsGramaje(p.getIsGramaje());
                dto.setRequiereEnvase(p.getRequiereEnvase());
                dto.setPrecioEnvase(p.getPrecioEnvase());
                dto.setCodigoBarras(p.getCodigoBarras());
                dto.setIdCategoria(p.getIdCategoria());
                dto.setIdSubcategoria(p.getIdSubcategoria());
                dto.setEstatus(p.getEstatus());
                dto.setPresentacionCaja(p.getPresentacionCaja());
                if (p.getIdProducto() != null && p.getIdProducto() > 0) {
                    RetrofitClient.getInstance().getApiService()
                            .actualizarProducto(p.getIdProducto(), dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .agregarProducto(dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                }
                p.setSincronizado(true);
                db().getAppDatabase().productoDao().marcarSincronizado(p.getIdProducto());
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir producto", e);
            }
        }
    }

    private void subirCategorias() {
        List<CategoriaEntity> lista = db().getAppDatabase().categoriaDao().getNoSincronizados();
        if (lista == null) return;
        for (CategoriaEntity c : lista) {
            try {
                com.dulcesnc.pos.data.remote.dto.CategoriaDTO dto =
                        new com.dulcesnc.pos.data.remote.dto.CategoriaDTO();
                dto.setIdCategoria(c.getIdCategoria());
                dto.setNombre(c.getNombre());
                dto.setDescripcion(c.getDescripcion());
                dto.setEstatus(c.getEstatus());
                if (c.getIdCategoria() != null && c.getIdCategoria() > 0) {
                    RetrofitClient.getInstance().getApiService()
                            .actualizarCategoria(c.getIdCategoria(), dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .agregarCategoria(dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                }
                c.setSincronizado(true);
                db().getAppDatabase().categoriaDao().marcarSincronizado(c.getIdCategoria());
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir categoria", e);
            }
        }
    }

    private void subirSubcategorias() {
        List<SubcategoriaEntity> lista = db().getAppDatabase().subcategoriaDao().getNoSincronizados();
        if (lista == null) return;
        for (SubcategoriaEntity s : lista) {
            try {
                SubcategoriaDTO dto = new SubcategoriaDTO();
                dto.setIdSubcategoria(s.getIdSubcategoria());
                dto.setNombre(s.getNombre());
                dto.setDescripcion(s.getDescripcion());
                dto.setIdCategoria(s.getIdCategoria());
                dto.setEstatus(s.getEstatus());
                if (s.getIdSubcategoria() != null && s.getIdSubcategoria() > 0) {
                    RetrofitClient.getInstance().getApiService()
                            .actualizarSubcategoria(s.getIdSubcategoria(), dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .agregarSubcategoria(dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                }
                s.setSincronizado(true);
                db().getAppDatabase().subcategoriaDao().marcarSincronizado(s.getIdSubcategoria());
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir subcategoria", e);
            }
        }
    }

    private void subirUsuarios() {
        List<UsuarioEntity> lista = db().getAppDatabase().usuarioDao().getNoSincronizados();
        if (lista == null) return;
        for (UsuarioEntity u : lista) {
            try {
                UsuarioDTO dto = new UsuarioDTO();
                dto.setIdUsuario(u.getIdUsuario());
                dto.setUsuario(u.getUsuario());
                dto.setNombre(u.getNombre());
                dto.setApellidoP(u.getApellidoP());
                dto.setApellidoM(u.getApellidoM());
                dto.setPasswordHash(u.getPasswordHash());
                dto.setIdTipoUsuario(u.getIdTipoUsuario());
                dto.setAvatar(u.getAvatar());
                dto.setSueldoHora(u.getSueldoHora());
                dto.setDiasSemana(u.getDiasSemana());
                dto.setHorasTrabajadas(u.getHorasTrabajadas());
                if (u.getIdUsuario() != null && u.getIdUsuario() > 0) {
                    RetrofitClient.getInstance().getApiService()
                            .actualizarUsuario(u.getIdUsuario(), dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                } else {
                    RetrofitClient.getInstance().getApiService()
                            .agregarUsuario(dto)
                            .subscribeOn(Schedulers.io()).blockingGet();
                }
                u.setSincronizado(true);
                db().getAppDatabase().usuarioDao().marcarSincronizado(u.getIdUsuario());
            } catch (Exception e) {
                android.util.Log.e("SyncWorker", "Error subir usuario", e);
            }
        }
    }

    private void descargarDatosMovil() {
        SincronizacionMovilDTO data = RetrofitClient.getInstance().getApiService()
                .exportarDatosMovil()
                .subscribeOn(Schedulers.io())
                .map(response -> {
                    if (response.isSuccess() && response.getDatos() != null) {
                        return response.getDatos();
                    }
                    throw new RuntimeException("Error al descargar datos: " + response.getMensaje());
                })
                .blockingGet();

        DatabaseClient db = DatabaseClient.getInstance(getApplicationContext());

        if (data.getProductos() != null) {
            List<ProductoEntity> productos = new ArrayList<>();
            for (ProductoDTO dto : data.getProductos()) {
                productos.add(new ProductoEntity(
                        dto.getIdProducto(), dto.getNombre(),
                        dto.getPrecioCosto(), dto.getPrecioVenta(),
                        dto.getStock(), dto.getCantidadMin(),
                        dto.getCantidadMax(), dto.getPrecioMayoreo(),
                        dto.getIsGramaje(), dto.getRequiereEnvase(),
                        dto.getPrecioEnvase(), dto.getCodigoBarras(),
                        dto.getIdCategoria(), dto.getIdSubcategoria(),
                        dto.getEstatus(), dto.getPresentacionCaja()
                ));
            }
            db.getAppDatabase().productoDao().deleteAll();
            db.getAppDatabase().productoDao().insertAll(productos);
        }

        if (data.getCategorias() != null) {
            List<CategoriaEntity> categorias = new ArrayList<>();
            for (com.dulcesnc.pos.data.remote.dto.CategoriaDTO dto : data.getCategorias()) {
                categorias.add(new CategoriaEntity(
                        dto.getIdCategoria(), dto.getNombre(),
                        dto.getDescripcion(), dto.getEstatus(), true
                ));
            }
            db.getAppDatabase().categoriaDao().deleteAll();
            db.getAppDatabase().categoriaDao().insertAll(categorias);
        }

        if (data.getSubcategorias() != null) {
            List<SubcategoriaEntity> subcategorias = new ArrayList<>();
            for (SubcategoriaDTO dto : data.getSubcategorias()) {
                subcategorias.add(new SubcategoriaEntity(
                        dto.getIdSubcategoria(), dto.getNombre(),
                        dto.getDescripcion(), dto.getIdCategoria(),
                        dto.getEstatus(), true
                ));
            }
            db.getAppDatabase().subcategoriaDao().deleteAll();
            db.getAppDatabase().subcategoriaDao().insertAll(subcategorias);
        }

        if (data.getUsuarios() != null) {
            List<UsuarioEntity> usuarios = new ArrayList<>();
            for (UsuarioDTO dto : data.getUsuarios()) {
                usuarios.add(new UsuarioEntity(
                        dto.getIdUsuario(), dto.getUsuario(),
                        dto.getNombre(), dto.getApellidoP(),
                        dto.getApellidoM(), dto.getPasswordHash(),
                        dto.getIdTipoUsuario(), dto.getAvatar(),
                        dto.getSueldoHora(), dto.getDiasSemana(),
                        dto.getHorasTrabajadas(), true
                ));
            }
            db.getAppDatabase().usuarioDao().deleteAll();
            db.getAppDatabase().usuarioDao().insertAll(usuarios);
        }
    }
}

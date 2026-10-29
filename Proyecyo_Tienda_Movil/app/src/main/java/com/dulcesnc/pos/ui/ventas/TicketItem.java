package com.dulcesnc.pos.ui.ventas;

import java.math.BigDecimal;

public class TicketItem {

    private long productoId;
    private String nombre;
    private int cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal subtotal;
    private String tipoPrecio; // "NORMAL", "MAYOREO", "GRAMAGE", "PROMOCION"
    private BigDecimal cobroEnvase;
    private int cantidadEnvase;
    private boolean isGramaje;
    private Long idVentaDetalle;
    private Long idPromocion;
    private long idItemLocal;

    public TicketItem(long productoId, String nombre, int cantidad,
                      BigDecimal precioUnitario, String tipoPrecio) {
        this.productoId = productoId;
        this.nombre = nombre;
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
        this.subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
        this.tipoPrecio = tipoPrecio;
        this.cobroEnvase = BigDecimal.ZERO;
        this.cantidadEnvase = 0;
        this.isGramaje = false;
        this.idVentaDetalle = null;
        this.idPromocion = null;
    }

    public long getProductoId() { return productoId; }
    public void setProductoId(long productoId) { this.productoId = productoId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
        this.subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
    }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
        this.subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
    }
    public BigDecimal getSubtotal() { return subtotal; }
    public String getTipoPrecio() { return tipoPrecio; }
    public BigDecimal getCobroEnvase() { return cobroEnvase; }
    public void setCobroEnvase(BigDecimal cobroEnvase) { this.cobroEnvase = cobroEnvase; }
    public int getCantidadEnvase() { return cantidadEnvase; }
    public void setCantidadEnvase(int cantidadEnvase) { this.cantidadEnvase = cantidadEnvase; }
    public boolean isGramaje() { return isGramaje; }
    public void setGramaje(boolean gramaje) { isGramaje = gramaje; }
    public Long getIdVentaDetalle() { return idVentaDetalle; }
    public void setIdVentaDetalle(Long id) { this.idVentaDetalle = id; }
    public Long getIdPromocion() { return idPromocion; }
    public void setIdPromocion(Long id) { this.idPromocion = id; }
    public long getIdItemLocal() { return idItemLocal; }
    public void setIdItemLocal(long id) { this.idItemLocal = id; }

    public BigDecimal getTotalConEnvase() {
        BigDecimal t = subtotal;
        if (cobroEnvase != null) {
            t = t.add(cobroEnvase);
        }
        return t;
    }
}

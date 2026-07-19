package com.dulcesnc.pos.data.remote.dto;

import java.util.List;

public class SincronizacionMovilDTO {
    private List<ProductoDTO> productos;
    private List<CategoriaDTO> categorias;
    private List<SubcategoriaDTO> subcategorias;
    private List<UsuarioDTO> usuarios;

    public List<ProductoDTO> getProductos() { return productos; }
    public void setProductos(List<ProductoDTO> productos) { this.productos = productos; }
    public List<CategoriaDTO> getCategorias() { return categorias; }
    public void setCategorias(List<CategoriaDTO> categorias) { this.categorias = categorias; }
    public List<SubcategoriaDTO> getSubcategorias() { return subcategorias; }
    public void setSubcategorias(List<SubcategoriaDTO> subcategorias) { this.subcategorias = subcategorias; }
    public List<UsuarioDTO> getUsuarios() { return usuarios; }
    public void setUsuarios(List<UsuarioDTO> usuarios) { this.usuarios = usuarios; }
}

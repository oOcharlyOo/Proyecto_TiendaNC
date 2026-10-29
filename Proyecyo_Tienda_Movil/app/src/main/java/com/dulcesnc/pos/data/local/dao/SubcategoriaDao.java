package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.dulcesnc.pos.data.local.entity.SubcategoriaEntity;

import java.util.List;

@Dao
public interface SubcategoriaDao {

    @Query("SELECT * FROM subcategorias WHERE estatus = 'A' ORDER BY nombre ASC")
    LiveData<List<SubcategoriaEntity>> getAllActivas();

    @Query("SELECT * FROM subcategorias WHERE id_categoria = :categoriaId AND estatus = 'A' ORDER BY nombre ASC")
    LiveData<List<SubcategoriaEntity>> getByCategoria(long categoriaId);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<SubcategoriaEntity> subcategorias);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(SubcategoriaEntity subcategoria);

    @Query("SELECT * FROM subcategorias WHERE sincronizado = 0")
    List<SubcategoriaEntity> getNoSincronizados();

    @Query("UPDATE subcategorias SET sincronizado = 1 WHERE id_subcategoria = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM subcategorias WHERE id_subcategoria = :id")
    void deleteById(long id);

    @Query("DELETE FROM subcategorias")
    void deleteAll();
}

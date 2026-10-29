package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.dulcesnc.pos.data.local.entity.UsuarioEntity;

import java.util.List;

@Dao
public interface UsuarioDao {

    @Query("SELECT * FROM usuarios ORDER BY nombre ASC")
    LiveData<List<UsuarioEntity>> getAll();

    @Query("SELECT * FROM usuarios WHERE id_usuario = :id")
    LiveData<UsuarioEntity> getById(long id);

    @Query("SELECT * FROM usuarios WHERE usuario = :username LIMIT 1")
    LiveData<UsuarioEntity> getByUsername(String username);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<UsuarioEntity> usuarios);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(UsuarioEntity usuario);

    @Query("SELECT * FROM usuarios WHERE sincronizado = 0")
    List<UsuarioEntity> getNoSincronizados();

    @Query("UPDATE usuarios SET sincronizado = 1 WHERE id_usuario = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM usuarios WHERE id_usuario = :id")
    void delete(long id);

    @Query("DELETE FROM usuarios")
    void deleteAll();
}

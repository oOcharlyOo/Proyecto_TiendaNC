package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.TicketEntity;

import java.util.List;

@Dao
public interface TicketDao {

    @Query("SELECT * FROM tickets ORDER BY creado_en ASC")
    LiveData<List<TicketEntity>> getAll();

    @Query("SELECT * FROM tickets ORDER BY creado_en ASC")
    List<TicketEntity> getAllSync();

    @Query("SELECT * FROM tickets WHERE id_ticket = :id")
    LiveData<TicketEntity> getById(long id);

    @Query("SELECT * FROM tickets WHERE id_ticket = :id")
    TicketEntity getByIdSync(long id);

    @Query("SELECT * FROM tickets WHERE id_venta_servidor = :idServidor")
    TicketEntity getByVentaServidorSync(long idServidor);

    @Query("SELECT * FROM tickets WHERE estado = 'ACTIVO' ORDER BY creado_en ASC LIMIT 1")
    TicketEntity getPrimerActivoSync();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insert(TicketEntity ticket);

    @Update
    void update(TicketEntity ticket);

    @Query("DELETE FROM tickets WHERE id_ticket = :id")
    void deleteById(long id);

    @Query("DELETE FROM tickets")
    void deleteAll();
}

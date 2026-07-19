package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.TicketItemEntity;

import java.util.List;

@Dao
public interface TicketItemDao {

    @Query("SELECT * FROM ticket_items WHERE id_ticket = :idTicket ORDER BY id_item ASC")
    LiveData<List<TicketItemEntity>> getByTicket(long idTicket);

    @Query("SELECT * FROM ticket_items WHERE id_ticket = :idTicket ORDER BY id_item ASC")
    List<TicketItemEntity> getByTicketSync(long idTicket);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insert(TicketItemEntity item);

    @Update
    void update(TicketItemEntity item);

    @Query("DELETE FROM ticket_items WHERE id_item = :id")
    void deleteById(long id);

    @Query("DELETE FROM ticket_items WHERE id_ticket = :idTicket")
    void deleteByTicket(long idTicket);
}

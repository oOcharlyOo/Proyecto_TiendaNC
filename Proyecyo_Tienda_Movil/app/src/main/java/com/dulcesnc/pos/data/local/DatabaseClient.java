package com.dulcesnc.pos.data.local;

import android.content.Context;

import androidx.room.Room;

public class DatabaseClient {

    private static DatabaseClient instance;
    private final AppDatabase appDatabase;

    private DatabaseClient(Context context) {
        appDatabase = Room.databaseBuilder(
                context.getApplicationContext(),
                AppDatabase.class,
                "dulcesnc_pos_db"
        ).fallbackToDestructiveMigration().build();
    }

    public static synchronized DatabaseClient getInstance(Context context) {
        if (instance == null) {
            instance = new DatabaseClient(context);
        }
        return instance;
    }

    public AppDatabase getAppDatabase() {
        return appDatabase;
    }
}

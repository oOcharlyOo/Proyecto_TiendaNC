package com.dulcesnc.pos.data.repository;

import android.content.Context;
import android.content.SharedPreferences;

import com.dulcesnc.pos.data.remote.ApiService;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.sync.SyncWorker;
import com.dulcesnc.pos.utils.Constants;

import io.reactivex.rxjava3.core.Single;

public abstract class BaseRepository {

    protected final ApiService api;
    protected final Context appContext;

    protected BaseRepository(Context context) {
        this.appContext = context.getApplicationContext();
        this.api = RetrofitClient.getInstance().getApiService();
        SharedPreferences prefs = appContext.getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE);
        RetrofitClient.getInstance().setSucursal(
                prefs.getString(Constants.KEY_SUCURSAL, Constants.SUCURSAL_DULCERIA));
    }

    protected <T> Single<T> withAuth(Single<T> single) {
        return single;
    }

    protected void triggerSync() {
        SyncWorker.syncNow(appContext);
    }
}

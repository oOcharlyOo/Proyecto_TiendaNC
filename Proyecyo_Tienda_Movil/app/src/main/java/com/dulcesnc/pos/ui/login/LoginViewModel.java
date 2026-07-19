package com.dulcesnc.pos.ui.login;

import android.app.Application;

import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.LoginRequest;

import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;
import io.reactivex.rxjava3.disposables.CompositeDisposable;
import io.reactivex.rxjava3.schedulers.Schedulers;

public class LoginViewModel extends AndroidViewModel {

    private final MutableLiveData<String> usuario = new MutableLiveData<>("");
    private final MutableLiveData<String> password = new MutableLiveData<>("");
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> error = new MutableLiveData<>(null);
    private final MutableLiveData<Boolean> loginSuccess = new MutableLiveData<>(false);
    private final CompositeDisposable disposables = new CompositeDisposable();

    public LoginViewModel(Application application) {
        super(application);
    }

    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getError() { return error; }
    public LiveData<Boolean> getLoginSuccess() { return loginSuccess; }

    public void setUsuario(String value) { usuario.setValue(value); }
    public void setPassword(String value) { password.setValue(value); }

    public void login() {
        String user = usuario.getValue();
        String pass = password.getValue();

        if (user == null || user.trim().isEmpty()) {
            error.setValue("Ingrese un usuario");
            return;
        }
        if (pass == null || pass.trim().isEmpty()) {
            error.setValue("Ingrese una contraseña");
            return;
        }

        isLoading.setValue(true);
        error.setValue(null);

        // Mock auth offline: admin/admin
        if (user.trim().equals("admin") && pass.equals("admin")) {
            isLoading.setValue(false);
            loginSuccess.setValue(true);
            return;
        }

        // Real API call
        disposables.add(RetrofitClient.getInstance().getApiService()
                .login(new LoginRequest(user.trim(), pass))
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(response -> {
                    isLoading.setValue(false);
                    if (response.isSuccess() && response.getDatos() != null) {
                        com.dulcesnc.pos.utils.SessionManager.getInstance(getApplication())
                                .saveSession(response.getDatos());
                        loginSuccess.setValue(true);
                    } else {
                        error.setValue(response.getMensaje() != null ?
                                response.getMensaje() : "Error de autenticación");
                    }
                }, throwable -> {
                    isLoading.setValue(false);
                    error.setValue("Error de conexión: " +
                            (throwable.getMessage() != null ? throwable.getMessage() : "sin respuesta"));
                }));
    }

    public void clearError() {
        error.setValue(null);
    }

    @Override
    protected void onCleared() {
        super.onCleared();
        disposables.clear();
    }
}

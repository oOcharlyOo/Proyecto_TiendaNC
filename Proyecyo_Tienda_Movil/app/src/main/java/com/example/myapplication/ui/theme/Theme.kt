package com.example.myapplication.ui.theme

import androidx.compose.runtime.Composable

/**
 * Esta es una función puente. 
 * Si algún componente antiguo busca "MyApplicationTheme", 
 * lo redirigimos automáticamente a nuestro nuevo "ZeldaTheme".
 */
@Composable
fun MyApplicationTheme(
    variant: ZeldaThemeVariant = ZeldaThemeVariant.Zelda,
    content: @Composable () -> Unit
) {
    ZeldaTheme(variant = variant, content = content)
}

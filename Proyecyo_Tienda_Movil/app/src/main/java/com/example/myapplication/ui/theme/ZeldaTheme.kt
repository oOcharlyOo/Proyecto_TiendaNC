package com.example.myapplication.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class ZeldaColors(
    val primary: Color,
    val background: Color,
    val secondaryBackground: Color,
    val panel: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val border: Color,
    val success: Color,
    val error: Color,
    // Gradients
    val btnStart: Color,
    val btnMid: Color,
    val btnEnd: Color,
    val panelStart: Color,
    val panelEnd: Color,
    val bgStart: Color,
    val bgMid: Color
)

val LocalZeldaColors = staticCompositionLocalOf {
    ZeldaColors(
        primary = Color.Unspecified,
        background = Color.Unspecified,
        secondaryBackground = Color.Unspecified,
        panel = Color.Unspecified,
        textPrimary = Color.Unspecified,
        textSecondary = Color.Unspecified,
        border = Color.Unspecified,
        success = Color.Unspecified,
        error = Color.Unspecified,
        btnStart = Color.Unspecified,
        btnMid = Color.Unspecified,
        btnEnd = Color.Unspecified,
        panelStart = Color.Unspecified,
        panelEnd = Color.Unspecified,
        bgStart = Color.Unspecified,
        bgMid = Color.Unspecified
    )
}

enum class ZeldaThemeVariant {
    Zelda,
    Alforja,
    Skyward,
    DeathMountain,
    DarkForest,
    Professional,
    MercadoLibre  // Estilo Mercado Libre
}

@Composable
fun ZeldaTheme(
    variant: ZeldaThemeVariant = ZeldaThemeVariant.Zelda,
    content: @Composable () -> Unit
) {
    val zeldaColors = when (variant) {
        ZeldaThemeVariant.Zelda -> ZeldaColors(
            primary = ZeldaPrimary,
            background = ZeldaBackground,
            secondaryBackground = ZeldaSecondaryBackground,
            panel = ZeldaPanel,
            textPrimary = ZeldaTextPrimary,
            textSecondary = ZeldaTextSecondary,
            border = ZeldaBorder,
            success = ZeldaSuccess,
            error = ZeldaError,
            btnStart = ZeldaBtnStart,
            btnMid = ZeldaBtnMid,
            btnEnd = ZeldaBtnEnd,
            panelStart = ZeldaPanelStart,
            panelEnd = ZeldaPanelEnd,
            bgStart = ZeldaBgStart,
            bgMid = ZeldaBgMid
        )
        ZeldaThemeVariant.Alforja -> ZeldaColors(
            primary = AlforjaPrimary,
            background = AlforjaBackground,
            secondaryBackground = AlforjaSecondaryBackground,
            panel = AlforjaPanel,
            textPrimary = AlforjaTextPrimary,
            textSecondary = AlforjaTextSecondary,
            border = AlforjaBorder,
            success = AlforjaSuccess,
            error = AlforjaError,
            btnStart = AlforjaBtnStart,
            btnMid = AlforjaBtnMid,
            btnEnd = AlforjaBtnEnd,
            panelStart = AlforjaPanelStart,
            panelEnd = AlforjaPanelEnd,
            bgStart = AlforjaBgStart,
            bgMid = AlforjaBgMid
        )
        ZeldaThemeVariant.Skyward -> ZeldaColors(
            primary = SkywardPrimary,
            background = SkywardBackground,
            secondaryBackground = SkywardSecondaryBackground,
            panel = SkywardPanel,
            textPrimary = SkywardTextPrimary,
            textSecondary = SkywardTextSecondary,
            border = SkywardBorder,
            success = SkywardSuccess,
            error = SkywardError,
            btnStart = SkywardBtnStart,
            btnMid = SkywardBtnMid,
            btnEnd = SkywardBtnEnd,
            panelStart = SkywardPanelStart,
            panelEnd = SkywardPanelEnd,
            bgStart = SkywardBgStart,
            bgMid = SkywardBgMid
        )
        ZeldaThemeVariant.DeathMountain -> ZeldaColors(
            primary = DeathMountainPrimary,
            background = DeathMountainBackground,
            secondaryBackground = DeathMountainSecondaryBackground,
            panel = DeathMountainPanel,
            textPrimary = DeathMountainTextPrimary,
            textSecondary = DeathMountainTextSecondary,
            border = DeathMountainBorder,
            success = DeathMountainSuccess,
            error = DeathMountainError,
            btnStart = DeathMountainBtnStart,
            btnMid = DeathMountainBtnMid,
            btnEnd = DeathMountainBtnEnd,
            panelStart = DeathMountainPanelStart,
            panelEnd = DeathMountainPanelEnd,
            bgStart = DeathMountainBgStart,
            bgMid = DeathMountainBgMid
        )
        ZeldaThemeVariant.DarkForest -> ZeldaColors(
            primary = DarkForestPrimary,
            background = DarkForestBackground,
            secondaryBackground = DarkForestSecondaryBackground,
            panel = DarkForestPanel,
            textPrimary = DarkForestTextPrimary,
            textSecondary = DarkForestTextSecondary,
            border = DarkForestBorder,
            success = DarkForestSuccess,
            error = DarkForestError,
            btnStart = DarkForestBtnStart,
            btnMid = DarkForestBtnMid,
            btnEnd = DarkForestBtnEnd,
            // Fallbacks for DarkForest as per CSS logic
            panelStart = DarkForestPanel, 
            panelEnd = DarkForestPanel,
            bgStart = DarkForestSecondaryBackground,
            bgMid = DarkForestBackground
        )
        ZeldaThemeVariant.Professional -> ZeldaColors(
            primary = ProfessionalPrimary,
            background = ProfessionalBackground,
            secondaryBackground = ProfessionalSurface,
            panel = ProfessionalSurfaceVariant,
            textPrimary = ProfessionalOnBackground,
            textSecondary = Color(0xFFB0B0B0),
            border = Color(0xFF424242),
            success = ProfessionalSuccess,
            error = ProfessionalError,
            btnStart = ProfessionalPrimaryLight,
            btnMid = ProfessionalPrimary,
            btnEnd = ProfessionalPrimaryDark,
            panelStart = ProfessionalSurfaceVariant,
            panelEnd = ProfessionalSurface,
            bgStart = ProfessionalBackground,
            bgMid = Color(0xFF1A1A1A)
        )
        ZeldaThemeVariant.MercadoLibre -> ZeldaColors(
            primary = MLPrimary,
            background = CleanGray100,
            secondaryBackground = CleanWhite,
            panel = CleanWhite,
            textPrimary = CleanGray900,
            textSecondary = CleanGray600,
            border = CleanGray300,
            success = SuccessGreen,
            error = ErrorRed,
            btnStart = MLPrimary,
            btnMid = Color(0xFF5BA3F5),
            btnEnd = Color(0xFF2B6CB0),
            panelStart = CleanWhite,
            panelEnd = CleanGray100,
            bgStart = CleanGray100,
            bgMid = CleanWhite
        )
    }

    // Map to Material3 ColorScheme for standard components compatibility
    val materialColorScheme = darkColorScheme(
        primary = zeldaColors.primary,
        onPrimary = zeldaColors.background,
        background = zeldaColors.background,
        onBackground = zeldaColors.textPrimary,
        surface = zeldaColors.secondaryBackground,
        onSurface = zeldaColors.textPrimary,
        surfaceVariant = zeldaColors.panel,
        onSurfaceVariant = zeldaColors.textSecondary,
        error = zeldaColors.error,
        onError = zeldaColors.textPrimary
    )

    CompositionLocalProvider(LocalZeldaColors provides zeldaColors) {
        MaterialTheme(
            colorScheme = materialColorScheme,
            typography = Typography,
            content = content
        )
    }
}

// Convenience extension
val MaterialTheme.zeldaColors: ZeldaColors
    @Composable
    get() = LocalZeldaColors.current

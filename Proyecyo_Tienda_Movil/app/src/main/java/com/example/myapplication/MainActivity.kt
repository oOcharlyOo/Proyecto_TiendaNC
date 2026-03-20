package com.example.myapplication

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.zIndex
import com.example.myapplication.model.*
import com.example.myapplication.network.RetrofitClient
import com.example.myapplication.ui.theme.ZeldaTheme
import com.example.myapplication.ui.theme.ZeldaThemeVariant
import com.example.myapplication.ui.theme.zeldaColors
import kotlinx.coroutines.launch

enum class Screen { Home, Ventas, Productos, Inventario, Corte, Finanzas, Usuarios }

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var currentTheme by remember { mutableStateOf(ZeldaThemeVariant.MercadoLibre) }
            var currentScreen by remember { mutableStateOf(Screen.Home) }
            var isLoggedIn by remember { mutableStateOf(false) }
            var usuarioNombre by remember { mutableStateOf("Cajero") }

            val windowSizeClass = calculateWindowSizeClass(this)

            ZeldaTheme(variant = currentTheme) {
                if (!isLoggedIn) {
                    MLLoginScreen(
                        onLoginSuccess = { nombre -> 
                            usuarioNombre = nombre
                            isLoggedIn = true 
                        },
                        onThemeChange = {
                            val nextOrdinal = (currentTheme.ordinal + 1) % ZeldaThemeVariant.values().size
                            currentTheme = ZeldaThemeVariant.values()[nextOrdinal]
                        }
                    )
                } else {
                    MLScaffold(
                        currentScreen = currentScreen,
                        onScreenChange = { currentScreen = it },
                        onLogout = { isLoggedIn = false }
                    ) {
                        when (currentScreen) {
                            Screen.Home -> MLHomeScreen(
                                onNavigate = { currentScreen = it }
                            )
                            Screen.Ventas -> VentasScreen(usuarioActual = usuarioNombre)
                            Screen.Productos -> ProductosScreen()
                            Screen.Inventario -> InventarioScreen()
                            Screen.Corte -> CorteScreen()
                            Screen.Finanzas -> FinanzasScreen()
                            Screen.Usuarios -> UsuariosScreen()
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MLLoginScreen(
    onLoginSuccess: (String) -> Unit,
    onThemeChange: () -> Unit
) {
    val colors = MaterialTheme.zeldaColors
    var usuario by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo
            Surface(
                modifier = Modifier.size(100.dp),
                shape = RoundedCornerShape(50.dp),
                color = colors.primary.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Store,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(50.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                "La Leyenda del Dulce",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.primary,
                fontWeight = FontWeight.Bold
            )

            Text(
                "Punto de Venta",
                style = MaterialTheme.typography.bodyLarge,
                color = colors.textSecondary
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Login Card estilo ML
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp)
                ) {
                    Text(
                        "Ingresa tu cuenta",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    // Usuario
                    OutlinedTextField(
                        value = usuario,
                        onValueChange = { usuario = it },
                        label = { Text("Usuario") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Default
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            focusedLabelColor = colors.primary,
                            cursorColor = colors.primary
                        ),
                        shape = RoundedCornerShape(12.dp),
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null, tint = colors.textSecondary)
                        }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Password
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Contraseña") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Default
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            focusedLabelColor = colors.primary,
                            cursorColor = colors.primary
                        ),
                        shape = RoundedCornerShape(12.dp),
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = colors.textSecondary)
                        },
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(
                                    if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = if (showPassword) "Ocultar" else "Mostrar",
                                    tint = colors.textSecondary
                                )
                            }
                        },
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation()
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Botón登录
                    Button(
                        onClick = {
                            if (usuario.isNotBlank() && password.isNotBlank()) {
                                isLoading = true
                                kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                                    try {
                                        val loginRequest = LoginRequest(
                                            usuario = usuario,
                                            passwordHash = password
                                        )
                                        val response = RetrofitClient.apiService.login(loginRequest)
                                        if (response.codigo == 200 && response.datos != null) {
                                            val nombreAMostrar = if (!response.datos.nombre.isNullOrBlank()) response.datos.nombre else response.datos.usuario
                                            onLoginSuccess(nombreAMostrar)
                                        } else {
                                            Toast.makeText(context, response.mensaje ?: "Error de autenticación", Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error de conexión", Toast.LENGTH_SHORT).show()
                                    } finally {
                                        isLoading = false
                                    }
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White
                            )
                        } else {
                            Text("Continuar", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(onClick = onThemeChange) {
                Text("Cambiar tema", color = colors.textSecondary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MLScaffold(
    currentScreen: Screen,
    onScreenChange: (Screen) -> Unit,
    onLogout: () -> Unit,
    content: @Composable () -> Unit
) {
    val colors = MaterialTheme.zeldaColors

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Store,
                            contentDescription = null,
                            tint = colors.primary,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "La Leyenda del Dulce",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(
                            Icons.Default.ExitToApp,
                            contentDescription = "Salir",
                            tint = colors.textSecondary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colors.secondaryBackground
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = colors.secondaryBackground
            ) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Inicio") },
                    label = { Text("Inicio") },
                    selected = currentScreen == Screen.Home,
                    onClick = { onScreenChange(Screen.Home) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.primary,
                        selectedTextColor = colors.primary,
                        indicatorColor = colors.primary.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.PointOfSale, contentDescription = "Ventas") },
                    label = { Text("Ventas") },
                    selected = currentScreen == Screen.Ventas,
                    onClick = { onScreenChange(Screen.Ventas) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.primary,
                        selectedTextColor = colors.primary,
                        indicatorColor = colors.primary.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Inventory, contentDescription = "Productos") },
                    label = { Text("Productos") },
                    selected = currentScreen == Screen.Productos,
                    onClick = { onScreenChange(Screen.Productos) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.primary,
                        selectedTextColor = colors.primary,
                        indicatorColor = colors.primary.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Assessment, contentDescription = "Más") },
                    label = { Text("Más") },
                    selected = currentScreen == Screen.Corte || currentScreen == Screen.Finanzas || currentScreen == Screen.Inventario || currentScreen == Screen.Usuarios,
                    onClick = { onScreenChange(Screen.Corte) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.primary,
                        selectedTextColor = colors.primary,
                        indicatorColor = colors.primary.copy(alpha = 0.1f)
                    )
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            content()
        }
    }
}

@Composable
fun MLHomeScreen(onNavigate: (Screen) -> Unit) {
    val colors = MaterialTheme.zeldaColors

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Bienvenida
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.primary),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp)
                ) {
                    Text(
                        "¡Bienvenido!",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Gestiona tu tienda de dulces",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }

        // Acciones principales
        item {
            Text(
                "Acciones Rápidas",
                style = MaterialTheme.typography.titleMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MLActionCard(
                    icon = Icons.Default.PointOfSale,
                    title = "Nueva Venta",
                    subtitle = "Registrar venta",
                    onClick = { onNavigate(Screen.Ventas) },
                    modifier = Modifier.weight(1f)
                )
                MLActionCard(
                    icon = Icons.Default.QrCodeScanner,
                    title = "Escanear",
                    subtitle = "Código barras",
                    onClick = { onNavigate(Screen.Ventas) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MLActionCard(
                    icon = Icons.Default.Add,
                    title = "Producto",
                    subtitle = "Agregar nuevo",
                    onClick = { onNavigate(Screen.Productos) },
                    modifier = Modifier.weight(1f)
                )
                MLActionCard(
                    icon = Icons.Default.Inventory,
                    title = "Inventario",
                    subtitle = "Ver stock",
                    onClick = { onNavigate(Screen.Inventario) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Menú completo
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Gestión",
                style = MaterialTheme.typography.titleMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column {
                    MLMenuItem(
                        icon = Icons.Default.Receipt,
                        title = "Corte de Caja",
                        subtitle = "Cierre del día",
                        onClick = { onNavigate(Screen.Corte) }
                    )
                    HorizontalDivider(color = colors.border)
                    MLMenuItem(
                        icon = Icons.Default.Analytics,
                        title = "Finanzas",
                        subtitle = "Reportes y estadísticas",
                        onClick = { onNavigate(Screen.Finanzas) }
                    )
                    HorizontalDivider(color = colors.border)
                    MLMenuItem(
                        icon = Icons.Default.People,
                        title = "Usuarios",
                        subtitle = "Gestionar empleados",
                        onClick = { onNavigate(Screen.Usuarios) }
                    )
                }
            }
        }

        // Info footer
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = colors.primary.copy(alpha = 0.1f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        "Sistema de Punto de Venta v1.0",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textSecondary
                    )
                }
            }
        }
    }
}

@Composable
fun MLActionCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.zeldaColors

    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.secondaryBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(24.dp),
                color = colors.primary.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        icon,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold
            )
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.textSecondary
            )
        }
    }
}

@Composable
fun MLMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.zeldaColors

    Surface(
        onClick = onClick,
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = colors.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = colors.textSecondary
            )
        }
    }
}

// --- COMPONENTES UX PROFESIONAL MEJORADOS ---

@Composable
fun ProfessionalTopBar(title: String, onBack: () -> Unit) {
    val colors = MaterialTheme.zeldaColors
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .background(colors.secondaryBackground)
                .padding(horizontal = 8.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.Default.ArrowBack, 
                    contentDescription = "Volver", 
                    tint = colors.primary
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.titleLarge,
                color = colors.primary,
                letterSpacing = 2.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(
            Brush.horizontalGradient(listOf(colors.border, colors.primary, colors.border))
        ))
    }
}

@Composable
fun ProfessionalCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = MaterialTheme.zeldaColors
    Column(
        modifier = modifier
            .padding(4.dp)
            .shadow(8.dp, RoundedCornerShape(16.dp))
            .background(
                brush = Brush.verticalGradient(listOf(colors.secondaryBackground, colors.background)),
                shape = RoundedCornerShape(16.dp)
            )
            .border(1.dp, colors.primary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        if (title != null) {
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.labelLarge,
                color = colors.primary,
                modifier = Modifier.padding(bottom = 12.dp),
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            HorizontalDivider(
                color = colors.border, 
                thickness = 1.dp, 
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        content()
    }
}

@Composable
fun ZeldaPanel(
    modifier: Modifier = Modifier,
    title: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    ProfessionalCard(modifier = modifier, title = title, content = content)
}

@Composable
fun ZeldaProgressBar(progress: Float, color: Color) {
    val colors = MaterialTheme.zeldaColors
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(12.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(colors.border.copy(alpha = 0.3f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .fillMaxHeight()
                .background(
                    Brush.horizontalGradient(listOf(color.copy(alpha = 0.7f), color)),
                    RoundedCornerShape(6.dp)
                )
        )
    }
}

@Composable
fun ZeldaStatRow(label: String, value: String, valueColor: Color = MaterialTheme.zeldaColors.textPrimary) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label, 
            style = MaterialTheme.typography.bodyMedium, 
            color = MaterialTheme.zeldaColors.textSecondary,
            fontWeight = FontWeight.Medium
        )
        Text(
            value, 
            style = MaterialTheme.typography.bodyLarge, 
            color = valueColor, 
            fontWeight = FontWeight.Bold
        )
    }
}

// --- PANTALLAS ACTUALIZADAS ---

@Composable
fun HomeScreen(onNavigate: (Screen) -> Unit, onThemeChange: () -> Unit, currentThemeName: String) {
    val colors = MaterialTheme.zeldaColors
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        // Header con logo
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo
            Surface(
                modifier = Modifier.size(80.dp),
                shape = RoundedCornerShape(20.dp),
                color = colors.primary.copy(alpha = 0.2f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Store, 
                        contentDescription = null, 
                        tint = colors.primary,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "LA LEYENDA DEL DULCE",
                style = MaterialTheme.typography.headlineSmall,
                color = colors.primary,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )
            
            Text(
                text = "Sistema de Punto de Venta",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.textSecondary,
                textAlign = TextAlign.Center
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Estado del sistema
        ProfessionalCard(title = "ESTADO DEL SISTEMA") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(12.dp),
                        shape = RoundedCornerShape(6.dp),
                        color = colors.success
                    ) {}
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Sistema activo", 
                        style = MaterialTheme.typography.bodyMedium, 
                        color = colors.success,
                        fontWeight = FontWeight.Medium
                    )
                }
                Text(
                    currentThemeName,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Menú principal
        Text(
            "MENÚ PRINCIPAL",
            style = MaterialTheme.typography.titleMedium,
            color = colors.textSecondary,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        val menuItems: List<MenuItem> = listOf(
            MenuItem("Ventas", Icons.Default.PointOfSale, { onNavigate(Screen.Ventas) }),
            MenuItem("Productos", Icons.Default.Inventory, { onNavigate(Screen.Productos) }),
            MenuItem("Inventario", Icons.Default.Warehouse, { onNavigate(Screen.Inventario) }),
            MenuItem("Corte", Icons.Default.Receipt, { onNavigate(Screen.Corte) }),
            MenuItem("Finanzas", Icons.Default.Analytics, { onNavigate(Screen.Finanzas) }),
            MenuItem("Temas", Icons.Default.Palette, onThemeChange)
        )

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(bottom = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(menuItems) { item: MenuItem ->
                ZeldaButton(
                    text = item.title, 
                    icon = item.icon, 
                    onClick = item.onClick ?: {},
                    modifier = Modifier.height(80.dp)
                )
            }
        }
    }
}

@Composable
fun ProductosScreen() {
    val colors = MaterialTheme.zeldaColors
    var productList by remember { mutableStateOf<List<Product>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    fun loadProducts() {
        isLoading = true
        scope.launch {
            try {
                val resp = RetrofitClient.apiService.getProducts()
                if (resp.codigo == 200) productList = resp.datos ?: emptyList()
            } catch (e: Exception) { e.printStackTrace() }
            finally { isLoading = false }
        }
    }

    LaunchedEffect(Unit) { loadProducts() }

    val filteredProducts = if (searchQuery.isBlank()) {
        productList
    } else {
        productList.filter { 
            it.nombre.contains(searchQuery, ignoreCase = true) || 
            it.codigoBarras?.contains(searchQuery) == true 
        }
    }

    if (showAddDialog) {
        ProductFormDialog(onDismiss = { showAddDialog = false }, onSuccess = { 
            showAddDialog = false
            loadProducts()
        })
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "PRODUCTOS", 
                style = MaterialTheme.typography.headlineSmall, 
                color = colors.primary,
                fontWeight = FontWeight.Bold
            )
            ZeldaButton(
                "AGREGAR", 
                Icons.Default.Add, 
                { showAddDialog = true }, 
                modifier = Modifier.width(120.dp).height(48.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Buscador
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Buscar productos...") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = colors.border, 
                focusedBorderColor = colors.primary,
                focusedTextColor = colors.textPrimary,
                unfocusedTextColor = colors.textPrimary,
                cursorColor = colors.primary
            ),
            singleLine = true,
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = colors.primary) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = colors.textSecondary)
                    }
                }
            },
            shape = RoundedCornerShape(12.dp)
        )
        
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { 
                CircularProgressIndicator(color = colors.primary) 
            }
        } else if (filteredProducts.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Inventory2, 
                        contentDescription = null, 
                        tint = colors.textSecondary.copy(0.5f),
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No se encontraron productos",
                        style = MaterialTheme.typography.bodyLarge,
                        color = colors.textSecondary
                    )
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(filteredProducts) { product: Product ->
                    ProfessionalCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Ícono de producto
                            Surface(
                                modifier = Modifier.size(56.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = colors.primary.copy(alpha = 0.2f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Default.Inventory2, 
                                        contentDescription = null, 
                                        tint = colors.primary,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                            }
                            
                            Spacer(modifier = Modifier.width(16.dp))
                            
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    product.nombre.uppercase(), 
                                    style = MaterialTheme.typography.titleMedium, 
                                    color = colors.textPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "Código: ${product.codigoBarras ?: "N/A"}", 
                                    style = MaterialTheme.typography.bodySmall, 
                                    color = colors.textSecondary
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Inventory, 
                                        contentDescription = null, 
                                        modifier = Modifier.size(14.dp), 
                                        tint = if(product.stock < 5) colors.error else colors.success
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "Stock: ${product.stock} unidades", 
                                        style = MaterialTheme.typography.bodySmall, 
                                        color = if(product.stock < 5) colors.error else colors.success,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                            
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    "$${String.format("%.2f", if (product.isGramaje) product.precioFinal / 1000.0 else product.precioFinal)}${if (product.isGramaje) "/g" else ""}", 
                                    style = MaterialTheme.typography.titleLarge, 
                                    color = colors.primary, 
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                IconButton(
                                    onClick = {}, 
                                    modifier = Modifier.size(36.dp)
                                ) { 
                                    Icon(
                                        Icons.Default.Edit, 
                                        contentDescription = "Editar", 
                                        tint = colors.textSecondary, 
                                        modifier = Modifier.size(20.dp)
                                    ) 
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
fun VentasScreen(
    usuarioActual: String = "Cajero",
    windowSizeClass: androidx.compose.material3.windowsizeclass.WindowSizeClass? = null
) {
    val colors = MaterialTheme.zeldaColors
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    
    // Estado de la lógica de negocio usando SnapshotStateList para reactividad profunda
    var activeTicketIndex by remember { mutableStateOf(0) }
    val tickets = remember { mutableStateListOf(mutableStateListOf<SaleItemInternal>()) }
    var searchQuery by remember { mutableStateOf("") }
    var suggestions by remember { mutableStateOf<List<Product>>(emptyList()) }
    var allProducts by remember { mutableStateOf<List<Product>>(emptyList()) }
    var isProcessing by remember { mutableStateOf(false) }
    var showCobroModal by remember { mutableStateOf(false) }
    var showGramajeModal by remember { mutableStateOf(false) }
    var showEntradaModal by remember { mutableStateOf(false) }
    var showSalidaModal by remember { mutableStateOf(false) }
    var showHistorialModal by remember { mutableStateOf(false) }
    var gramajeProducto by remember { mutableStateOf<Product?>(null) }
    var currentVentaId by remember { mutableStateOf<Long?>(null) }
    var cajeroNombre by remember { mutableStateOf(usuarioActual) }

    // Funciones de lógica
    fun loadPendingTickets() {
        scope.launch {
            try {
                val resp = RetrofitClient.apiService.getVentasPendientes()
                if (resp.codigo == 200 && resp.datos != null && resp.datos.isNotEmpty()) {
                    tickets.clear()
                    for (venta in resp.datos) {
                        tickets.add(mutableStateListOf())
                    }
                    currentVentaId = resp.datos.firstOrNull()?.id_venta
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun createNewTicket() {
        scope.launch {
            try {
                val nuevaVenta = VentasDTO(
                    monto_total = 0.0,
                    estatus = "P",
                    metodo_pago = "EFECTIVO"
                )
                val resp = RetrofitClient.apiService.addVenta(nuevaVenta)
                if (resp.codigo == 200 && resp.datos != null) {
                    currentVentaId = resp.datos.id_venta
                    tickets.add(mutableStateListOf())
                    activeTicketIndex = tickets.size - 1
                    Toast.makeText(context, "Ticket #${tickets.size} creado", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error al crear ticket", Toast.LENGTH_SHORT).show()
            }
        }
    }

    LaunchedEffect(Unit) {
        try {
            val resp = RetrofitClient.apiService.getProducts()
            if (resp.codigo == 200) allProducts = resp.datos ?: emptyList()
        } catch (e: Exception) { e.printStackTrace() }
        loadPendingTickets()
    }

    LaunchedEffect(searchQuery) {
        suggestions = if (searchQuery.length >= 2) {
            allProducts.filter { 
                it.nombre.contains(searchQuery, ignoreCase = true) || 
                it.codigoBarras?.contains(searchQuery) == true ||
                it.codigoBarrasAlt?.contains(searchQuery) == true
            }.take(5)
        } else {
            emptyList()
        }
    }

    val currentCart = if (tickets.isNotEmpty() && activeTicketIndex < tickets.size) tickets[activeTicketIndex] else remember { mutableStateListOf<SaleItemInternal>() }
    
    val total = currentCart.sumOf { 
        val precioUnitario = if (it.product.isGramaje) it.product.precioFinal / 1000.0 else it.product.precioFinal
        kotlin.math.round(precioUnitario * it.quantity * 100) / 100
    }

    fun addToCart(product: Product, cantidad: Int = 1) {
        if (product.isGramaje) {
            gramajeProducto = product
            showGramajeModal = true
            return
        }
        
        val existingIndex = currentCart.indexOfFirst { it.product.productoId == product.productoId }
        if (existingIndex != -1) {
            val item = currentCart[existingIndex]
            currentCart[existingIndex] = item.copy(quantity = item.quantity + cantidad)
        } else {
            currentCart.add(SaleItemInternal(product, cantidad))
        }
        searchQuery = ""
    }

    fun addGramajeToCart(gramos: Int) {
        val producto = gramajeProducto ?: return
        val existingIndex = currentCart.indexOfFirst { it.product.productoId == producto.productoId }
        if (existingIndex != -1) {
            val item = currentCart[existingIndex]
            currentCart[existingIndex] = item.copy(quantity = item.quantity + gramos)
        } else {
            currentCart.add(SaleItemInternal(producto, gramos))
        }
        showGramajeModal = false
        gramajeProducto = null
    }

    fun processVenta() {
        if (currentCart.isEmpty()) return
        showCobroModal = true
    }

    fun processVentaCobro(metodoPago: String, montoRecibido: Double = 0.0) {
        isProcessing = true
        showCobroModal = false
        scope.launch {
            try {
                val ventaDTO = VentasDTO(
                    monto_total = total,
                    estatus = "P",
                    metodo_pago = metodoPago
                )
                val respVenta = RetrofitClient.apiService.addVenta(ventaDTO)
                
                if (respVenta.codigo == 200 && respVenta.datos != null) {
                    val savedVenta = respVenta.datos
                    for (item in currentCart) {
                        val detalleDTO = VentasDetalleDTO(
                            venta = savedVenta,
                            producto = item.product,
                            cantidad = item.quantity,
                            precioUnitarioVenta = item.product.precioFinal
                        )
                        RetrofitClient.apiService.addVentaDetalle(detalleDTO)
                    }
                    
                    try {
                        savedVenta.id_venta?.let { id ->
                            RetrofitClient.apiService.completarVenta(
                                idVenta = id,
                                montoTotal = total,
                                metodoPago = metodoPago
                            )
                        }
                    } catch (e: Exception) { e.printStackTrace() }
                    
                    val cambio = if (metodoPago == "EFECTIVO") montoRecibido - total else 0.0
                    Toast.makeText(
                        context, 
                        "Venta completada\nCambio: $${String.format("%.2f", cambio)}", 
                        Toast.LENGTH_LONG
                    ).show()
                    currentCart.clear()
                } else {
                    Toast.makeText(context, "Error: ${respVenta.mensaje}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error de conexión", Toast.LENGTH_SHORT).show()
            } finally {
                isProcessing = false
            }
        }
    }

    fun registrarEntrada(monto: Double, descripcion: String) {
        scope.launch {
            try {
                val entrada = EntradaSalidaDTO(
                    montoEoS = monto,
                    descripcion = descripcion,
                    tipo = "ENTRADA"
                )
                val resp = RetrofitClient.apiService.crearEntrada(entrada)
                if (resp.codigo == 200) {
                    Toast.makeText(context, "Entrada registrada: $${String.format("%.2f", monto)}", Toast.LENGTH_SHORT).show()
                }
                showEntradaModal = false
            } catch (e: Exception) {
                Toast.makeText(context, "Error al registrar entrada", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun registrarSalida(monto: Double, descripcion: String) {
        scope.launch {
            try {
                val salida = EntradaSalidaDTO(
                    montoEoS = monto,
                    descripcion = descripcion,
                    tipo = "SALIDA"
                )
                val resp = RetrofitClient.apiService.crearSalida(salida)
                if (resp.codigo == 200) {
                    Toast.makeText(context, "Salida registrada: $${String.format("%.2f", monto)}", Toast.LENGTH_SHORT).show()
                }
                showSalidaModal = false
            } catch (e: Exception) {
                Toast.makeText(context, "Error al registrar salida", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FA))
    ) {
        // 1. Sección de Usuario y Turno
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Cajero: $cajeroNombre",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF444444)
                )
            }
            
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                // Botón Entrada
                IconButton(onClick = { showEntradaModal = true }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Entrada", tint = Color(0xFF2E7D32))
                }
                // Botón Salida
                IconButton(onClick = { showSalidaModal = true }) {
                    Icon(Icons.Default.RemoveCircle, contentDescription = "Salida", tint = Color(0xFFC62828))
                }
                // Botón Historial
                IconButton(onClick = { showHistorialModal = true }) {
                    Icon(Icons.Default.History, contentDescription = "Historial", tint = colors.primary)
                }
            }
        }

        // 2. Selector de Tickets (Estilo Chips)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            tickets.forEachIndexed { index, _ ->
                val isActive = activeTicketIndex == index
                FilterChip(
                    selected = isActive,
                    onClick = { activeTicketIndex = index },
                    label = { Text("Ticket ${index + 1}") },
                    enabled = true,
                    shape = RoundedCornerShape(20.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.primary,
                        selectedLabelColor = Color.White,
                        containerColor = Color.White,
                        labelColor = Color.Gray
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isActive,
                        borderColor = if (isActive) colors.primary else Color.LightGray,
                        borderWidth = 1.dp,
                        selectedBorderColor = colors.primary
                    )
                )
            }
            
            IconButton(
                onClick = { createNewTicket() },
                modifier = Modifier
                    .size(40.dp)
                    .background(Color.White, RoundedCornerShape(20.dp))
                    .border(1.dp, Color.LightGray, RoundedCornerShape(20.dp))
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo Ticket", tint = colors.primary)
            }
        }

        // 3. Buscador de Productos
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.padding(12.dp).size(24.dp)
                    )
                    
                    TextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Buscar por nombre o código...") },
                        modifier = Modifier.weight(1f),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            disabledContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            cursorColor = colors.primary
                        ),
                        singleLine = true
                    )
                    
                    IconButton(onClick = { 
                        Toast.makeText(context, "Escaneando...", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(
                            Icons.Default.QrCodeScanner,
                            contentDescription = "Scanner",
                            tint = colors.primary
                        )
                    }
                }

                if (suggestions.isNotEmpty()) {
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = Color.LightGray.copy(alpha = 0.3f))
                    suggestions.forEach { product ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { addToCart(product) }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(product.nombre, fontWeight = FontWeight.Medium)
                                Text("Stock: ${product.stock}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            }
                            Text(
                                "$${String.format("%.2f", product.precioFinal)}",
                                color = colors.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // 4. Contenedor del Carrito (Lista de productos)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(12.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            if (currentCart.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ShoppingCart,
                            contentDescription = null,
                            modifier = Modifier.size(80.dp),
                            tint = Color.LightGray.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "El carrito está vacío",
                            color = Color.LightGray,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(currentCart) { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F3F4), RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.product.nombre, fontWeight = FontWeight.Bold)
                                Text(
                                    "$${String.format("%.2f", if (item.product.isGramaje) item.product.precioFinal / 1000.0 else item.product.precioFinal)} x ${item.quantity}${if (item.product.isGramaje) "g" else " pza"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                            
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = {
                                        val idx = currentCart.indexOfFirst { it.product.productoId == item.product.productoId }
                                        if (idx != -1) {
                                            if (currentCart[idx].quantity > 1) {
                                                currentCart[idx] = currentCart[idx].copy(quantity = currentCart[idx].quantity - 1)
                                            } else {
                                                currentCart.removeAt(idx)
                                            }
                                        }
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Menos", tint = Color.Red)
                                }
                                
                                Text(
                                    "${item.quantity}",
                                    modifier = Modifier.padding(horizontal = 8.dp),
                                    fontWeight = FontWeight.Bold
                                )
                                
                                IconButton(
                                    onClick = {
                                        val idx = currentCart.indexOfFirst { it.product.productoId == item.product.productoId }
                                        if (idx != -1) {
                                            currentCart[idx] = currentCart[idx].copy(quantity = currentCart[idx].quantity + 1)
                                        }
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(Icons.Default.AddCircleOutline, contentDescription = "Más", tint = colors.primary)
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Sección de Pago y Total
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            shadowElevation = 16.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "TOTAL A PAGAR",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray,
                        letterSpacing = 0.1.sp
                    )
                    Text(
                        "$${String.format("%.2f", total)}",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2E7D32)
                    )
                }
                
                Button(
                    onClick = { processVenta() },
                    modifier = Modifier
                        .height(60.dp)
                        .width(160.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary),
                    enabled = currentCart.isNotEmpty() && !isProcessing
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                    } else {
                        Icon(Icons.Default.Payments, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("COBRAR", fontSize = 16.sp)
                    }
                }
            }
        }
    }

    // Modales (Se mantienen igual para no romper la lógica de negocio)
    if (showCobroModal) {
        CobroModal(
            total = total,
            onDismiss = { showCobroModal = false },
            onPagoEfectivo = { montoRecibido ->
                processVentaCobro("EFECTIVO", montoRecibido)
            },
            onPagoTransferencia = {
                processVentaCobro("TRANSFERENCIA", 0.0)
            }
        )
    }

    if (showGramajeModal && gramajeProducto != null) {
        GramajeCalculatorModal(
            producto = gramajeProducto!!,
            onDismiss = { showGramajeModal = false; gramajeProducto = null },
            onConfirm = { gramos -> addGramajeToCart(gramos) }
        )
    }

    if (showEntradaModal) {
        EntradaSalidaModal(
            titulo = "Entrada de Efectivo",
            onDismiss = { showEntradaModal = false },
            onConfirm = { monto, descripcion -> registrarEntrada(monto, descripcion) }
        )
    }

    if (showSalidaModal) {
        EntradaSalidaModal(
            titulo = "Salida de Efectivo",
            onDismiss = { showSalidaModal = false },
            onConfirm = { monto, descripcion -> registrarSalida(monto, descripcion) }
        )
    }

    if (showHistorialModal) {
        HistorialVentasModal(
            onDismiss = { showHistorialModal = false }
        )
    }
}


@Composable
fun InventarioScreen() {
    val colors = MaterialTheme.zeldaColors
    var productList by remember { mutableStateOf<List<Product>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var filterOption by remember { mutableStateOf("Todos") }

    LaunchedEffect(Unit) {
        try {
            val resp = RetrofitClient.apiService.getProducts()
            if (resp.codigo == 200) productList = resp.datos ?: emptyList()
        } catch (e: Exception) { e.printStackTrace() }
        finally { isLoading = false }
    }

    val filteredProducts = when (filterOption) {
        "Críticos" -> productList.filter { it.stock < 10 }
        "Bajos" -> productList.filter { it.stock in 10..24 }
        "Normales" -> productList.filter { it.stock >= 25 }
        else -> productList
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        // Header
        Text(
            "INVENTARIO", 
            style = MaterialTheme.typography.headlineSmall, 
            color = colors.primary,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Filtros
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("Todos", "Críticos", "Bajos", "Normales").forEach { filter ->
                ProfessionalChip(
                    text = filter,
                    selected = filterOption == filter,
                    onClick = { filterOption = filter }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        
        // Resumen
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ProfessionalCard(modifier = Modifier.weight(1f)) {
                Text(
                    "TOTAL",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary
                )
                Text(
                    "${productList.size}",
                    style = MaterialTheme.typography.headlineMedium,
                    color = colors.primary,
                    fontWeight = FontWeight.Bold
                )
            }
            ProfessionalCard(modifier = Modifier.weight(1f)) {
                Text(
                    "CRÍTICOS",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary
                )
                Text(
                    "${productList.count { it.stock < 10 }}",
                    style = MaterialTheme.typography.headlineMedium,
                    color = colors.error,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { 
                CircularProgressIndicator(color = colors.primary) 
            }
        } else if (filteredProducts.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Inventory, 
                        contentDescription = null, 
                        tint = colors.textSecondary.copy(0.5f),
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No hay productos en esta categoría",
                        style = MaterialTheme.typography.bodyLarge,
                        color = colors.textSecondary
                    )
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(filteredProducts) { item: Product ->
                    ProfessionalCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    item.nombre.uppercase(), 
                                    fontWeight = FontWeight.Bold, 
                                    color = colors.textPrimary,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                ZeldaProgressBar(
                                    progress = item.stock / 50f, 
                                    color = when {
                                        item.stock < 10 -> colors.error
                                        item.stock < 25 -> colors.primary
                                        else -> colors.success
                                    }
                                )
                            }
                            
                            Spacer(modifier = Modifier.width(16.dp))
                            
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    "${item.stock}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = when {
                                        item.stock < 10 -> colors.error
                                        item.stock < 25 -> colors.primary
                                        else -> colors.success
                                    },
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "unidades",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.textSecondary
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = when {
                                item.stock < 10 -> "⚠️ STOCK CRÍTICO - Reponer urgentemente"
                                item.stock < 25 -> "⚡ Stock bajo - Considerar reposición"
                                else -> "✓ Stock adecuado"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = when {
                                item.stock < 10 -> colors.error
                                item.stock < 25 -> colors.primary
                                else -> colors.success
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ProductFormDialog(onDismiss: () -> Unit, onSuccess: () -> Unit) {
    val colors = MaterialTheme.zeldaColors
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    
    var nombre by remember { mutableStateOf("") }
    var precio by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    
    var nombreError by remember { mutableStateOf(false) }
    var precioError by remember { mutableStateOf(false) }
    var stockError by remember { mutableStateOf(false) }
    
    fun validateForm(): Boolean {
        nombreError = nombre.isBlank()
        precioError = precio.toDoubleOrNull() == null || precio.toDoubleOrNull()!! <= 0
        stockError = stock.toIntOrNull() == null || stock.toIntOrNull()!! < 0
        return !nombreError && !precioError && !stockError
    }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .background(colors.secondaryBackground, RoundedCornerShape(24.dp))
                .padding(24.dp)
        ) {
            Text(
                text = "NUEVO PRODUCTO",
                style = MaterialTheme.typography.headlineSmall,
                color = colors.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 20.dp)
            )
            
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                ProfessionalTextField(
                    value = nombre,
                    onValueChange = { 
                        nombre = it
                        nombreError = false
                    },
                    label = "Nombre del Producto",
                    placeholder = "Ej: Paleta de chocolate",
                    isError = nombreError,
                    errorMessage = if (nombreError) "El nombre es requerido" else "",
                    leadingIcon = {
                        Icon(Icons.Default.Inventory2, contentDescription = null, tint = colors.primary)
                    }
                )
                
                ProfessionalTextField(
                    value = codigo,
                    onValueChange = { codigo = it },
                    label = "Código de Barras",
                    placeholder = "Ej: 7501234567890",
                    leadingIcon = {
                        Icon(Icons.Default.QrCode, contentDescription = null, tint = colors.primary)
                    }
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    ProfessionalTextField(
                        value = precio,
                        onValueChange = {
                            precio = it
                            precioError = false
                        },
                        label = "Precio",
                        placeholder = "0.00",
                        isError = precioError,
                        errorMessage = if (precioError) "Precio inválido" else "",
                        modifier = Modifier.weight(1f),
                        leadingIcon = {
                            Icon(Icons.Default.AttachMoney, contentDescription = null, tint = colors.primary)
                        },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                        )
                    )
                    
                    ProfessionalTextField(
                        value = stock,
                        onValueChange = {
                            stock = it
                            stockError = false
                        },
                        label = "Stock",
                        placeholder = "0",
                        isError = stockError,
                        errorMessage = if (stockError) "Stock inválido" else "",
                        modifier = Modifier.weight(1f),
                        leadingIcon = {
                            Icon(Icons.Default.Inventory, contentDescription = null, tint = colors.primary)
                        },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                        )
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ZeldaButton(
                    "CANCELAR",
                    Icons.Default.Close,
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
                ZeldaButton(
                    "GUARDAR",
                    Icons.Default.Save,
                    onClick = {
                        if (validateForm()) {
                            scope.launch {
                                try {
                                    val product = Product(
                                        nombre = nombre,
                                        precio = precio.toDoubleOrNull() ?: 0.0,
                                        stock = stock.toIntOrNull() ?: 0,
                                        codigoBarras = codigo.takeIf { it.isNotBlank() }
                                    )
                                    val resp = RetrofitClient.apiService.addProduct(product)
                                    if (resp.codigo == 200) {
                                        Toast.makeText(context, "Producto guardado correctamente", Toast.LENGTH_SHORT).show()
                                        onSuccess()
                                    } else {
                                        Toast.makeText(context, "Error: ${resp.mensaje}", Toast.LENGTH_LONG).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error al guardar producto", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun CorteScreen() {
    val colors = MaterialTheme.zeldaColors
    var reportData by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val resp = RetrofitClient.apiService.getDailyReport()
            if (resp.codigo == 200) reportData = resp.datos
        } catch (e: Exception) { e.printStackTrace() }
        finally { isLoading = false }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            "CORTE DE CAJA", 
            style = MaterialTheme.typography.headlineSmall, 
            color = colors.primary,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { 
                CircularProgressIndicator(color = colors.primary) 
            }
        } else {
            // Resumen de ventas
            ProfessionalCard(title = "RESUMEN DE VENTAS") {
                ZeldaStatRow("Ventas Totales", "$${reportData?.get("totalVentas") ?: "0.00"}", colors.success)
                ZeldaStatRow("Efectivo", "$${reportData?.get("totalEfectivo") ?: "0.00"}")
                ZeldaStatRow("Transferencias", "$${reportData?.get("totalTransferencia") ?: "0.00"}")
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            // Información de caja
            ProfessionalCard(title = "INFORMACIÓN DE CAJA") {
                ZeldaStatRow("Monto Inicial", "$${reportData?.get("montoInicial") ?: "0.00"}")
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Botón de cierre
            ZeldaButton(
                "REALIZAR CIERRE DE CAJA", 
                Icons.Default.AccountBalanceWallet, 
                {}, 
                height = 64, 
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Información adicional
            Text(
                "Nota: El cierre de caja generará un reporte detallado de todas las transacciones del día.",
                style = MaterialTheme.typography.bodySmall,
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun FinanzasScreen() {
    val colors = MaterialTheme.zeldaColors
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            "FINANZAS", 
            style = MaterialTheme.typography.headlineSmall, 
            color = colors.primary,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Resumen financiero
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ProfessionalCard(modifier = Modifier.weight(1f), title = "ESTE MES") {
                Text(
                    "$ 12,450", 
                    style = MaterialTheme.typography.headlineSmall, 
                    color = colors.success, 
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "+15% vs mes anterior",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.success
                )
            }
            ProfessionalCard(modifier = Modifier.weight(1f), title = "ESTE AÑO") {
                Text(
                    "$ 145,200", 
                    style = MaterialTheme.typography.headlineSmall, 
                    color = colors.primary, 
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "+23% vs año anterior",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.success
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Gráfico semanal
        ProfessionalCard(title = "FLUJO DE VENTAS - SEMANA ACTUAL") {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .padding(top = 8.dp), 
                contentAlignment = Alignment.BottomCenter
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(), 
                    horizontalArrangement = Arrangement.SpaceEvenly, 
                    verticalAlignment = Alignment.Bottom
                ) {
                    listOf(0.4f, 0.7f, 0.5f, 0.9f, 0.2f, 0.6f, 0.8f).forEach { height ->
                        Box(
                            modifier = Modifier
                                .width(32.dp)
                                .fillMaxHeight(height)
                                .background(
                                    Brush.verticalGradient(listOf(colors.primary, colors.btnEnd)),
                                    RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)
                                )
                                .border(
                                    1.dp, 
                                    colors.border,
                                    RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)
                                )
                        )
                    }
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp), 
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom").forEach { 
                    Text(
                        it, 
                        style = MaterialTheme.typography.bodySmall, 
                        color = colors.textSecondary,
                        fontWeight = FontWeight.Medium
                    ) 
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Ventas por método de pago
        ProfessionalCard(title = "VENTAS POR MÉTODO") {
            ZeldaStatRow("Efectivo", "$ 8,450 (68%)")
            ZeldaStatRow("Tarjeta", "$ 2,500 (20%)", colors.primary)
            ZeldaStatRow("Transferencia", "$ 1,500 (12%)", colors.success)
        }
    }
}

data class SaleItemInternal(val product: Product, val quantity: Int)
data class MenuItem(val title: String, val icon: ImageVector, val onClick: (() -> Unit)? = null)

// --- MANTENER COMPONENTES BASE ---

@Composable
fun ZeldaBackground(content: @Composable () -> Unit) {
    val colors = MaterialTheme.zeldaColors
    Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(colors.bgStart, colors.bgMid, colors.background)))) { content() }
}

// --- COMPONENTES UX PROFESIONAL MEJORADOS ---

@Composable
fun ZeldaButton(
    text: String, 
    icon: ImageVector, 
    onClick: () -> Unit, 
    modifier: Modifier = Modifier, 
    height: Int = 56, 
    enabled: Boolean = true,
    isPrimary: Boolean = true
) {
    val colors = MaterialTheme.zeldaColors
    val backgroundColor = if (enabled) {
        if (isPrimary) listOf(colors.btnStart, colors.btnEnd)
        else listOf(colors.secondaryBackground, colors.background)
    } else {
        listOf(Color.Gray.copy(alpha = 0.3f), Color.Gray.copy(alpha = 0.2f))
    }
    
    val borderColor = if (enabled) {
        if (isPrimary) colors.primary else colors.border
    } else {
        Color.Gray.copy(alpha = 0.3f)
    }
    
    Box(
        modifier = modifier
            .height(height.dp)
            .shadow(if(enabled) 8.dp else 0.dp, RoundedCornerShape(12.dp))
            .background(Brush.verticalGradient(backgroundColor), RoundedCornerShape(12.dp))
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon, 
                contentDescription = null, 
                tint = if (enabled) colors.textPrimary else Color.Gray,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = text.uppercase(), 
                style = MaterialTheme.typography.labelLarge, 
                color = if (enabled) colors.textPrimary else Color.Gray,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }
    }
}

@Composable
fun ProfessionalTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    isError: Boolean = false,
    errorMessage: String = "",
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    keyboardOptions: androidx.compose.foundation.text.KeyboardOptions = androidx.compose.foundation.text.KeyboardOptions.Default
) {
    val colors = MaterialTheme.zeldaColors
    
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label, fontWeight = FontWeight.Medium) },
            placeholder = { Text(placeholder, color = colors.textSecondary.copy(alpha = 0.5f)) },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = if (isError) colors.error else colors.primary,
                unfocusedBorderColor = if (isError) colors.error.copy(alpha = 0.5f) else colors.border,
                focusedLabelColor = if (isError) colors.error else colors.primary,
                unfocusedLabelColor = colors.textSecondary,
                focusedTextColor = colors.textPrimary,
                unfocusedTextColor = colors.textPrimary,
                cursorColor = if (isError) colors.error else colors.primary,
                focusedContainerColor = colors.secondaryBackground.copy(alpha = 0.5f),
                unfocusedContainerColor = colors.background.copy(alpha = 0.3f)
            ),
            singleLine = true,
            leadingIcon = leadingIcon,
            trailingIcon = trailingIcon,
            keyboardOptions = keyboardOptions,
            shape = RoundedCornerShape(12.dp),
            isError = isError
        )
        if (isError && errorMessage.isNotEmpty()) {
            Text(
                text = errorMessage,
                color = colors.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(start = 16.dp, top = 4.dp)
            )
        }
    }
}

@Composable
fun ProfessionalChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.zeldaColors
    
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) colors.primary else colors.secondaryBackground,
        border = if (!selected) androidx.compose.foundation.BorderStroke(1.dp, colors.border) else null
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            color = if (selected) colors.background else colors.textPrimary,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
fun UsuariosScreen() {
    val colors = MaterialTheme.zeldaColors
    var isLoading by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                "Gestión de Usuarios",
                style = MaterialTheme.typography.headlineSmall,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Gestión de Usuarios",
                        style = MaterialTheme.typography.titleLarge,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Administra los usuarios y permisos del sistema",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.textSecondary,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Agregar Usuario")
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Usuarios del Sistema",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Usuario demo
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(48.dp),
                            shape = RoundedCornerShape(24.dp),
                            color = colors.primary.copy(alpha = 0.1f)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    "A",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = colors.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Administrador",
                                style = MaterialTheme.typography.bodyLarge,
                                color = colors.textPrimary,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                "admin@laleyendadeldulce.com",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.textSecondary
                            )
                        }
                        AssistChip(
                            onClick = { },
                            label = { Text("Admin") },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = colors.primary.copy(alpha = 0.1f),
                                labelColor = colors.primary
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CobroModal(
    total: Double,
    onDismiss: () -> Unit,
    onPagoEfectivo: (Double) -> Unit,
    onPagoTransferencia: () -> Unit
) {
    val colors = MaterialTheme.zeldaColors
    var montoRecibido by remember { mutableStateOf("") }
    
    val cambio by remember(montoRecibido) {
        val recibido = montoRecibido.toDoubleOrNull() ?: 0.0
        val cambioCalculado = recibido - total
        mutableStateOf(if (cambioCalculado > 0) cambioCalculado else 0.0)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.secondaryBackground,
        title = {
            Text(
                "Cobro de Venta",
                color = colors.primary,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = colors.primary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Total a pagar",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.textSecondary
                        )
                        Text(
                            "$${String.format("%.2f", total)}",
                            style = MaterialTheme.typography.headlineMedium,
                            color = colors.success,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                OutlinedTextField(
                    value = montoRecibido,
                    onValueChange = { montoRecibido = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Monto recibido") },
                    placeholder = { Text("0.00") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = colors.border,
                        focusedBorderColor = colors.primary,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary,
                        cursorColor = colors.primary
                    ),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.AttachMoney, contentDescription = null, tint = colors.primary)
                    },
                    shape = RoundedCornerShape(12.dp)
                )

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = colors.secondaryBackground,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Cambio",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.textSecondary
                        )
                        Text(
                            "$${String.format("%.2f", cambio)}",
                            style = MaterialTheme.typography.headlineMedium,
                            color = if (cambio > 0) colors.primary else colors.textPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        },
        confirmButton = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onPagoTransferencia,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = colors.primary
                    )
                ) {
                    Icon(Icons.Default.PhoneAndroid, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Transferencia")
                }
                Button(
                    onClick = {
                        val recibido = montoRecibido.toDoubleOrNull() ?: 0.0
                        onPagoEfectivo(recibido)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.success
                    ),
                    enabled = montoRecibido.isNotEmpty() && (montoRecibido.toDoubleOrNull() ?: 0.0) >= total
                ) {
                    Icon(Icons.Default.Money, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Efectivo")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = colors.textSecondary)
            }
        }
    )
}

@Composable
fun GramajeCalculatorModal(
    producto: Product,
    onDismiss: () -> Unit,
    onConfirm: (Int) -> Unit
) {
    val colors = MaterialTheme.zeldaColors
    var gramos by remember { mutableStateOf("100") }
    val precioPorGramo = producto.precioFinal / 1000.0
    val totalGramos = gramos.toIntOrNull() ?: 0
    val precioTotal = totalGramos * precioPorGramo

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.secondaryBackground,
        title = {
            Text("Calcular Gramaje", color = colors.primary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(producto.nombre, style = MaterialTheme.typography.titleMedium, color = colors.textPrimary)
                Text("Precio por kg: $${String.format("%.2f", producto.precioFinal)}", color = colors.textSecondary)
                
                OutlinedTextField(
                    value = gramos,
                    onValueChange = { gramos = it.filter { c -> c.isDigit() } },
                    label = { Text("Gramos") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        cursorColor = colors.primary
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    listOf(100, 250, 500, 1000).forEach { g ->
                        Surface(
                            onClick = { gramos = g.toString() },
                            shape = RoundedCornerShape(8.dp),
                            color = if (gramos == g.toString()) colors.primary else colors.secondaryBackground
                        ) {
                            Text(
                                "${g}g",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                color = if (gramos == g.toString()) colors.background else colors.textPrimary
                            )
                        }
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = colors.primary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Total", color = colors.textSecondary)
                        Text("$${String.format("%.2f", precioTotal)}", color = colors.primary, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(totalGramos) },
                enabled = totalGramos > 0,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
            ) {
                Text("Agregar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = colors.textSecondary)
            }
        }
    )
}

@Composable
fun EntradaSalidaModal(
    titulo: String,
    onDismiss: () -> Unit,
    onConfirm: (Double, String) -> Unit
) {
    val colors = MaterialTheme.zeldaColors
    var monto by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.secondaryBackground,
        title = {
            Text(titulo, color = colors.primary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = monto,
                    onValueChange = { monto = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Monto") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.AttachMoney, contentDescription = null, tint = colors.primary) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        cursorColor = colors.primary
                    )
                )
                OutlinedTextField(
                    value = descripcion,
                    onValueChange = { descripcion = it },
                    label = { Text("Descripción") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Description, contentDescription = null, tint = colors.primary) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        cursorColor = colors.primary
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(monto.toDoubleOrNull() ?: 0.0, descripcion) },
                enabled = monto.toDoubleOrNull() != null && monto.toDoubleOrNull()!! > 0,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
            ) {
                Text("Registrar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = colors.textSecondary)
            }
        }
    )
}

@Composable
fun HistorialVentasModal(
    onDismiss: () -> Unit
) {
    val colors = MaterialTheme.zeldaColors
    val context = LocalContext.current
    var ventas by remember { mutableStateOf<List<VentasDTO>>(emptyList()) }
    var totalVentas by remember { mutableStateOf(0.0) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val fechaHoy = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
            val resp = RetrofitClient.apiService.getVentasPorDia(fechaHoy)
            if (resp.codigo == 200 && resp.datos != null) {
                totalVentas = resp.datos.cobroTotal
                ventas = resp.datos.ventas ?: emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.secondaryBackground,
        title = {
            Text("Ventas de Hoy", color = colors.primary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = colors.primary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Total Vendido", color = colors.textSecondary, style = MaterialTheme.typography.labelSmall)
                        Text("$${String.format("%.2f", totalVentas)}", color = colors.success, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                    }
                }
                
                if (isLoading) {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = colors.primary)
                    }
                } else if (ventas.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        Text("No hay ventas registradas hoy", color = colors.textSecondary)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth().height(300.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(ventas) { venta ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                color = colors.background.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border.copy(alpha = 0.3f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Ticket #${venta.id_venta ?: venta.idVenta}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                        Text(venta.metodo_pago, style = MaterialTheme.typography.bodySmall, color = colors.textSecondary)
                                    }
                                    Text("$${String.format("%.2f", venta.monto_total)}", color = colors.primary, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
            ) {
                Text("Cerrar")
            }
        }
    )
}

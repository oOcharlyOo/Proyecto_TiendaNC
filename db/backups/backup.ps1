# =====================================================
# Script de Backup Automatico - TiendaNC (PowerShell)
# =====================================================

$BackupDir = "C:\Users\carlo\Desktop\Proyectos\Proyecto_TiendaNC\db\backups"
$ContainerName = "Dulceria-DB"
$DbName = "dulcesnc"
$DbUser = "user"

# Generar timestamp limpio
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "dump-$DbName-$Timestamp.sql"

Write-Host "[$(Get-Date)] Iniciando backup de $DbName..."

# Crear backup dentro del contenedor
docker exec $ContainerName pg_dump -U $DbUser -d $DbName -F c -f "/tmp/$BackupFile"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[$(Get-Date)] ERROR: Fallo al crear el backup" -ForegroundColor Red
    exit 1
}

# Copiar backup al host
docker cp "$ContainerName`:/tmp/$BackupFile" "$BackupDir\$BackupFile"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[$(Get-Date)] ERROR: Fallo al copiar el backup" -ForegroundColor Red
    exit 1
}

# Limpiar archivo temporal
docker exec $ContainerName rm "/tmp/$BackupFile" | Out-Null

# Eliminar backups mas antiguos de 30 dias
Get-ChildItem -Path $BackupDir -Filter "dump-*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force

$Size = (Get-Item "$BackupDir\$BackupFile").Length
Write-Host "[$(Get-Date)] Backup completado: $BackupFile ($Size bytes)" -ForegroundColor Green
Write-Host "[$(Get-Date)] Backups guardados en: $BackupDir" -ForegroundColor Green

@echo off
REM =====================================================
REM Script de Restauracion - TiendaNC
REM Uso: restore.bat [nombre_archivo_backup]
REM =====================================================

SET "BACKUP_DIR=C:\Users\carlo\Desktop\Proyectos\Proyecto_TiendaNC\db\backups"
SET "CONTAINER_NAME=Dulceria-DB"
SET "DB_NAME=dulcesnc"
SET "DB_USER=user"

IF "%~1"=="" (
    echo =====================================================
    echo   TiendaNC - Restaurar Backup
    echo =====================================================
    echo.
    echo Backups disponibles:
    echo.
    dir /b "%BACKUP_DIR%\dump-*.sql" 2>nul
    IF %ERRORLEVEL% NEQ 0 (
        echo   No se encontraron backups en %BACKUP_DIR%
        exit /b 1
    )
    echo.
    echo Uso: restore.bat nombre_archivo.sql
    exit /b 0
)

SET "BACKUP_FILE=%~1"
SET "FULL_PATH=%BACKUP_DIR%\%BACKUP_FILE%"

IF NOT EXIST "%FULL_PATH%" (
    echo ERROR: El archivo %FULL_PATH% no existe
    exit /b 1
)

echo [%DATE% %TIME%] Iniciando restauracion de %BACKUP_FILE%...
echo ADVERTENCIA: Esto REEMPLAZARA todos los datos actuales.
echo.

REM Copiar backup al contenedor
docker cp "%FULL_PATH%" %CONTAINER_NAME%:/tmp/restore.sql

IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo al copiar el backup al contenedor
    exit /b 1
)

REM Dropear schema existente
echo [%DATE% %TIME%] Eliminando datos actuales...
docker exec %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% -c "DROP SCHEMA IF EXISTS tiendadb CASCADE;" >nul 2>&1

REM Restaurar backup
echo [%DATE% %TIME%] Restaurando backup...
docker run --rm --network proyecto_tiendanc_tienda-red -e PGPASSWORD=password -v "%BACKUP_DIR%:/backup" postgres:17 pg_restore -h %CONTAINER_NAME% -U %DB_USER% -d %DB_NAME% /backup/%BACKUP_FILE%

IF %ERRORLEVEL% NEQ 0 (
    echo ADVERTENCIA: La restauracion tuvo advertencias (pueden ser ignorables)
)

REM Limpiar
docker exec %CONTAINER_NAME% rm /tmp/restore.sql >nul 2>&1

echo.
echo [%DATE% %TIME%] Restauracion completada.
echo [%DATE% %TIME%] Reinicia el backend para aplicar los cambios.

exit /b 0

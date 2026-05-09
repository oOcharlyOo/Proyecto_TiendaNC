@echo off
REM =====================================================
REM Script de Backup Automatico - TiendaNC
REM =====================================================

SET "BACKUP_DIR=C:\Users\carlo\Desktop\Proyectos\Proyecto_TiendaNC\db\backups"
SET "CONTAINER_NAME=Dulceria-DB"
SET "DB_NAME=dulcesnc"
SET "DB_USER=user"

REM Generar timestamp limpio (YYYYMMDD_HHMMSS)
FOR /F "tokens=2 delims==" %%I IN ('wmic os get localdatetime /value') DO SET DATETIME=%%I
SET TIMESTAMP=%DATETIME:~0,4%%DATETIME:~4,2%%DATETIME:~6,2%_%DATETIME:~8,2%%DATETIME:~10,2%%DATETIME:~12,2%
SET "BACKUP_FILE=dump-%DB_NAME%-%TIMESTAMP%.sql"

echo [%DATE% %TIME%] Iniciando backup de %DB_NAME%...

docker exec %CONTAINER_NAME% pg_dump -U %DB_USER% -d %DB_NAME% -F c -f /tmp/%BACKUP_FILE%

IF %ERRORLEVEL% NEQ 0 (
    echo [%DATE% %TIME%] ERROR: Fallo al crear el backup
    exit /b 1
)

docker cp %CONTAINER_NAME%:/tmp/%BACKUP_FILE% "%BACKUP_DIR%\%BACKUP_FILE%"

IF %ERRORLEVEL% NEQ 0 (
    echo [%DATE% %TIME%] ERROR: Fallo al copiar el backup
    exit /b 1
)

docker exec %CONTAINER_NAME% rm /tmp/%BACKUP_FILE%

REM Eliminar backups mas antiguos de 30 dias
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul

FOR /F "usebackq" %%A IN ('%BACKUP_DIR%\%BACKUP_FILE%') DO SET SIZE=%%~zA

echo [%DATE% %TIME%] Backup completado: %BACKUP_FILE% (%SIZE% bytes)
echo [%DATE% %TIME%] Backups guardados en: %BACKUP_DIR%

exit /b 0

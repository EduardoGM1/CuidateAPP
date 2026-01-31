@echo off
echo ========================================
echo Crear Base de Datos medical_db
echo ========================================
echo.

REM Intentar encontrar MySQL en ubicaciones comunes
set MYSQL_PATH=

if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
) else if exist "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe" (
    set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe
) else if exist "C:\xampp\mysql\bin\mysql.exe" (
    set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
) else (
    echo MySQL no encontrado en ubicaciones comunes.
    echo Por favor, ejecuta manualmente:
    echo.
    echo CREATE DATABASE IF NOT EXISTS medical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    echo.
    pause
    exit /b 1
)

echo MySQL encontrado en: %MYSQL_PATH%
echo.
echo Creando base de datos medical_db...
echo.

"%MYSQL_PATH%" -u root -padmin -e "CREATE DATABASE IF NOT EXISTS medical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Base de datos creada exitosamente!
    echo ========================================
    echo.
    echo Ahora puedes iniciar el servidor con:
    echo   cd api-clinica
    echo   npm run dev
    echo.
) else (
    echo.
    echo ========================================
    echo Error al crear la base de datos
    echo ========================================
    echo.
    echo Posibles causas:
    echo - MySQL no esta corriendo
    echo - Contrasena incorrecta (actualmente: admin)
    echo - Usuario incorrecto (actualmente: root)
    echo.
    echo Verifica las credenciales en api-clinica\.env
    echo.
)

pause

# Script de prueba de compilación para React Native
# Verifica el entorno y compila la aplicación

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 PRUEBA DE COMPILACIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la carpeta correcta
$currentPath = Get-Location
$expectedPath = Join-Path $PSScriptRoot ".."

if ($currentPath -ne $expectedPath) {
    Write-Host "⚠️  Cambiando a la carpeta correcta..." -ForegroundColor Yellow
    Set-Location $expectedPath
}

Write-Host "📁 Directorio: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# 1. Verificar archivos esenciales
Write-Host "1️⃣ Verificando archivos esenciales..." -ForegroundColor Yellow
$files = @("package.json", "index.js", "App.tsx", "metro.config.js", "android\app\build.gradle")
$allFilesExist = $true

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file NO ENCONTRADO" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ ERROR: Faltan archivos esenciales" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Verificar Node.js y npm
Write-Host "2️⃣ Verificando Node.js y npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "   ✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js o npm no están instalados" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Verificar dispositivos conectados
Write-Host "3️⃣ Verificando dispositivos Android..." -ForegroundColor Yellow
try {
    $devices = adb devices
    $deviceCount = ($devices | Select-String "device$" | Measure-Object).Count
    
    if ($deviceCount -gt 0) {
        Write-Host "   ✅ Dispositivos conectados: $deviceCount" -ForegroundColor Green
        $devices | Select-String "device$" | ForEach-Object {
            $deviceId = ($_ -split "\s+")[0]
            Write-Host "      - $deviceId" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️  No hay dispositivos conectados" -ForegroundColor Yellow
        Write-Host "      Conecta tu teléfono por USB o inicia un emulador" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  No se pudo verificar dispositivos (adb no encontrado)" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar node_modules
Write-Host "4️⃣ Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  node_modules no encontrado. Instalando..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 5. Verificar Gradle
Write-Host "5️⃣ Verificando Gradle..." -ForegroundColor Yellow
try {
    Push-Location android
    $gradleVersion = .\gradlew --version 2>&1 | Select-String "Gradle" | Select-Object -First 1
    if ($gradleVersion) {
        Write-Host "   ✅ $gradleVersion" -ForegroundColor Green
    }
    Pop-Location
} catch {
    Write-Host "   ⚠️  No se pudo verificar Gradle" -ForegroundColor Yellow
}

Write-Host ""

# 6. Limpiar build anterior (opcional)
Write-Host "6️⃣ Limpiando build anterior..." -ForegroundColor Yellow
try {
    Push-Location android
    .\gradlew clean 2>&1 | Out-Null
    Write-Host "   ✅ Build limpiado" -ForegroundColor Green
    Pop-Location
} catch {
    Write-Host "   ⚠️  No se pudo limpiar el build" -ForegroundColor Yellow
}

Write-Host ""

# 7. Iniciar compilación
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO COMPILACIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Nota: Esta compilación puede tardar varios minutos" -ForegroundColor Yellow
Write-Host "   Asegúrate de tener Metro Bundler corriendo en otra terminal" -ForegroundColor Yellow
Write-Host "   Comando: npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si continuar
$response = Read-Host "¿Deseas continuar con la compilación? (S/N)"
if ($response -ne "S" -and $response -ne "s" -and $response -ne "Y" -and $response -ne "y") {
    Write-Host "Compilación cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Compilando..." -ForegroundColor Cyan
Write-Host ""

# Compilar
npx react-native run-android --no-packager

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ COMPILACIÓN EXITOSA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ COMPILACIÓN FALLIDA" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los errores arriba para más detalles" -ForegroundColor Yellow
    exit 1
}



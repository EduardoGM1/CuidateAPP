#!/bin/bash

#################################################
# Script de Tests Automatizados - DetallePaciente
# @author Senior Developer
# @date 2025-10-28
#################################################

echo "🧪 INICIANDO TESTS AUTOMATIZADOS"
echo "================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecutar desde directorio ClinicaMovil"
    exit 1
fi

print_success "Directorio correcto: ClinicaMovil"

# 2. Limpiar cache de Jest
print_info "Limpiando cache de Jest..."
npm test -- --clearCache

# 3. Ejecutar tests unitarios
echo ""
echo "================================="
echo "📦 TESTS UNITARIOS"
echo "================================="
npm test -- --testPathPattern="DetallePaciente.test" --verbose --coverage

# 4. Ejecutar tests de integración
echo ""
echo "================================="
echo "🔗 TESTS DE INTEGRACIÓN"
echo "================================="
npm test -- --testPathPattern="integration" --verbose

# 5. Generar reporte de cobertura
echo ""
echo "================================="
echo "📊 REPORTE DE COBERTURA"
echo "================================="
npm test -- --coverage --coverageReporters=text --coverageReporters=html

# 6. Verificar umbral de cobertura
COVERAGE=$(npm test -- --coverage --coverageReporters=text-summary 2>&1 | grep -i "statements" | grep -oP '\d+%' | head -1 | tr -d '%')

if [ -z "$COVERAGE" ]; then
    print_error "No se pudo obtener porcentaje de cobertura"
    exit 1
fi

echo ""
print_info "Cobertura actual: ${COVERAGE}%"

if [ "$COVERAGE" -lt 70 ]; then
    print_error "Cobertura insuficiente: ${COVERAGE}% (mínimo requerido: 70%)"
    exit 1
else
    print_success "Cobertura aceptable: ${COVERAGE}%"
fi

# 7. Resumen final
echo ""
echo "================================="
echo "✅ TESTS COMPLETADOS"
echo "================================="
print_success "Todos los tests ejecutados correctamente"
print_info "Revisa el reporte HTML en: coverage/index.html"













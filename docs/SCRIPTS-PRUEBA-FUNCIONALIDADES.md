# 🔧 Scripts de Prueba - Funcionalidades Implementadas

**Fecha:** 17 de noviembre de 2025

---

## 📱 Script 1: Crear Paciente de Prueba con Comorbilidades

### **Para Backend (Node.js):**

```javascript
// scripts/crear-paciente-prueba-comorbilidades.js
import { Paciente, Comorbilidad, PacienteComorbilidad, Usuario } from '../models/associations.js';
import sequelize from '../config/db.js';

async function crearPacientePrueba() {
  try {
    // 1. Crear usuario
    const usuario = await Usuario.create({
      email: 'paciente.prueba.comorbilidades@test.com',
      password_hash: '$2b$10$...', // Hash de "password123"
      rol: 'Paciente',
      activo: true
    });

    // 2. Crear paciente
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'García',
      fecha_nacimiento: '1980-01-15',
      sexo: 'M',
      telefono: '5551234567',
      activo: true
    });

    // 3. Buscar comorbilidades existentes
    const diabetes = await Comorbilidad.findOne({ 
      where: { nombre_comorbilidad: { [Op.iLike]: '%diabetes%' } } 
    });
    const hipertension = await Comorbilidad.findOne({ 
      where: { nombre_comorbilidad: { [Op.iLike]: '%hipertensión%' } } 
    });
    const obesidad = await Comorbilidad.findOne({ 
      where: { nombre_comorbilidad: { [Op.iLike]: '%obesidad%' } } 
    });

    // 4. Asignar comorbilidades
    if (diabetes) {
      await PacienteComorbilidad.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: diabetes.id_comorbilidad,
        anos_diagnostico: 5
      });
    }

    if (hipertension) {
      await PacienteComorbilidad.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: hipertension.id_comorbilidad,
        anos_diagnostico: 3
      });
    }

    if (obesidad) {
      await PacienteComorbilidad.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: obesidad.id_comorbilidad,
        anos_diagnostico: 10
      });
    }

    console.log('✅ Paciente de prueba creado:', {
      id: paciente.id_paciente,
      nombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
      email: usuario.email,
      comorbilidades: [diabetes, hipertension, obesidad].filter(Boolean).map(c => c.nombre_comorbilidad)
    });

    return paciente;
  } catch (error) {
    console.error('❌ Error creando paciente:', error);
    throw error;
  }
}

crearPacientePrueba().then(() => process.exit(0));
```

---

## 🧪 Script 2: Verificar Rangos Personalizados (Backend)

### **Script de Prueba:**

```javascript
// scripts/verificar-rangos-personalizados.js
import alertService from '../services/alertService.js';
import { Paciente, Comorbilidad } from '../models/associations.js';
import { Op } from 'sequelize';

async function verificarRangosPersonalizados(pacienteId) {
  try {
    // Obtener paciente con comorbilidades
    const paciente = await Paciente.findByPk(pacienteId, {
      include: [{
        model: Comorbilidad,
        as: 'Comorbilidades',
        through: { attributes: [] }
      }]
    });

    if (!paciente) {
      console.error('❌ Paciente no encontrado');
      return;
    }

    console.log('📋 Paciente:', paciente.nombre, paciente.apellido_paterno);
    console.log('🏥 Comorbilidades:', paciente.Comorbilidades.map(c => c.nombre_comorbilidad));

    // Obtener rangos personalizados
    const rangos = alertService.obtenerRangosPersonalizados(paciente.Comorbilidades);

    console.log('\n📊 Rangos Aplicados:');
    console.log('Glucosa:', rangos.glucosa);
    console.log('Presión Sistólica:', rangos.presionSistolica);
    console.log('Presión Diastólica:', rangos.presionDiastolica);
    console.log('IMC:', rangos.imc);

    // Probar valores
    console.log('\n🧪 Pruebas de Valores:');

    // Glucosa
    const glucosa140 = alertService.verificarGlucosa(140, rangos);
    console.log('Glucosa 140 mg/dL:', glucosa140 ? '⚠️ ALERTA' : '✅ Normal');

    const glucosa60 = alertService.verificarGlucosa(60, rangos);
    console.log('Glucosa 60 mg/dL:', glucosa60 ? '🚨 CRÍTICA' : '✅ Normal');

    // Presión
    const presion135 = alertService.verificarPresion(135, 90, rangos);
    console.log('Presión 135/90 mmHg:', presion135 ? '⚠️ ALERTA' : '✅ Normal');

    return rangos;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Ejecutar: node scripts/verificar-rangos-personalizados.js [ID_PACIENTE]
const pacienteId = process.argv[2];
if (pacienteId) {
  verificarRangosPersonalizados(parseInt(pacienteId));
} else {
  console.log('Uso: node verificar-rangos-personalizados.js [ID_PACIENTE]');
}
```

---

## 📱 Script 3: Verificar Cola Offline (Frontend - React Native)

### **Agregar a cualquier pantalla de paciente (solo desarrollo):**

```javascript
// En InicioPaciente.js o Configuracion.js (solo en __DEV__)
import offlineService from '../../services/offlineService';

// Agregar botón de debug
{__DEV__ && (
  <TouchableOpacity
    style={styles.debugButton}
    onPress={async () => {
      try {
        const queue = await offlineService.getQueue();
        const status = offlineService.getQueueStatus();
        
        Alert.alert(
          '🔍 Debug: Cola Offline',
          `Estado: ${status.isOnline ? 'Online' : 'Offline'}\n` +
          `Total: ${status.total}\n` +
          `Pendientes: ${status.pending}\n` +
          `Sincronizando: ${status.syncing ? 'Sí' : 'No'}\n\n` +
          `Cola:\n${JSON.stringify(queue, null, 2)}`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        Alert.alert('Error', error.message);
      }
    }}
  >
    <Text style={styles.debugButtonText}>🔍 Debug Cola</Text>
  </TouchableOpacity>
)}
```

---

## 🗄️ Script 4: Consultas SQL de Verificación

### **Crear archivo:** `scripts/verificar-funcionalidades.sql`

```sql
-- ============================================
-- VERIFICACIÓN DE FUNCIONALIDADES
-- ============================================

-- 1. Verificar pacientes con comorbilidades
SELECT 
  p.id_paciente,
  p.nombre,
  p.apellido_paterno,
  GROUP_CONCAT(c.nombre_comorbilidad) as comorbilidades
FROM pacientes p
LEFT JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
LEFT JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE p.activo = 1
GROUP BY p.id_paciente
HAVING comorbilidades IS NOT NULL;

-- 2. Verificar signos vitales recientes (últimas 24 horas)
SELECT 
  sv.id_signo,
  p.nombre,
  sv.glucosa_mg_dl,
  sv.presion_sistolica,
  sv.presion_diastolica,
  sv.imc,
  sv.fecha_registro,
  CASE 
    WHEN sv.glucosa_mg_dl > 200 OR sv.glucosa_mg_dl < 50 THEN 'CRÍTICA'
    WHEN sv.glucosa_mg_dl > 126 OR sv.glucosa_mg_dl < 70 THEN 'MODERADA'
    ELSE 'NORMAL'
  END as alerta_glucosa
FROM signos_vitales sv
JOIN pacientes p ON sv.id_paciente = p.id_paciente
WHERE sv.fecha_registro >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY sv.fecha_registro DESC;

-- 3. Verificar tomas de medicamento de hoy
SELECT 
  mt.id_toma,
  p.nombre,
  m.nombre_medicamento,
  mt.fecha_toma,
  mt.hora_toma,
  mt.confirmado_por
FROM medicamento_toma mt
JOIN planes_medicacion pm ON mt.id_plan_medicacion = pm.id_plan
JOIN pacientes p ON pm.id_paciente = p.id_paciente
JOIN plan_detalle pd ON mt.id_plan_detalle = pd.id_detalle
JOIN medicamentos m ON pd.id_medicamento = m.id_medicamento
WHERE DATE(mt.fecha_toma) = CURDATE()
ORDER BY mt.fecha_toma DESC, mt.hora_toma DESC;

-- 4. Verificar comorbilidades y rangos esperados
SELECT 
  p.id_paciente,
  p.nombre,
  c.nombre_comorbilidad,
  CASE 
    WHEN c.nombre_comorbilidad LIKE '%diabetes%' THEN 'Glucosa: 80-130 (estricto)'
    WHEN c.nombre_comorbilidad LIKE '%hipertensión%' THEN 'Presión: 90-130/60-85 (estricto)'
    WHEN c.nombre_comorbilidad LIKE '%obesidad%' THEN 'IMC: 18.5-29.9 (ajustado)'
    ELSE 'Rangos normales'
  END as rangos_esperados
FROM pacientes p
JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE p.activo = 1;
```

---

## 🧪 Script 5: Test Automatizado de Rangos Personalizados

### **Crear archivo:** `api-clinica/__tests__/rangos-personalizados.test.js`

```javascript
import alertService from '../services/alertService.js';
import { Paciente, Comorbilidad } from '../models/associations.js';

describe('Rangos Personalizados por Comorbilidad', () => {
  test('debe aplicar rangos estrictos para diabetes', () => {
    const comorbilidades = [
      { nombre_comorbilidad: 'Diabetes' }
    ];
    
    const rangos = alertService.obtenerRangosPersonalizados(comorbilidades);
    
    expect(rangos.glucosa.min).toBe(80);
    expect(rangos.glucosa.max).toBe(130);
    expect(rangos.glucosa.criticoMin).toBe(60);
    expect(rangos.glucosa.criticoMax).toBe(180);
  });

  test('debe aplicar rangos estrictos para hipertensión', () => {
    const comorbilidades = [
      { nombre_comorbilidad: 'Hipertensión' }
    ];
    
    const rangos = alertService.obtenerRangosPersonalizados(comorbilidades);
    
    expect(rangos.presionSistolica.max).toBe(130);
    expect(rangos.presionDiastolica.max).toBe(85);
  });

  test('debe usar rangos normales sin comorbilidades', () => {
    const rangos = alertService.obtenerRangosPersonalizados([]);
    
    expect(rangos.glucosa.min).toBe(70);
    expect(rangos.glucosa.max).toBe(126);
  });

  test('debe combinar múltiples comorbilidades', () => {
    const comorbilidades = [
      { nombre_comorbilidad: 'Diabetes' },
      { nombre_comorbilidad: 'Hipertensión' }
    ];
    
    const rangos = alertService.obtenerRangosPersonalizados(comorbilidades);
    
    // Debe tener rangos de ambas
    expect(rangos.glucosa.max).toBe(130); // De diabetes
    expect(rangos.presionSistolica.max).toBe(130); // De hipertensión
  });
});
```

---

## 📋 Checklist de Pruebas Rápida

### **Para Ejecutar Todas las Pruebas:**

```bash
# 1. Crear paciente de prueba con comorbilidades
cd api-clinica
node scripts/crear-paciente-prueba-comorbilidades.js

# 2. Verificar rangos personalizados
node scripts/verificar-rangos-personalizados.js [ID_PACIENTE]

# 3. Ejecutar tests automatizados
npm test -- rangos-personalizados.test.js

# 4. En la app móvil:
# - Activar modo avión
# - Realizar operaciones
# - Verificar cola offline (botón debug)
# - Reconectar y verificar sincronización
```

---

**Nota:** Estos scripts son para desarrollo y pruebas. No usar en producción sin revisión.




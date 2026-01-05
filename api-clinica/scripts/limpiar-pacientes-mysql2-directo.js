import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import EncryptionService from '../services/encryptionService.js';

/**
 * Script que usa mysql2/promise directamente (como otros scripts que funcionaron)
 * para eliminar pacientes del doctor y crear uno nuevo con datos completos
 */

const DOCTOR_EMAIL = 'doctor@clinica.com';

// Configuración de conexión
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinica_db',
  multipleStatements: true
};

async function limpiarPacientesYCrearUnoCompleto() {
  let connection;

  try {
    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');

    // Iniciar transacción
    await connection.beginTransaction();
    console.log('🚀 Iniciando limpieza y creación de paciente completo...\n');

    // 1. Buscar doctor por email
    console.log('1️⃣ Buscando doctor con email doctor@clinica.com...');
    const [usuarios] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE email = ? AND rol = ?',
      [DOCTOR_EMAIL, 'Doctor']
    );

    if (usuarios.length === 0) {
      throw new Error('❌ ERROR: No se encontró doctor con email doctor@clinica.com');
    }

    const usuarioDoctor = usuarios[0];
    const [doctores] = await connection.execute(
      'SELECT id_doctor FROM doctores WHERE id_usuario = ?',
      [usuarioDoctor.id_usuario]
    );

    if (doctores.length === 0) {
      throw new Error('❌ ERROR: No se encontró registro de doctor asociado');
    }

    const doctor = doctores[0];
    console.log(`✅ Doctor encontrado (ID: ${doctor.id_doctor})\n`);

    // 2. Obtener todos los pacientes asignados a este doctor
    console.log('2️⃣ Obteniendo pacientes asignados al doctor...');
    const [asignaciones] = await connection.execute(
      'SELECT id_paciente FROM doctor_paciente WHERE id_doctor = ?',
      [doctor.id_doctor]
    );

    const pacienteIds = asignaciones.map(a => a.id_paciente);
    console.log(`   📋 Encontrados ${pacienteIds.length} pacientes asignados\n`);

    // 3. Eliminar todos los datos relacionados de los pacientes
    if (pacienteIds.length > 0) {
      console.log('3️⃣ Eliminando datos relacionados de pacientes...');
      const placeholders = pacienteIds.map(() => '?').join(',');
      
      // Eliminar en orden (respetando foreign keys)
      await connection.execute(`DELETE FROM mensajes_chat WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM solicitudes_reprogramacion WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM deteccion_tuberculosis WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM salud_bucal WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM sesiones_educativas WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM deteccion_complicaciones WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM esquema_vacunacion WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM paciente_comorbilidad WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM red_apoyo WHERE id_paciente IN (${placeholders})`, pacienteIds);
      
      // Obtener planes de medicación
      const [planes] = await connection.execute(
        `SELECT id_plan FROM planes_medicacion WHERE id_paciente IN (${placeholders})`,
        pacienteIds
      );
      const planIds = planes.map(p => p.id_plan);
      if (planIds.length > 0) {
        const planPlaceholders = planIds.map(() => '?').join(',');
        await connection.execute(`DELETE FROM plan_detalle WHERE id_plan IN (${planPlaceholders})`, planIds);
        await connection.execute(`DELETE FROM planes_medicacion WHERE id_plan IN (${planPlaceholders})`, planIds);
      }
      
      // Obtener citas para eliminar diagnósticos
      const [citas] = await connection.execute(
        `SELECT id_cita FROM citas WHERE id_paciente IN (${placeholders})`,
        pacienteIds
      );
      const citaIds = citas.map(c => c.id_cita);
      if (citaIds.length > 0) {
        const citaPlaceholders = citaIds.map(() => '?').join(',');
        await connection.execute(`DELETE FROM diagnosticos WHERE id_cita IN (${citaPlaceholders})`, citaIds);
      }
      
      // Eliminar signos vitales y citas
      await connection.execute(`DELETE FROM signos_vitales WHERE id_paciente IN (${placeholders})`, pacienteIds);
      await connection.execute(`DELETE FROM citas WHERE id_paciente IN (${placeholders})`, pacienteIds);
      
      // Eliminar asignaciones doctor-paciente
      await connection.execute(`DELETE FROM doctor_paciente WHERE id_paciente IN (${placeholders})`, pacienteIds);
      
      // Obtener usuarios de pacientes
      const [pacientes] = await connection.execute(
        `SELECT id_usuario FROM pacientes WHERE id_paciente IN (${placeholders})`,
        pacienteIds
      );
      const usuarioIds = pacientes.map(p => p.id_usuario).filter(Boolean);
      
      if (usuarioIds.length > 0) {
        const usuarioPlaceholders = usuarioIds.map(() => '?').join(',');
        // Verificar si auth_credentials existe y tiene la columna correcta
        try {
          await connection.execute(`DELETE FROM auth_credentials WHERE user_id IN (${usuarioPlaceholders})`, usuarioIds);
        } catch (error) {
          // Si falla, intentar con id_usuario o simplemente continuar
          try {
            await connection.execute(`DELETE FROM auth_credentials WHERE id_usuario IN (${usuarioPlaceholders})`, usuarioIds);
          } catch (e) {
            console.log('   ⚠️  No se pudo eliminar auth_credentials (puede que la tabla no exista o tenga otra estructura)');
          }
        }
        await connection.execute(`DELETE FROM pacientes WHERE id_paciente IN (${placeholders})`, pacienteIds);
        await connection.execute(`DELETE FROM usuarios WHERE id_usuario IN (${usuarioPlaceholders})`, usuarioIds);
      } else {
        await connection.execute(`DELETE FROM pacientes WHERE id_paciente IN (${placeholders})`, pacienteIds);
      }
      
      console.log(`   ✅ Eliminados ${pacienteIds.length} pacientes y todos sus datos relacionados\n`);
    } else {
      console.log('   ℹ️  No hay pacientes asignados para eliminar\n');
    }

    // 4. Obtener módulo
    console.log('4️⃣ Obteniendo módulo...');
    const [modulos] = await connection.execute('SELECT id_modulo FROM modulos LIMIT 1');
    let moduloId = 1;
    if (modulos.length === 0) {
      await connection.execute(
        'INSERT INTO modulos (nombre, descripcion, activo) VALUES (?, ?, ?)',
        ['Módulo Principal', 'Módulo principal del sistema', true]
      );
      const [newModulo] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      moduloId = newModulo[0].id;
      console.log('   ✅ Módulo creado');
    } else {
      moduloId = modulos[0].id_modulo;
      console.log(`   ✅ Módulo encontrado (ID: ${moduloId})`);
    }

    // 5. Crear nuevo paciente con datos completos
    console.log('\n5️⃣ Creando nuevo paciente con datos completos...');
    
    const fechaNacimiento = '1985-05-15';
    const fechaNacimientoEncrypted = EncryptionService.encryptField(fechaNacimiento);
    
    // Crear usuario para el paciente
    const passwordHash = await bcrypt.hash('Paciente123!', 10);
    const emailPaciente = `paciente.test.${Date.now()}@clinica.com`;
    
    await connection.execute(
      'INSERT INTO usuarios (email, password_hash, rol, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?)',
      [emailPaciente, passwordHash, 'Paciente', true, new Date()]
    );
    
    const [newUsuario] = await connection.execute('SELECT LAST_INSERT_ID() as id');
    const usuarioId = newUsuario[0].id;

    // Verificar estructura de columnas
    const [columnasInfo] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pacientes' 
       AND COLUMN_NAME IN ('telefono', 'numero_celular', 'nombre', 'apellido_paterno', 'apellido_materno', 'curp', 'direccion', 'fecha_nacimiento')`,
      [process.env.DB_NAME || 'clinica_db']
    );
    
    const columnasMap = {};
    columnasInfo.forEach(col => {
      columnasMap[col.COLUMN_NAME] = {
        type: col.DATA_TYPE,
        maxLength: col.CHARACTER_MAXIMUM_LENGTH
      };
    });
    
    const tieneTelefono = columnasMap['telefono'] !== undefined;
    const tieneNumeroCelular = columnasMap['numero_celular'] !== undefined;
    const nombreEsText = columnasMap['nombre']?.type === 'text' || columnasMap['nombre']?.type === 'longtext';
    const apellidoPaternoEsText = columnasMap['apellido_paterno']?.type === 'text' || columnasMap['apellido_paterno']?.type === 'longtext';
    const apellidoMaternoEsText = columnasMap['apellido_materno']?.type === 'text' || columnasMap['apellido_materno']?.type === 'longtext';
    const curpEsText = columnasMap['curp']?.type === 'text' || columnasMap['curp']?.type === 'longtext';
    const direccionEsText = columnasMap['direccion']?.type === 'text' || columnasMap['direccion']?.type === 'longtext';
    const fechaNacimientoEsText = columnasMap['fecha_nacimiento']?.type === 'text' || columnasMap['fecha_nacimiento']?.type === 'longtext';
    
    // Si los campos no son TEXT, los datos encriptados pueden ser demasiado largos
    // En ese caso, usar los valores sin encriptar (los hooks de Sequelize los encriptarán)
    // O usar un método de encriptación más corto
    // Por ahora, asumimos que si no son TEXT, debemos usar valores sin encriptar
    // y dejar que los hooks de Sequelize los encripten cuando se usen los modelos
    
    let camposPaciente = ['id_usuario', 'nombre', 'apellido_paterno', 'apellido_materno', 'fecha_nacimiento', 'sexo', 'curp'];
    let valoresPaciente = [
      usuarioId,
      nombreEsText ? EncryptionService.encryptField('María') : 'María',
      apellidoPaternoEsText ? EncryptionService.encryptField('González') : 'González',
      apellidoMaternoEsText ? EncryptionService.encryptField('López') : 'López',
      fechaNacimientoEsText ? fechaNacimientoEncrypted : fechaNacimiento,
      'Mujer', // ENUM: 'Hombre' o 'Mujer'
      curpEsText ? EncryptionService.encryptField('GOLL850515MDFRPR01') : 'GOLL850515MDFRPR01'
    ];
    
    if (tieneTelefono) {
      camposPaciente.push('telefono');
      valoresPaciente.push(EncryptionService.encryptField('5551234567'));
    }
    if (tieneNumeroCelular) {
      camposPaciente.push('numero_celular');
      const numeroCelularCol = columnasMap['numero_celular'];
      const numeroCelularEsText = numeroCelularCol?.type === 'text' || numeroCelularCol?.type === 'longtext';
      valoresPaciente.push(numeroCelularEsText ? EncryptionService.encryptField('5559876543') : '5559876543');
    }
    
    // email está en la tabla usuarios, no en pacientes
    // fecha_registro en lugar de fecha_creacion
    camposPaciente.push('direccion', 'estado', 'localidad', 'institucion_salud', 'id_modulo', 'activo', 'fecha_registro');
    valoresPaciente.push(
      direccionEsText ? EncryptionService.encryptField('Calle Principal 123, Colonia Centro') : 'Calle Principal 123, Colonia Centro',
      'Ciudad de México',
      'Ciudad de México',
      'IMSS',
      moduloId,
      true,
      new Date()
    );
    
    const camposPacienteStr = camposPaciente.join(', ');
    const valoresPacienteStr = camposPaciente.map(() => '?').join(', ');
    
    await connection.execute(
      `INSERT INTO pacientes (${camposPacienteStr}) VALUES (${valoresPacienteStr})`,
      valoresPaciente
    );

    const [newPaciente] = await connection.execute('SELECT LAST_INSERT_ID() as id');
    const pacienteId = newPaciente[0].id;
    console.log(`   ✅ Paciente creado (ID: ${pacienteId})`);

    // Crear credencial de autenticación con PIN
    const pinHash = await bcrypt.hash('2020', 10);
    try {
      // Intentar con is_active primero
      await connection.execute(
        'INSERT INTO auth_credentials (user_type, user_id, auth_method, credential_value, is_primary, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Paciente', usuarioId, 'pin', pinHash, true, true, new Date()]
      );
      console.log('   ✅ Credencial de autenticación creada (PIN: 2020)');
    } catch (error) {
      // Si falla, intentar sin is_active
      try {
        await connection.execute(
          'INSERT INTO auth_credentials (user_type, user_id, auth_method, credential_value, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['Paciente', usuarioId, 'pin', pinHash, true, new Date()]
        );
        console.log('   ✅ Credencial de autenticación creada (PIN: 2020)');
      } catch (e) {
        console.log(`   ⚠️  No se pudo crear credencial: ${e.message}`);
        console.log('   ℹ️  El paciente se creó pero sin credencial. Se puede crear manualmente después.');
      }
    }

    // Asignar paciente al doctor (verificar si tiene columna activo)
    try {
      await connection.execute(
        'INSERT INTO doctor_paciente (id_doctor, id_paciente, fecha_asignacion) VALUES (?, ?, ?)',
        [doctor.id_doctor, pacienteId, new Date()]
      );
    } catch (error) {
      // Si falla, intentar con activo
      await connection.execute(
        'INSERT INTO doctor_paciente (id_doctor, id_paciente, fecha_asignacion, activo) VALUES (?, ?, ?, ?)',
        [doctor.id_doctor, pacienteId, new Date(), true]
      );
    }
    console.log('   ✅ Paciente asignado al doctor');

    // 6. Crear primera cita
    console.log('\n6️⃣ Creando primera cita...');
    const fechaCita = new Date();
    fechaCita.setHours(10, 0, 0, 0);
    
    const motivoEncrypted = EncryptionService.encryptField('Consulta de rutina y evaluación general');
    const observacionesEncrypted = EncryptionService.encryptField('Paciente en buen estado general. Se realizará evaluación completa.');
    
    await connection.execute(
      `INSERT INTO citas (
        id_paciente, id_doctor, fecha_cita, estado, asistencia, es_primera_consulta, 
        motivo, observaciones, fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pacienteId,
        doctor.id_doctor,
        fechaCita,
        'atendida',
        true,
        true,
        motivoEncrypted,
        observacionesEncrypted,
        new Date()
      ]
    );
    
    const [newCita] = await connection.execute('SELECT LAST_INSERT_ID() as id');
    const citaId = newCita[0].id;
    console.log(`   ✅ Cita creada (ID: ${citaId})`);

    // 7. Crear signos vitales completos (con encriptación)
    console.log('\n7️⃣ Creando signos vitales completos...');
    await connection.execute(
      `INSERT INTO signos_vitales (
        id_paciente, id_cita, fecha_medicion, peso_kg, talla_m, imc, medida_cintura_cm,
        presion_sistolica, presion_diastolica, glucosa_mg_dl, colesterol_mg_dl, 
        colesterol_ldl, colesterol_hdl, trigliceridos_mg_dl, hba1c_porcentaje,
        edad_paciente_en_medicion, registrado_por, observaciones, fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pacienteId,
        citaId,
        fechaCita,
        65.5,
        1.65,
        24.1,
        78.0,
        EncryptionService.encryptField('120'),
        EncryptionService.encryptField('80'),
        EncryptionService.encryptField('95'),
        EncryptionService.encryptField('180'),
        EncryptionService.encryptField('110'),
        EncryptionService.encryptField('55'),
        EncryptionService.encryptField('120'),
        EncryptionService.encryptField('5.5'),
        38,
        'doctor',
        EncryptionService.encryptField('Signos vitales dentro de parámetros normales. Paciente en buen estado general.'),
        new Date()
      ]
    );
    
    const [newSigno] = await connection.execute('SELECT LAST_INSERT_ID() as id');
    console.log(`   ✅ Signos vitales creados (ID: ${newSigno[0].id})`);

    // 8. Crear diagnóstico (solo tiene id_cita, no id_paciente según el modelo)
    console.log('\n8️⃣ Creando diagnóstico...');
    const descripcionEncrypted = EncryptionService.encryptField('Paciente sana. Control de rutina. Sin patologías detectadas. Se recomienda seguimiento en 6 meses.');
    // Verificar si tiene fecha_creacion
    const [columnasDiagnostico] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'diagnosticos' 
       AND COLUMN_NAME = 'fecha_creacion'`,
      [process.env.DB_NAME || 'clinica_db']
    );
    
    const tieneFechaCreacion = columnasDiagnostico.length > 0;
    
    if (tieneFechaCreacion) {
      await connection.execute(
        'INSERT INTO diagnosticos (id_cita, fecha_registro, descripcion, fecha_creacion) VALUES (?, ?, ?, ?)',
        [citaId, fechaCita, descripcionEncrypted, new Date()]
      );
    } else {
      await connection.execute(
        'INSERT INTO diagnosticos (id_cita, fecha_registro, descripcion) VALUES (?, ?, ?)',
        [citaId, fechaCita, descripcionEncrypted]
      );
    }
    
    const [newDiagnostico] = await connection.execute('SELECT LAST_INSERT_ID() as id');
    console.log(`   ✅ Diagnóstico creado (ID: ${newDiagnostico[0].id})`);

    // 9. Crear plan de medicación
    console.log('\n9️⃣ Creando plan de medicación...');
    
    // Verificar estructura de tabla medicamentos
    const [columnasMedicamento] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'medicamentos' 
       AND COLUMN_NAME IN ('nombre', 'nombre_medicamento', 'descripcion', 'activo')`,
      [process.env.DB_NAME || 'clinica_db']
    );
    
    const columnasMedMap = {};
    columnasMedicamento.forEach(col => {
      columnasMedMap[col.COLUMN_NAME] = true;
    });
    
    const nombreCol = columnasMedMap['nombre'] ? 'nombre' : (columnasMedMap['nombre_medicamento'] ? 'nombre_medicamento' : null);
    
    let medicamentoId;
    if (nombreCol) {
      // Buscar o crear medicamento
      let [medicamentos] = await connection.execute(
        `SELECT id_medicamento FROM medicamentos WHERE ${nombreCol} = ? LIMIT 1`,
        ['Ácido Acetilsalicílico']
      );
      
      if (medicamentos.length === 0) {
        const camposMed = [nombreCol, 'descripcion'];
        const valoresMed = ['Ácido Acetilsalicílico', 'Antiagregante plaquetario'];
        if (columnasMedMap['activo']) {
          camposMed.push('activo');
          valoresMed.push(true);
        }
        const camposStr = camposMed.join(', ');
        const valoresStr = camposMed.map(() => '?').join(', ');
        await connection.execute(
          `INSERT INTO medicamentos (${camposStr}) VALUES (${valoresStr})`,
          valoresMed
        );
        const [newMed] = await connection.execute('SELECT LAST_INSERT_ID() as id');
        medicamentoId = newMed[0].id;
      } else {
        medicamentoId = medicamentos[0].id_medicamento;
      }
    } else {
      // Si no hay columna nombre, usar el primer medicamento disponible o crear uno genérico
      const [medicamentos] = await connection.execute('SELECT id_medicamento FROM medicamentos LIMIT 1');
      if (medicamentos.length > 0) {
        medicamentoId = medicamentos[0].id_medicamento;
      } else {
        // Crear medicamento con estructura mínima
        await connection.execute('INSERT INTO medicamentos (descripcion) VALUES (?)', ['Medicamento genérico']);
        const [newMed] = await connection.execute('SELECT LAST_INSERT_ID() as id');
        medicamentoId = newMed[0].id;
      }
    }

    const observacionesPlanEncrypted = EncryptionService.encryptField('Plan de medicación preventivo. Tomar con alimentos.');
    const fechaFin = new Date(fechaCita.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    await connection.execute(
      `INSERT INTO planes_medicacion (
        id_paciente, id_doctor, id_cita, fecha_inicio, fecha_fin, observaciones, fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pacienteId, doctor.id_doctor, citaId, fechaCita, fechaFin, observacionesPlanEncrypted, new Date()]
    );

    const [newPlan] = await connection.execute('SELECT LAST_INSERT_ID() as id');
    const planId = newPlan[0].id;

    // Verificar columnas de plan_detalle
    const [columnasPlanDetalle] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'plan_detalle' 
       AND COLUMN_NAME IN ('duracion_dias', 'duracion', 'fecha_creacion', 'instrucciones')`,
      [process.env.DB_NAME || 'clinica_db']
    );
    
    const columnasPlanDetMap = {};
    columnasPlanDetalle.forEach(col => {
      columnasPlanDetMap[col.COLUMN_NAME] = true;
    });
    
    const duracionCol = columnasPlanDetMap['duracion_dias'] ? 'duracion_dias' : (columnasPlanDetMap['duracion'] ? 'duracion' : null);
    
    let camposPlanDet = ['id_plan', 'id_medicamento', 'dosis', 'frecuencia'];
    let valoresPlanDet = [planId, medicamentoId, '100 mg', 'Una vez al día'];
    
    if (duracionCol) {
      camposPlanDet.push(duracionCol);
      valoresPlanDet.push(30);
    }
    
    if (columnasPlanDetMap['instrucciones']) {
      camposPlanDet.push('instrucciones');
      valoresPlanDet.push('Tomar con el desayuno');
    }
    
    if (columnasPlanDetMap['fecha_creacion']) {
      camposPlanDet.push('fecha_creacion');
      valoresPlanDet.push(new Date());
    }
    
    const camposStr = camposPlanDet.join(', ');
    const valoresStr = camposPlanDet.map(() => '?').join(', ');
    
    await connection.execute(
      `INSERT INTO plan_detalle (${camposStr}) VALUES (${valoresStr})`,
      valoresPlanDet
    );
    
    console.log(`   ✅ Plan de medicación creado (ID: ${planId})`);

    // 10. Crear comorbilidad
    console.log('\n🔟 Creando comorbilidad...');
    
    // Verificar estructura de tabla comorbilidades
    const [columnasComorbilidad] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comorbilidades' 
       AND COLUMN_NAME IN ('nombre', 'nombre_comorbilidad', 'descripcion', 'activo')`,
      [process.env.DB_NAME || 'clinica_db']
    );
    
    const columnasComMap = {};
    columnasComorbilidad.forEach(col => {
      columnasComMap[col.COLUMN_NAME] = true;
    });
    
    const nombreComCol = columnasComMap['nombre'] ? 'nombre' : (columnasComMap['nombre_comorbilidad'] ? 'nombre_comorbilidad' : null);
    
    let comorbilidadId;
    if (nombreComCol) {
      let [comorbilidades] = await connection.execute(
        `SELECT id_comorbilidad FROM comorbilidades WHERE ${nombreComCol} = ? LIMIT 1`,
        ['Hipertensión Arterial']
      );
      
      if (comorbilidades.length === 0) {
        const camposCom = [nombreComCol, 'descripcion'];
        const valoresCom = ['Hipertensión Arterial', 'Presión arterial elevada'];
        if (columnasComMap['activo']) {
          camposCom.push('activo');
          valoresCom.push(true);
        }
        const camposComStr = camposCom.join(', ');
        const valoresComStr = camposCom.map(() => '?').join(', ');
        await connection.execute(
          `INSERT INTO comorbilidades (${camposComStr}) VALUES (${valoresComStr})`,
          valoresCom
        );
        const [newCom] = await connection.execute('SELECT LAST_INSERT_ID() as id');
        comorbilidadId = newCom[0].id;
      } else {
        comorbilidadId = comorbilidades[0].id_comorbilidad;
      }
    } else {
      // Si no hay columna nombre, usar el primer comorbilidad disponible o crear uno genérico
      const [comorbilidades] = await connection.execute('SELECT id_comorbilidad FROM comorbilidades LIMIT 1');
      if (comorbilidades.length > 0) {
        comorbilidadId = comorbilidades[0].id_comorbilidad;
      } else {
        // Crear comorbilidad con estructura mínima
        await connection.execute('INSERT INTO comorbilidades (descripcion) VALUES (?)', ['Comorbilidad genérica']);
        const [newCom] = await connection.execute('SELECT LAST_INSERT_ID() as id');
        comorbilidadId = newCom[0].id;
      }
    }

    // Verificar columnas de paciente_comorbilidad
    const [columnasPacCom] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'paciente_comorbilidad' 
       AND COLUMN_NAME IN ('fecha_diagnostico', 'fecha_registro', 'diagnostico_basal', 'tratamiento_actual', 'activo', 'fecha_creacion')`,
      [process.env.DB_NAME || 'clinica_db']
    );
    
    const columnasPacComMap = {};
    columnasPacCom.forEach(col => {
      columnasPacComMap[col.COLUMN_NAME] = true;
    });
    
    const fechaCol = columnasPacComMap['fecha_diagnostico'] ? 'fecha_diagnostico' : (columnasPacComMap['fecha_registro'] ? 'fecha_registro' : null);
    
    let camposPacCom = ['id_paciente', 'id_comorbilidad'];
    let valoresPacCom = [pacienteId, comorbilidadId];
    
    if (fechaCol) {
      camposPacCom.push(fechaCol);
      valoresPacCom.push(fechaCita);
    }
    
    if (columnasPacComMap['diagnostico_basal']) {
      camposPacCom.push('diagnostico_basal');
      valoresPacCom.push(EncryptionService.encryptField('Hipertensión controlada'));
    }
    
    if (columnasPacComMap['tratamiento_actual']) {
      camposPacCom.push('tratamiento_actual');
      valoresPacCom.push(EncryptionService.encryptField('Control con dieta y ejercicio'));
    }
    
    if (columnasPacComMap['activo']) {
      camposPacCom.push('activo');
      valoresPacCom.push(true);
    }
    
    if (columnasPacComMap['fecha_creacion']) {
      camposPacCom.push('fecha_creacion');
      valoresPacCom.push(new Date());
    }
    
    const camposPacComStr = camposPacCom.join(', ');
    const valoresPacComStr = camposPacCom.map(() => '?').join(', ');
    
    await connection.execute(
      `INSERT INTO paciente_comorbilidad (${camposPacComStr}) VALUES (${valoresPacComStr})`,
      valoresPacCom
    );
    console.log('   ✅ Comorbilidad creada');

    // Commit transacción
    await connection.commit();
    await connection.end();

    console.log('\n✅ ✅ ✅ PROCESO COMPLETADO EXITOSAMENTE ✅ ✅ ✅\n');
    console.log('📊 RESUMEN:');
    console.log(`   👤 Paciente ID: ${pacienteId}`);
    console.log(`   📧 Email: ${emailPaciente}`);
    console.log(`   🔐 PIN: 2020`);
    console.log(`   📅 Cita ID: ${citaId}`);
    console.log(`   💓 Signos Vitales ID: ${newSigno[0].id}`);
    console.log(`   📋 Diagnóstico ID: ${newDiagnostico[0].id}`);
    console.log(`   💊 Plan Medicación ID: ${planId}`);
    console.log(`   👨‍⚕️  Doctor: ${DOCTOR_EMAIL}\n`);

    return {
      pacienteId,
      citaId,
      signosVitalesId: newSigno[0].id,
      diagnosticoId: newDiagnostico[0].id,
      planMedicacionId: planId
    };

  } catch (error) {
    if (connection) {
      await connection.rollback();
      await connection.end();
    }
    console.error('❌ ERROR en el proceso:', error.message);
    if (error.code) {
      console.error('   Código:', error.code);
    }
    if (error.sqlMessage) {
      console.error('   SQL:', error.sqlMessage);
    }
    throw error;
  }
}

// Ejecutar script
limpiarPacientesYCrearUnoCompleto()
  .then((result) => {
    console.log('\n✅ Script ejecutado exitosamente');
    console.log('📋 IDs generados:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });


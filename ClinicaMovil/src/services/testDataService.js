/**
 * Servicio para generar datos de prueba aleatorios
 * Útil para testing y desarrollo rápido
 */

// Arrays de datos para generar contenido aleatorio
const nombres = [
  'María', 'José', 'Ana', 'Luis', 'Carmen', 'Juan', 'Isabel', 'Carlos', 'Rosa', 'Miguel',
  'Elena', 'Antonio', 'Pilar', 'Francisco', 'Dolores', 'Manuel', 'Teresa', 'David', 'Laura', 'Jesús',
  'Cristina', 'Pedro', 'Mónica', 'Rafael', 'Patricia', 'Fernando', 'Sandra', 'Alejandro', 'Beatriz', 'Roberto'
];

const apellidos = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
  'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina'
];

const localidades = [
  'Centro', 'Norte', 'Sur', 'Oriente', 'Poniente', 'Industrial', 'Residencial', 'Comercial', 'Educativo', 'Médico'
];

const institucionesSalud = [
  'IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'
];

const parentescos = [
  'Padre', 'Madre', 'Hijo(a)', 'Hermano(a)', 'Esposo(a)', 'Abuelo(a)', 'Tío(a)', 'Primo(a)', 'Sobrino(a)', 'Cuñado(a)'
];

const motivosConsulta = [
  'Control de rutina', 'Dolor de cabeza', 'Fiebre', 'Dolor abdominal', 'Tos persistente', 'Fatiga', 'Dolor de espalda', 'Problemas digestivos'
];

const diagnosticos = [
  'Hipertensión arterial', 'Diabetes mellitus', 'Gripe común', 'Gastritis', 'Migraña', 'Ansiedad', 'Depresión', 'Artritis'
];

const tratamientos = [
  'Medicamento oral', 'Reposo', 'Dieta especial', 'Ejercicio moderado', 'Terapia física', 'Seguimiento médico'
];

const alergias = [
  'Ninguna', 'Penicilina', 'Aspirina', 'Polen', 'Polvo', 'Mariscos', 'Nueces', 'Látex'
];

const antecedentesFamiliares = [
  'Diabetes en padre', 'Hipertensión en madre', 'Cáncer en abuelo', 'Ninguno', 'Enfermedad cardíaca en familia', 'Asma en hermanos'
];

/**
 * Genera un nombre aleatorio
 */
export const generarNombre = () => {
  return nombres[Math.floor(Math.random() * nombres.length)];
};

/**
 * Genera un apellido aleatorio
 */
export const generarApellido = () => {
  return apellidos[Math.floor(Math.random() * apellidos.length)];
};

/**
 * Genera un nombre completo aleatorio
 */
export const generarNombreCompleto = () => {
  return {
    nombre: generarNombre(),
    apellidoPaterno: generarApellido(),
    apellidoMaterno: generarApellido()
  };
};

/**
 * Genera una CURP aleatoria (formato básico)
 */
export const generarCURP = (fechaNacimiento, sexo) => {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  
  let curp = '';
  
  // 4 letras iniciales (simuladas)
  for (let i = 0; i < 4; i++) {
    curp += letras[Math.floor(Math.random() * letras.length)];
  }
  
  // 6 números (fecha de nacimiento)
  const fecha = fechaNacimiento.replace(/-/g, '');
  curp += fecha.substr(2); // AAMMDD
  
  // 1 letra (sexo)
  curp += sexo === 'Hombre' ? 'H' : 'M';
  
  // 2 letras (estado - DF)
  curp += 'DF';
  
  // 3 letras (primeras consonantes internas)
  for (let i = 0; i < 3; i++) {
    curp += letras[Math.floor(Math.random() * letras.length)];
  }
  
  // 1 número (dígito verificador)
  curp += numeros[Math.floor(Math.random() * numeros.length)];
  
  // 1 número adicional para llegar a 18 caracteres
  curp += numeros[Math.floor(Math.random() * numeros.length)];
  
  return curp;
};

/**
 * Genera una fecha de nacimiento aleatoria (entre 18 y 80 años)
 */
export const generarFechaNacimiento = () => {
  const hoy = new Date();
  const edadMin = 18;
  const edadMax = 80;
  
  const añoNacimiento = hoy.getFullYear() - Math.floor(Math.random() * (edadMax - edadMin + 1)) - edadMin;
  const mes = Math.floor(Math.random() * 12) + 1;
  const dia = Math.floor(Math.random() * 28) + 1; // Usar 28 para evitar problemas con febrero
  
  return `${añoNacimiento}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
};

/**
 * Genera un número de teléfono aleatorio
 */
export const generarTelefono = () => {
  const codigoArea = Math.floor(Math.random() * 900) + 100; // 100-999
  const numero = Math.floor(Math.random() * 9000000) + 1000000; // 1000000-9999999
  return `${codigoArea}-${numero}`;
};

/**
 * Genera un email aleatorio
 */
export const generarEmail = (nombre, apellido) => {
  const dominios = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
  const dominio = dominios[Math.floor(Math.random() * dominios.length)];
  const numero = Math.floor(Math.random() * 999);
  return `${nombre.toLowerCase()}.${apellido.toLowerCase()}${numero}@${dominio}`;
};

/**
 * Genera una dirección aleatoria
 */
export const generarDireccion = () => {
  const calles = ['Calle', 'Avenida', 'Boulevard', 'Carrera', 'Vía'];
  const nombresCalle = ['Principal', 'Central', 'Norte', 'Sur', 'Oriente', 'Poniente', 'Libertad', 'Independencia'];
  const numero = Math.floor(Math.random() * 9999) + 1;
  
  const calle = calles[Math.floor(Math.random() * calles.length)];
  const nombreCalle = nombresCalle[Math.floor(Math.random() * nombresCalle.length)];
  
  return `${calle} ${nombreCalle} #${numero}`;
};

/**
 * Genera una localidad aleatoria
 */
export const generarLocalidad = () => {
  return localidades[Math.floor(Math.random() * localidades.length)];
};

/**
 * Genera una institución de salud aleatoria
 */
export const generarInstitucionSalud = () => {
  return institucionesSalud[Math.floor(Math.random() * institucionesSalud.length)];
};

/**
 * Genera un sexo aleatorio
 */
export const generarSexo = () => {
  return Math.random() > 0.5 ? 'Hombre' : 'Mujer';
};

/**
 * Genera datos de red de apoyo aleatorios
 */
export const generarRedApoyo = () => {
  const parentesco = parentescos[Math.floor(Math.random() * parentescos.length)];
  const nombre = generarNombre();
  const apellido = generarApellido();
  
  return {
    nombreContacto: `${nombre} ${apellido}`,
    numeroCelular: generarTelefono(),
    email: generarEmail(nombre, apellido),
    direccion: generarDireccion(),
    localidad: generarLocalidad(),
    parentesco: parentesco
  };
};

/**
 * Genera datos de primera consulta aleatorios
 */
export const generarPrimeraConsulta = (idDoctor) => {
  const motivo = motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)];
  const diagnostico = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
  const tratamiento = tratamientos[Math.floor(Math.random() * tratamientos.length)];
  const alergia = alergias[Math.floor(Math.random() * alergias.length)];
  const antecedente = antecedentesFamiliares[Math.floor(Math.random() * antecedentesFamiliares.length)];
  
  // Generar enfermedades crónicas aleatorias (1-3 enfermedades)
  const numEnfermedades = Math.floor(Math.random() * 3) + 1;
  const enfermedadesDisponibles = [
    'Diabetes', 'Hipertensión', 'Obesidad', 'Dislipidemia', 'Enfermedad renal crónica',
    'EPOC', 'Enfermedad cardiovascular', 'Tuberculosis', 'Asma', 'Tabaquismo'
  ];
  const enfermedadesCronicas = [];
  for (let i = 0; i < numEnfermedades; i++) {
    const enfermedad = enfermedadesDisponibles[Math.floor(Math.random() * enfermedadesDisponibles.length)];
    if (!enfermedadesCronicas.includes(enfermedad)) {
      enfermedadesCronicas.push(enfermedad);
    }
  }
  
  // Generar medicamentos aleatorios si hay enfermedades
  const medicamentos = [];
  const tieneMedicamentos = enfermedadesCronicas.length > 0 && Math.random() > 0.3;
  if (tieneMedicamentos) {
    const medicamentosDisponibles = [
      'Metformina 500mg', 'Losartán 50mg', 'Atorvastatina 20mg', 'Omeprazol 20mg',
      'Amlodipino 5mg', 'Glimepirida 2mg', 'Simvastatina 40mg', 'Enalapril 10mg'
    ];
    const numMedicamentos = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numMedicamentos; i++) {
      const medicamento = medicamentosDisponibles[Math.floor(Math.random() * medicamentosDisponibles.length)];
      if (!medicamentos.includes(medicamento)) {
        medicamentos.push(medicamento);
      }
    }
  }
  
  // Generar signos vitales aleatorios
  const peso = (Math.random() * 40 + 50).toFixed(1); // 50-90 kg
  const talla = (Math.random() * 0.4 + 1.5).toFixed(2); // 1.50-1.90 m
  const pesoNum = parseFloat(peso);
  const tallaNum = parseFloat(talla);
  const imc = (pesoNum / Math.pow(tallaNum, 2)).toFixed(1);
  
  // Generar años de padecimiento para cada enfermedad crónica
  const anosPadecimiento = {};
  enfermedadesCronicas.forEach(enfermedad => {
    anosPadecimiento[enfermedad] = Math.floor(Math.random() * 10) + 1; // 1-10 años
  });

  // Determinar tratamiento actual
  const tratamientoActual = tieneMedicamentos ? 'con_medicamento' : 'sin_medicamento';
  
  // Generar diagnóstico agregado (texto descriptivo)
  const diagnosticosAgregados = [
    'Paciente con diagnóstico de ' + diagnostico + '. Estado general estable.',
    'Diagnóstico principal: ' + diagnostico + '. Requiere seguimiento médico.',
    'Paciente presenta ' + diagnostico + '. Control adecuado con tratamiento.',
    diagnostico + ' diagnosticado. Evolución favorable.',
    'Diagnóstico: ' + diagnostico + '. Paciente en tratamiento activo.'
  ];
  const diagnosticoAgregado = diagnosticosAgregados[Math.floor(Math.random() * diagnosticosAgregados.length)];

  // Generar diagnóstico basal (puede ser basal o agregado posterior)
  const esBasal = Math.random() > 0.5; // 50% probabilidad de ser basal
  const añoDiagnostico = new Date().getFullYear() - Math.floor(Math.random() * 5); // Últimos 5 años

  // Generar edad para medición (20-80 años)
  const edadMedicion = Math.floor(Math.random() * 61) + 20; // 20-80 años

  return {
    motivo_consulta: motivo,
    sintomas: 'Síntomas reportados por el paciente',
    diagnostico: diagnostico,
    diagnostico_agregado: diagnosticoAgregado, // ✅ Campo agregado
    diagnostico_basal: { // ✅ Campo agregado
      es_basal: esBasal,
      año_diagnostico: añoDiagnostico.toString(),
      es_agregado_posterior: !esBasal
    },
    tratamiento_actual: tratamientoActual, // ✅ Campo agregado ('con_medicamento' | 'sin_medicamento')
    recibe_tratamiento_no_farmacologico: Math.random() > 0.5, // ✅ Campo agregado
    recibe_tratamiento_farmacologico: tieneMedicamentos, // ✅ Campo agregado
    tratamiento: tratamiento,
    observaciones: 'Paciente en buen estado general, se recomienda seguimiento',
    fecha: new Date().toISOString().split('T')[0],
    idDoctor: idDoctor ? idDoctor.toString() : '',
    enfermedades_cronicas: enfermedadesCronicas,
    anos_padecimiento: anosPadecimiento,
    medicamentos: medicamentos,
    tratamiento_sin_medicamento: !tieneMedicamentos ? 'Reposo y dieta balanceada' : '',
    alergias: alergia,
    antecedentes_familiares: antecedente,
    signos_vitales: { // ✅ Estructura completa de signos vitales
      peso_kg: peso,
      talla_m: talla,
      imc: imc,
      medida_cintura_cm: Math.floor(Math.random() * 20 + 75).toString(), // 75-95 cm
      presion_sistolica: Math.floor(Math.random() * 40 + 100).toString(), // 100-140
      presion_diastolica: Math.floor(Math.random() * 20 + 70).toString(), // 70-90
      glucosa_mg_dl: Math.floor(Math.random() * 40 + 80).toString(), // 80-120 mg/dL
      colesterol_mg_dl: Math.floor(Math.random() * 60 + 150).toString(), // 150-210 mg/dL
      colesterol_ldl: Math.floor(Math.random() * 50 + 100).toString(), // 100-150 mg/dL
      colesterol_hdl: Math.floor(Math.random() * 20 + 40).toString(), // 40-60 mg/dL
      trigliceridos_mg_dl: Math.floor(Math.random() * 80 + 80).toString(), // 80-160 mg/dL
      hba1c_porcentaje: (Math.random() * 3 + 5).toFixed(1), // 5.0-8.0%
      edad_paciente_en_medicion: edadMedicion.toString(),
      observaciones: 'Signos vitales dentro de parámetros normales'
    },
    vacunas: []
  };
};

/**
 * Genera un PIN aleatorio de 4 dígitos
 */
export const generarPIN = () => {
  return Math.floor(Math.random() * 9000) + 1000; // 1000-9999
};

/**
 * Genera datos completos de paciente para testing
 */
export const generarDatosCompletosPaciente = (idDoctor, idModulo) => {
  const nombreCompleto = generarNombreCompleto();
  const email = generarEmail(nombreCompleto.nombre, nombreCompleto.apellidoPaterno);
  const pin = generarPIN().toString();
  const sexo = generarSexo();
  const fechaNacimiento = generarFechaNacimiento();
  
  // Importar estados de México para seleccionar uno aleatorio
  // Nota: En React Native, necesitamos importar dinámicamente o pasar como parámetro
  const estadosMexico = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];
  
  // Seleccionar estado aleatorio
  const estadoSeleccionado = estadosMexico[Math.floor(Math.random() * estadosMexico.length)];
  
  // Generar localidad basada en el estado (municipio/ciudad)
  const municipiosGenericos = [
    'Centro', 'Norte', 'Sur', 'Oriente', 'Poniente', 'Industrial', 'Residencial',
    'Comercial', 'Educativo', 'Médico', 'Principal', 'Central', 'Libertad', 'Independencia'
  ];
  const localidadSeleccionada = municipiosGenericos[Math.floor(Math.random() * municipiosGenericos.length)];
  
  return {
    // Datos de PIN
    pin: pin,
    confirmPin: pin,
    deviceId: `TEST_${Date.now()}`,
    
    // Datos del paciente
    nombre: nombreCompleto.nombre,
    apellidoPaterno: nombreCompleto.apellidoPaterno,
    apellidoMaterno: nombreCompleto.apellidoMaterno,
    fechaNacimiento: fechaNacimiento,
    curp: generarCURP(fechaNacimiento, sexo),
    institucionSalud: generarInstitucionSalud(),
    sexo: sexo,
    direccion: generarDireccion(),
    estado: estadoSeleccionado, // ✅ Campo agregado
    localidad: localidadSeleccionada, // ✅ Campo mejorado
    numeroCelular: generarTelefono(),
    email: email,
    idModulo: idModulo ? idModulo.toString() : '', // ✅ Asegurar que sea string
    activo: true,
    
    // Red de apoyo
    redApoyo: [
      generarRedApoyo(),
      generarRedApoyo()
    ],
    
    // Primera consulta
    primeraConsulta: generarPrimeraConsulta(idDoctor)
  };
};

/**
 * Genera datos de doctor aleatorios
 */
export const generarDatosDoctor = (idModulo = null) => {
  const nombreCompleto = generarNombreCompleto();
  const email = generarEmail(nombreCompleto.nombre, nombreCompleto.apellidoPaterno);
  
  const institucionesHospitalarias = [
    'Hospital General', 'Clínica Privada', 'Centro de Salud', 'Hospital Regional',
    'Instituto Nacional de Salud', 'Hospital Universitario', 'Centro Médico Especializado'
  ];
  
  const gradosEstudio = [
    'Licenciatura', 'Especialidad', 'Maestría', 'Doctorado'
  ];
  
  return {
    // Datos de usuario (paso 1)
    email: email,
    password: 'Doctor123!',
    confirmPassword: 'Doctor123!',
    
    // Datos del doctor (paso 2)
    nombre: nombreCompleto.nombre,
    apellidoPaterno: nombreCompleto.apellidoPaterno,
    apellidoMaterno: nombreCompleto.apellidoMaterno,
    telefono: generarTelefono(),
    institucionHospitalaria: institucionesHospitalarias[Math.floor(Math.random() * institucionesHospitalarias.length)],
    gradoEstudio: gradosEstudio[Math.floor(Math.random() * gradosEstudio.length)],
    anosServicio: (Math.floor(Math.random() * 30) + 1).toString(), // 1-30 años
    idModulo: idModulo ? idModulo.toString() : '',
    activo: true
  };
};

/**
 * Genera datos de signos vitales aleatorios
 */
export const generarDatosSignosVitales = (idCita = null) => {
  const peso = (Math.random() * 40 + 50).toFixed(1); // 50-90 kg
  const talla = (Math.random() * 0.4 + 1.5).toFixed(2); // 1.50-1.90 m
  const presionSistolica = Math.floor(Math.random() * 40 + 100); // 100-140
  const presionDiastolica = Math.floor(Math.random() * 20 + 70); // 70-90
  
  const observaciones = [
    'Signos vitales dentro de parámetros normales',
    'Paciente en buen estado general',
    'Se recomienda seguimiento',
    'Controlar presión arterial',
    'Valores normales'
  ];
  
  return {
    id_cita: idCita ? idCita.toString() : '',
    peso_kg: peso,
    talla_m: talla,
    medida_cintura_cm: Math.floor(Math.random() * 20 + 75).toString(), // 75-95 cm
    presion_sistolica: presionSistolica.toString(),
    presion_diastolica: presionDiastolica.toString(),
    glucosa_mg_dl: Math.floor(Math.random() * 40 + 80).toString(), // 80-120 mg/dL
    colesterol_mg_dl: Math.floor(Math.random() * 60 + 150).toString(), // 150-210 mg/dL
    trigliceridos_mg_dl: Math.floor(Math.random() * 80 + 80).toString(), // 80-160 mg/dL
    observaciones: observaciones[Math.floor(Math.random() * observaciones.length)]
  };
};

/**
 * Genera datos de diagnóstico aleatorios
 */
export const generarDatosDiagnostico = (idCita = null) => {
  const diagnosticos = [
    'Control de rutina - Paciente estable',
    'Hipertensión arterial controlada',
    'Diabetes mellitus tipo 2 en control',
    'Resfriado común - Recomendado reposo',
    'Gastritis leve - Tratamiento con omeprazol',
    'Migraña episódica - Manejo sintomático',
    'Ansiedad leve - Seguimiento psicológico',
    'Dolor de espalda baja - Ejercicios recomendados',
    'Anemia leve - Suplemento de hierro',
    'Infección de vías urinarias - Antibiótico prescrito'
  ];
  
  return {
    id_cita: idCita ? idCita.toString() : '',
    descripcion: diagnosticos[Math.floor(Math.random() * diagnosticos.length)]
  };
};

/**
 * Genera datos de cita aleatorios
 */
export const generarDatosCita = (idDoctor = null, idPaciente = null) => {
  const motivos = [
    'Control de rutina',
    'Control de diabetes',
    'Control de hipertensión',
    'Consulta por síntomas nuevos',
    'Seguimiento de tratamiento',
    'Consulta preventiva',
    'Revisión de estudios',
    'Consulta de urgencia'
  ];
  
  const observaciones = [
    'Paciente puntual',
    'Consulta programada',
    'Seguimiento de tratamiento previo',
    'Revisión de resultados de laboratorio',
    'Consulta preventiva anual'
  ];
  
  // Fecha futura (entre hoy y 30 días)
  const hoy = new Date();
  const diasFuturo = Math.floor(Math.random() * 30) + 1;
  const fechaCita = new Date(hoy);
  fechaCita.setDate(hoy.getDate() + diasFuturo);
  
  // Hora aleatoria entre 8:00 y 18:00
  const hora = Math.floor(Math.random() * 10) + 8; // 8-17
  const minutos = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  
  const fechaHora = `${fechaCita.toISOString().split('T')[0]}T${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:00`;
  
  return {
    id_doctor: idDoctor ? idDoctor.toString() : '',
    fecha_cita: fechaHora,
    motivo: motivos[Math.floor(Math.random() * motivos.length)],
    observaciones: observaciones[Math.floor(Math.random() * observaciones.length)],
    es_primera_consulta: Math.random() > 0.7 // 30% probabilidad de ser primera consulta
  };
};

export default {
  generarNombre,
  generarApellido,
  generarNombreCompleto,
  generarCURP,
  generarFechaNacimiento,
  generarTelefono,
  generarEmail,
  generarDireccion,
  generarLocalidad,
  generarInstitucionSalud,
  generarSexo,
  generarRedApoyo,
  generarPrimeraConsulta,
  generarPIN,
  generarDatosCompletosPaciente,
  generarDatosDoctor,
  generarDatosSignosVitales,
  generarDatosDiagnostico,
  generarDatosCita
};

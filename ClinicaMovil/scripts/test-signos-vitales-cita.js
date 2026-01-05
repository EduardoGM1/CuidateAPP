// Test automático: crear signos vitales vinculados a cita por CLI
// Uso:
//   node test-signos-vitales-cita.js --paciente=4 --cita=10 --token=XXX

const axios = require('axios');
const args = process.argv.slice(2).reduce((map, arg) => {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=');
    map[k] = v;
  }
  return map;
}, {});

function showHelp() {
  console.log('USO: node test-signos-vitales-cita.js --paciente=ID --cita=ID [--token=XXX]');
}

const PACIENTE_ID = args.paciente;
const CITA_ID = args.cita;
const AUTH_TOKEN = args.token || '';
const API_BASE_URL = 'http://localhost:3000'; // O ajusta aquí si tu backend está en otro puerto

if (!PACIENTE_ID || !CITA_ID) {
  showHelp();
  process.exit(1);
}

async function testSignosVitalesConCita() {
  try {
    const payload = {
      peso_kg: 70 + Math.random(),
      talla_m: 1.7 + Math.random() * 0.1,
      presion_sistolica: 110 + Math.floor(Math.random() * 15),
      presion_diastolica: 70 + Math.floor(Math.random() * 15),
      id_cita: Number(CITA_ID),
      observaciones: 'Prueba CLI automatizada'
    };

    const headers = {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
    };

    const resp = await axios.post(
      `${API_BASE_URL}/api/pacientes/${PACIENTE_ID}/signos-vitales`,
      payload,
      { headers }
    );

    console.log(`\n[✔] Solicitud enviada: paciente_id=${PACIENTE_ID}, cita_id=${CITA_ID}`);
    console.log('Payload:', payload);
    console.log('Status:', resp.status);
    console.log('Success en backend:', resp.data?.success);
    console.log('Respuesta:', resp.data);

    if (resp.data?.data?.id_cita == CITA_ID) {
      console.log('✅ Test PASADO: Signos vitales correctamente vinculados a la cita.');
    } else {
      console.error('❌ Test FALLÓ: El campo id_cita no coincide.');
    }
  } catch (err) {
    if (err.response) {
      console.error('\n❌ Error en respuesta:', err.response.status, err.response.data);
    } else {
      console.error('\n❌ Error haciendo request:', err.message);
    }
    process.exit(2);
  }
}

testSignosVitalesConCita();

/**
 * Verificación rápida: controlador updatePacientePlanMedicacion y ruta PUT registrada.
 * Ejecutar: node scripts/verificar-put-planes-medicacion.js
 */
import { updatePacientePlanMedicacion } from '../controllers/pacienteMedicalData.js';
import pacienteMedicalDataRouter from '../routes/pacienteMedicalData.js';

function run() {
  let ok = true;

  if (typeof updatePacientePlanMedicacion !== 'function') {
    console.error('FAIL: updatePacientePlanMedicacion no es una función');
    ok = false;
  } else {
    console.log('OK: updatePacientePlanMedicacion existe');
  }

  const putRoutes = pacienteMedicalDataRouter.stack
    .filter(layer => layer.route && layer.route.methods && layer.route.methods.put)
    .map(layer => layer.route.path);
  const hasPutPlanes = putRoutes.some(path => path.includes('planes-medicacion'));

  if (!hasPutPlanes) {
    console.error('FAIL: No hay ruta PUT que contenga "planes-medicacion". Rutas PUT:', putRoutes);
    ok = false;
  } else {
    console.log('OK: Ruta PUT planes-medicacion registrada');
  }

  process.exit(ok ? 0 : 1);
}

run();

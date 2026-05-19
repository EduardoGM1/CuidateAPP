/**
 * Datos de prueba para el formulario SignosVitalesForm (paridad con UI).
 * @param {string} [suffix] - Sufijo único (p. ej. timestamp) en observaciones
 */
export function buildSignosVitalesTestData(suffix = String(Date.now())) {
  return {
    peso_kg: '72',
    talla_m: '1.70',
    medida_cintura_cm: '90',
    presion_sistolica: '120',
    presion_diastolica: '80',
    glucosa_mg_dl: '98',
    colesterol_mg_dl: '180',
    colesterol_ldl: '100',
    colesterol_hdl: '55',
    trigliceridos_mg_dl: '140',
    hba1c_porcentaje: '6.1',
    observaciones: `QA E2E signos vitales ${suffix}`,
  };
}

/**
 * Rellena el modal "Nuevo registro de signos vitales".
 * @param {import('@playwright/test').Page} page
 * @param {ReturnType<typeof buildSignosVitalesTestData>} data
 */
export async function fillSignosVitalesForm(page, data) {
  const dialog = page.getByRole('dialog').filter({ hasText: /registro de signos vitales/i });
  await dialog.getByPlaceholder('Peso (kg)').fill(data.peso_kg);
  await dialog.getByPlaceholder('Talla (m)').fill(data.talla_m);
  await dialog.getByPlaceholder('Cintura (cm)').fill(data.medida_cintura_cm);
  await dialog.getByPlaceholder('PA sist.').fill(data.presion_sistolica);
  await dialog.getByPlaceholder('PA diast.').fill(data.presion_diastolica);
  await dialog.getByPlaceholder(/glucosa/i).fill(data.glucosa_mg_dl);
  await dialog.getByPlaceholder(/colesterol total/i).fill(data.colesterol_mg_dl);
  await dialog.getByPlaceholder(/^LDL$/i).fill(data.colesterol_ldl);
  await dialog.getByPlaceholder(/^HDL$/i).fill(data.colesterol_hdl);
  await dialog.getByPlaceholder(/triglicéridos/i).fill(data.trigliceridos_mg_dl);
  await dialog.getByPlaceholder(/hba1c/i).fill(data.hba1c_porcentaje);
  await dialog.getByPlaceholder(/observaciones/i).fill(data.observaciones);
}

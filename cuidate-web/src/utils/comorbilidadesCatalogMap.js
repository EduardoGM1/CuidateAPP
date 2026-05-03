/**
 * Busca en el catálogo API la primera comorbilidad cuyo nombre incluya la keyword.
 * @param {Array<{ nombre_comorbilidad?: string, nombre?: string, id_comorbilidad?: number, id?: number }>} catalog
 * @param {string} keyword
 * @returns {number|null}
 */
export function findComorbilidadIdByKeyword(catalog, keyword) {
  if (!Array.isArray(catalog) || !keyword) return null;
  const k = String(keyword).toLowerCase();
  const item = catalog.find((c) => {
    const nombre = String(c.nombre_comorbilidad || c.nombre || '').toLowerCase();
    return nombre.includes(k);
  });
  return item?.id_comorbilidad ?? item?.id ?? null;
}

/**
 * Mapea cada clave de enfermedad crónica del formulario al id_comorbilidad del catálogo.
 * @param {Array<{ nombre_comorbilidad?: string, nombre?: string, id_comorbilidad?: number, id?: number }>} catalogList
 * @returns {Record<string, number|null>}
 */
export function buildComorbilidadIdsFromCatalog(catalogList) {
  const arr = Array.isArray(catalogList) ? catalogList : [];
  return {
    diabetes: findComorbilidadIdByKeyword(arr, 'diab'),
    hipertension: findComorbilidadIdByKeyword(arr, 'hipertens'),
    obesidad: findComorbilidadIdByKeyword(arr, 'obes'),
    dislipidemia: findComorbilidadIdByKeyword(arr, 'dislipid') || findComorbilidadIdByKeyword(arr, 'colesterol'),
    enfermedad_renal_cronica: findComorbilidadIdByKeyword(arr, 'renal') || findComorbilidadIdByKeyword(arr, 'erc'),
    epoc: findComorbilidadIdByKeyword(arr, 'epoc'),
    enfermedad_cardiovascular:
      findComorbilidadIdByKeyword(arr, 'cardiovascular') || findComorbilidadIdByKeyword(arr, 'corazón'),
    tuberculosis: findComorbilidadIdByKeyword(arr, 'tubercul'),
    asma: findComorbilidadIdByKeyword(arr, 'asma'),
    tabaquismo: findComorbilidadIdByKeyword(arr, 'tabaqu'),
    otro: null,
  };
}

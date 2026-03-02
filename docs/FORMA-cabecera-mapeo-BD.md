# Mapeo cabecera FORMA → base de datos

En el Excel FORMA (Formato de Registro Mensual GAM), la cabecera de dos filas se rellena así:

## Qué se muestra en el apartado de cabecera

| Campo en el Excel | Origen en la BD | Tabla / relación | Fallback si está vacío |
|-------------------|-----------------|------------------|------------------------|
| **Institución** | `institucion_salud` del paciente | `pacientes.institucion_salud` | 1) Primer doctor asignado: `institucion_hospitalaria` (tabla `doctores`). 2) Variable de entorno `FORMA_INSTITUCION`. 3) Texto "Institución". |
| **Entidad Federativa** | `estado` del paciente | `pacientes.estado` | 1) `FORMA_ENTIDAD`. 2) "Entidad Federativa". |
| **Jurisdicción** | `estado` del paciente | `pacientes.estado` (mismo que entidad) | 1) `FORMA_JURISDICCION` o `FORMA_ENTIDAD`. 2) "Jurisdicción". |
| **Municipio** | `localidad` del paciente | `pacientes.localidad` | 1) `FORMA_MUNICIPIO`. 2) "Municipio". |
| **Unidad Médica** | `institucion_salud` del paciente | `pacientes.institucion_salud` | Mismo que Institución (doctor → env → "Unidad Médica"). |
| **Nombre del Grupo de Ayuda Mutua EC** | Nombre del módulo del paciente | `modulos.nombre_modulo` (por `pacientes.id_modulo`) | 1) `FORMA_NOMBRE_GAM`. 2) "Nombre del Grupo de Ayuda Mutua EC". |
| **Etapa** | *(no existe en BD)* | — | Solo `FORMA_ETAPA` o "Etapa". |
| **Mes y año a reportar** | Parámetros de la petición | `mes` y `anio` del query | Calculado en backend. |
| **Nombre Coordinador del GAM EC** | *(no existe en BD)* | — | Solo `FORMA_COORDINADOR` o "Nombre Coordinador del GAM EC". |

## Dónde se usa en código

- **Backend:** `api-clinica/services/reportService.js` → `getFormaData()`. Ahí se hace el `findByPk` del paciente con `include` de `Modulo` y `Doctor` (alias `Doctores`), se leen `estado`, `localidad`, `institucion_salud`, `Modulo.nombre_modulo` y `Doctores[0].institucion_hospitalaria`, y se arma el objeto `cabecera`.
- **Frontend Excel:** `cuidate-web/src/utils/formaExcelUtils.js` → `buildFormaExcel(data)`. Recibe `data.cabecera` y escribe en el libro: `cabecera.institucion`, `cabecera.entidad`, `cabecera.jurisdiccion`, `cabecera.municipio`, `cabecera.unidadMedica`, `cabecera.nombreGAM`, `cabecera.etapa`, `cabecera.mesNombre`/`cabecera.anio`, `cabecera.coordinador`.

## Si los datos no se ven en el Excel

1. **Comprobar en BD** que el paciente tenga datos:
   - `pacientes.estado`
   - `pacientes.localidad`
   - `pacientes.institucion_salud`
   - `pacientes.id_modulo` (y que exista `modulos.nombre_modulo`).
2. Si no tiene institución, que tenga al menos un doctor asignado (`doctor_paciente`) y que ese doctor tenga `doctores.institucion_hospitalaria`.
3. **Log de depuración:** en el backend está un `logger.debug('FORMA cabecera (origen BD/env)', ...)`. Con nivel de log `debug` verás qué valores se leen de la BD y qué se envía en `cabecera`.
4. **Red:** en DevTools → pestaña Red, al descargar el FORMA revisar la respuesta del endpoint `GET .../api/reportes/forma/:idPaciente?mes=...&anio=...` y comprobar que `cabecera` trae los textos esperados (no solo "Institución", "Entidad Federativa", etc.).

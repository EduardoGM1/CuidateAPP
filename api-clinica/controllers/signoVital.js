import { SignoVital, Paciente, Comorbilidad, PacienteComorbilidad } from '../models/associations.js';
import alertService from '../services/alertService.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export const getSignosVitales = async (req, res) => {
  try {
    const signos = await SignoVital.findAll({
      include: [{ model: Paciente, attributes: ['nombre', 'apellido_paterno'] }]
    });
    res.json(signos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSignoVital = async (req, res) => {
  try {
    const signo = await SignoVital.findByPk(req.params.id, {
      include: [{ model: Paciente, attributes: ['nombre', 'apellido_paterno'] }]
    });
    if (!signo) {
      return res.status(404).json({ error: 'Signo vital no encontrado' });
    }
    res.json(signo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSignosByPaciente = async (req, res) => {
  try {
    const signos = await SignoVital.findAll({
      where: { id_paciente: req.params.pacienteId },
      order: [['fecha_medicion', 'DESC']]
    });
    res.json(signos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verifica si un paciente tiene diagnóstico de Hipercolesterolemia o Dislipidemia
 * @param {number} pacienteId - ID del paciente
 * @returns {Promise<boolean>} - true si tiene el diagnóstico, false en caso contrario
 */
const tieneHipercolesterolemia = async (pacienteId) => {
  try {
    const comorbilidades = await PacienteComorbilidad.findAll({
      where: { id_paciente: pacienteId },
      include: [{
        model: Comorbilidad,
        attributes: ['id_comorbilidad', 'nombre_comorbilidad']
      }]
    });

    if (!comorbilidades || comorbilidades.length === 0) {
      return false;
    }

    // Buscar comorbilidades relacionadas con colesterol
    const nombresRelevantes = ['Dislipidemia', 'Hipercolesterolemia', 'dislipidemia', 'hipercolesterolemia'];
    
    return comorbilidades.some(pc => {
      const nombre = pc.Comorbilidad?.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  } catch (error) {
    logger.error('Error verificando diagnóstico de hipercolesterolemia:', error);
    return false;
  }
};

/**
 * Valida los valores de colesterol LDL y HDL
 * @param {number|null|undefined} colesterol_ldl - Valor de LDL
 * @param {number|null|undefined} colesterol_hdl - Valor de HDL
 * @returns {string|null} - Mensaje de error si hay problema, null si está bien
 */
const validarColesterol = (colesterol_ldl, colesterol_hdl) => {
  // Validar LDL
  if (colesterol_ldl !== undefined && colesterol_ldl !== null && colesterol_ldl !== '') {
    const ldl = parseFloat(colesterol_ldl);
    if (isNaN(ldl) || ldl < 0 || ldl > 500) {
      return 'Colesterol LDL debe estar entre 0 y 500 mg/dL';
    }
  }

  // Validar HDL
  if (colesterol_hdl !== undefined && colesterol_hdl !== null && colesterol_hdl !== '') {
    const hdl = parseFloat(colesterol_hdl);
    if (isNaN(hdl) || hdl < 0 || hdl > 200) {
      return 'Colesterol HDL debe estar entre 0 y 200 mg/dL';
    }
  }

  return null;
};

export const createSignoVital = async (req, res) => {
  try {
    const { id_paciente, colesterol_ldl, colesterol_hdl, ...rest } = req.body;

    // ✅ Validar colesterol LDL y HDL
    if (colesterol_ldl !== undefined || colesterol_hdl !== undefined) {
      // Verificar que el paciente tenga diagnóstico de Hipercolesterolemia/Dislipidemia
      const hasHipercolesterolemia = await tieneHipercolesterolemia(id_paciente);
      if (!hasHipercolesterolemia) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar Colesterol LDL/HDL sin diagnóstico de Hipercolesterolemia o Dislipidemia.'
        });
      }

      // Validar rangos
      const validationError = validarColesterol(colesterol_ldl, colesterol_hdl);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }
    }

    // Sanitizar valores numéricos
    const dataToCreate = {
      ...rest,
      id_paciente,
      colesterol_ldl: colesterol_ldl !== undefined && colesterol_ldl !== null && colesterol_ldl !== '' 
        ? parseFloat(colesterol_ldl) 
        : null,
      colesterol_hdl: colesterol_hdl !== undefined && colesterol_hdl !== null && colesterol_hdl !== '' 
        ? parseFloat(colesterol_hdl) 
        : null
    };

    const signo = await SignoVital.create(dataToCreate);
    
    // ✅ Verificar alertas automáticas después de crear signo vital
    // Esto se ejecuta de forma asíncrona para no bloquear la respuesta
    if (id_paciente) {
      alertService.verificarSignosVitales(signo.toJSON(), id_paciente)
        .then((resultado) => {
          if (resultado.tieneAlertas) {
            logger.info(`Alertas generadas para paciente ${id_paciente}:`, {
              cantidad: resultado.alertas.length,
              tipos: resultado.alertas.map(a => a.tipo)
            });
          }
        })
        .catch((error) => {
          // No fallar la creación si hay error en alertas
          logger.error('Error verificando alertas (no crítico):', error);
        });
    }
    
    res.status(201).json({
      success: true,
      ...signo.toJSON()
    });
  } catch (error) {
    logger.error('Error creando signo vital:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al crear signo vital'
    });
  }
};

export const updateSignoVital = async (req, res) => {
  try {
    // Obtener el signo vital existente para verificar el paciente
    const signoExistente = await SignoVital.findByPk(req.params.id);
    if (!signoExistente) {
      return res.status(404).json({
        success: false,
        error: 'Signo vital no encontrado'
      });
    }

    const { colesterol_ldl, colesterol_hdl, ...rest } = req.body;
    const pacienteId = req.body.id_paciente || signoExistente.id_paciente;

    // ✅ Validar colesterol LDL y HDL si se están actualizando
    if (colesterol_ldl !== undefined || colesterol_hdl !== undefined) {
      // Verificar que el paciente tenga diagnóstico de Hipercolesterolemia/Dislipidemia
      const hasHipercolesterolemia = await tieneHipercolesterolemia(pacienteId);
      if (!hasHipercolesterolemia) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar Colesterol LDL/HDL sin diagnóstico de Hipercolesterolemia o Dislipidemia.'
        });
      }

      // Validar rangos
      const validationError = validarColesterol(colesterol_ldl, colesterol_hdl);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }
    }

    // Sanitizar valores numéricos
    const dataToUpdate = {
      ...rest
    };

    if (colesterol_ldl !== undefined) {
      dataToUpdate.colesterol_ldl = colesterol_ldl !== null && colesterol_ldl !== '' 
        ? parseFloat(colesterol_ldl) 
        : null;
    }

    if (colesterol_hdl !== undefined) {
      dataToUpdate.colesterol_hdl = colesterol_hdl !== null && colesterol_hdl !== '' 
        ? parseFloat(colesterol_hdl) 
        : null;
    }

    const [updated] = await SignoVital.update(dataToUpdate, {
      where: { id_signo: req.params.id }
    });
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Signo vital no encontrado'
      });
    }

    const signo = await SignoVital.findByPk(req.params.id);
    
    // ✅ Verificar alertas automáticas después de actualizar signo vital
    if (signo && signo.id_paciente) {
      alertService.verificarSignosVitales(signo.toJSON(), signo.id_paciente)
        .then((resultado) => {
          if (resultado.tieneAlertas) {
            logger.info(`Alertas generadas para paciente ${signo.id_paciente} (actualización):`, {
              cantidad: resultado.alertas.length,
              tipos: resultado.alertas.map(a => a.tipo)
            });
          }
        })
        .catch((error) => {
          logger.error('Error verificando alertas (no crítico):', error);
        });
    }
    
    res.json({
      success: true,
      ...signo.toJSON()
    });
  } catch (error) {
    logger.error('Error actualizando signo vital:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al actualizar signo vital'
    });
  }
};

export const deleteSignoVital = async (req, res) => {
  try {
    const deleted = await SignoVital.destroy({
      where: { id_signo: req.params.id }
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Signo vital no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
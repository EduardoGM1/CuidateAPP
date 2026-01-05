import { Paciente, Doctor, Cita, SignoVital, Diagnostico, PlanMedicacion, MensajeChat, Usuario, Modulo } from '../models/index.js';
import { SistemaAuditoria } from '../models/associations.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

export class DashboardRepository {
  
  // =====================================================
  // CONSULTAS PARA ADMINISTRADOR
  // =====================================================
  
  async getTotalPacientes() {
    return await Paciente.count({
      where: { activo: true }
    });
  }

  async getTotalDoctores() {
    return await Doctor.count({
      where: { activo: true }
    });
  }

  async getCitasHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const citas = await Cita.findAll({
      where: {
        fecha_cita: {
          [Op.gte]: hoy,
          [Op.lt]: mañana
        }
      }
    });

    // Contar citas atendidas: usar campo estado si existe, fallback a asistencia para compatibilidad
    const completadas = citas.filter(cita => {
      if (cita.estado) {
        return cita.estado === 'atendida';
      }
      // Fallback para compatibilidad con datos antiguos
      return cita.asistencia === true;
    }).length;
    
    const pendientes = citas.length - completadas;
    const porcentajeAsistencia = citas.length > 0 
      ? Math.round((completadas / citas.length) * 100) 
      : 0;

    return {
      total: citas.length,
      completadas,
      pendientes,
      porcentajeAsistencia
    };
  }

  async getCitasUltimos7Dias() {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999); // Fin del día actual
    const sieteDiasAtras = new Date(hoy);
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 6); // 7 días incluyendo hoy
    sieteDiasAtras.setHours(0, 0, 0, 0); // Inicio del día

    // logger.info('Obteniendo citas de los últimos 7 días', {
    //   desde: sieteDiasAtras.toISOString(),
    //   hasta: hoy.toISOString()
    // });

    // Usar Sequelize ORM en lugar de SQL directo para evitar problemas con sql_mode
    const citas = await Cita.findAll({
      where: {
        fecha_cita: {
          [Op.gte]: sieteDiasAtras,
          [Op.lte]: hoy
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('fecha_cita')), 'fecha'],
        [sequelize.fn('COUNT', sequelize.col('id_cita')), 'citas']
      ],
      group: [sequelize.fn('DATE', sequelize.col('fecha_cita'))],
      order: [[sequelize.fn('DATE', sequelize.col('fecha_cita')), 'ASC']],
      raw: true
    });

    // Crear un mapa de fechas con citas
    const citasPorFecha = new Map();
    citas.forEach(item => {
      const fecha = new Date(item.fecha);
      const fechaKey = fecha.toISOString().split('T')[0];
      citasPorFecha.set(fechaKey, parseInt(item.citas));
    });

    // Generar los últimos 7 días completos
    const resultado = [];
    const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(sieteDiasAtras);
      fecha.setDate(fecha.getDate() + i);
      const fechaKey = fecha.toISOString().split('T')[0];
      const diaSemana = diasSemana[(fecha.getDay() + 6) % 7];
      
      resultado.push({
        dia: diaSemana,
        citas: citasPorFecha.get(fechaKey) || 0,
        fecha: fechaKey
      });
    }

      // logger.info('Citas de los últimos 7 días procesadas', {
      //   totalDias: resultado.length,
      //   totalCitas: resultado.reduce((sum, item) => sum + item.citas, 0)
      // });

    return resultado;
  }

  async getAlertasAdmin() {
    // Obtener inicio y fin del día actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);

    // Pacientes con valores críticos (solo del día actual) - traer más para poder seleccionar las 5 más recientes
    const valoresCriticos = await sequelize.query(`
      SELECT 
        p.id_paciente,
        p.nombre, p.apellido_paterno,
        sv.glucosa_mg_dl, sv.presion_sistolica, sv.presion_diastolica,
        sv.fecha_medicion,
        CASE 
          WHEN sv.glucosa_mg_dl > 200 THEN 'Glucosa crítica'
          WHEN sv.presion_sistolica > 160 THEN 'Presión sistólica alta'
          WHEN sv.presion_diastolica > 100 THEN 'Presión diastólica alta'
        END as tipo_alerta
      FROM pacientes p
      JOIN signos_vitales sv ON p.id_paciente = sv.id_paciente
      WHERE DATE(sv.fecha_medicion) = CURDATE()
        AND (sv.glucosa_mg_dl > 200 OR sv.presion_sistolica > 160 OR sv.presion_diastolica > 100)
      ORDER BY sv.fecha_medicion DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Citas perdidas (solo del día actual) - traer más para poder seleccionar las 5 más recientes
    const citasPerdidas = await Cita.findAll({
      where: {
        asistencia: false,
        fecha_cita: {
          [Op.between]: [hoy, finDia]
        }
      },
      include: [
        {
          model: Paciente,
          attributes: ['id_paciente', 'nombre', 'apellido_paterno']
        }
      ],
      attributes: ['id_cita', 'fecha_cita', 'motivo', 'id_paciente'],
      limit: 10,
      order: [['fecha_cita', 'DESC']]
    });

    // Alertas de auditoría del día (excluyendo sistema_automatico y login_fallido) - traer más para poder seleccionar las 5 más recientes
    const alertasAuditoria = await SistemaAuditoria.findAll({
      where: {
        fecha_creacion: {
          [Op.between]: [hoy, finDia]
        },
        tipo_accion: {
          [Op.notIn]: ['sistema_automatico', 'login_fallido']
        }
      },
      order: [['fecha_creacion', 'DESC']],
      limit: 10,
      attributes: [
        'id_auditoria',
        'tipo_accion',
        'entidad_afectada',
        'id_entidad',
        'descripcion',
        'fecha_creacion',
        'severidad'
      ]
    });

    // Combinar todas las alertas con su fecha para ordenar
    const todasLasAlertas = [];

    // Agregar valores críticos
    valoresCriticos.forEach(alert => {
      todasLasAlertas.push({
        tipo: 'valor_critico',
        fecha: new Date(alert.fecha_medicion),
        data: alert
      });
    });

    // Agregar citas perdidas
    citasPerdidas.forEach(cita => {
      todasLasAlertas.push({
        tipo: 'cita_perdida',
        fecha: new Date(cita.fecha_cita),
        data: {
          id_cita: cita.id_cita,
          id_paciente: cita.id_paciente || cita.Paciente?.id_paciente,
          paciente: `${cita.Paciente.nombre} ${cita.Paciente.apellido_paterno}`,
          fecha: cita.fecha_cita,
          motivo: cita.motivo
        }
      });
    });

    // Agregar alertas de auditoría
    alertasAuditoria.forEach(alerta => {
      todasLasAlertas.push({
        tipo: 'auditoria',
        fecha: new Date(alerta.fecha_creacion),
        data: {
          id_auditoria: alerta.id_auditoria,
          tipo_accion: alerta.tipo_accion,
          entidad_afectada: alerta.entidad_afectada,
          id_entidad: alerta.id_entidad,
          descripcion: alerta.descripcion,
          fecha_creacion: alerta.fecha_creacion,
          severidad: alerta.severidad
        }
      });
    });

    // Ordenar por fecha (más recientes primero) y tomar solo las 5 más recientes
    todasLasAlertas.sort((a, b) => b.fecha - a.fecha);
    const alertasTop5 = todasLasAlertas.slice(0, 5);

    // Separar de nuevo por tipo para mantener la estructura de respuesta
    const valoresCriticosFinal = [];
    const citasPerdidasFinal = [];
    const alertasAuditoriaFinal = [];

    alertasTop5.forEach(alerta => {
      if (alerta.tipo === 'valor_critico') {
        valoresCriticosFinal.push(alerta.data);
      } else if (alerta.tipo === 'cita_perdida') {
        citasPerdidasFinal.push(alerta.data);
      } else if (alerta.tipo === 'auditoria') {
        alertasAuditoriaFinal.push(alerta.data);
      }
    });

    return {
      valoresCriticos: valoresCriticosFinal.map(alert => ({
        ...alert,
        id_paciente: alert.id_paciente || null
      })),
      citasPerdidas: citasPerdidasFinal.map(cita => ({
        ...cita,
        id_cita: cita.id_cita || null,
        id_paciente: cita.id_paciente || null
      })),
      alertasAuditoria: alertasAuditoriaFinal
    };
  }

  async getMetricasAvanzadas() {
    // Distribución de comorbilidades
    const comorbilidades = await sequelize.query(`
      SELECT 
        c.nombre_comorbilidad,
        COUNT(pc.id_paciente) as pacientes_afectados,
        ROUND((COUNT(pc.id_paciente) * 100.0 / (SELECT COUNT(*) FROM pacientes WHERE activo = 1)), 2) as porcentaje
      FROM comorbilidades c
      JOIN paciente_comorbilidad pc ON c.id_comorbilidad = pc.id_comorbilidad
      GROUP BY c.id_comorbilidad, c.nombre_comorbilidad
      ORDER BY pacientes_afectados DESC
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Medicamentos más prescritos
    const medicamentos = await sequelize.query(`
      SELECT 
        m.nombre_medicamento,
        COUNT(pd.id_detalle) as veces_prescrito,
        COUNT(DISTINCT pm.id_paciente) as pacientes_diferentes
      FROM medicamentos m
      JOIN plan_detalle pd ON m.id_medicamento = pd.id_medicamento
      JOIN planes_medicacion pm ON pd.id_plan = pm.id_plan
      WHERE pm.activo = 1
      GROUP BY m.id_medicamento, m.nombre_medicamento
      ORDER BY veces_prescrito DESC
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    return { comorbilidades, medicamentos };
  }

  // =====================================================
  // NUEVOS MÉTODOS PARA GRÁFICOS ADICIONALES
  // =====================================================

  async getCitasPorEstado() {
    try {
      // logger.info('Obteniendo citas por estado');

      // Obtener todas las citas para agrupar por estado
      const citas = await Cita.findAll({
        attributes: ['id_cita', 'estado', 'asistencia'],
        raw: true
      });

      const resultado = {
        completadas: 0,
        pendientes: 0,
        canceladas: 0,
        reprogramadas: 0,
        no_asistidas: 0
      };

      citas.forEach(cita => {
        // Usar campo estado si existe, fallback a asistencia para compatibilidad
        let estadoActual = cita.estado;
        
        if (!estadoActual) {
          // Fallback: calcular estado basado en asistencia
          if (cita.asistencia === true) {
            estadoActual = 'atendida';
          } else if (cita.asistencia === false) {
            estadoActual = 'no_asistida';
          } else {
            estadoActual = 'pendiente';
          }
        }

        switch (estadoActual) {
          case 'atendida':
            resultado.completadas++;
            break;
          case 'pendiente':
            resultado.pendientes++;
            break;
          case 'cancelada':
            resultado.canceladas++;
            break;
          case 'reprogramada':
            resultado.reprogramadas++;
            break;
          case 'no_asistida':
            resultado.no_asistidas++;
            break;
        }
      });

      // logger.info('Citas por estado obtenidas', resultado);
      return resultado;
    } catch (error) {
      logger.error('Error obteniendo citas por estado:', error);
      throw error;
    }
  }

  async getDoctoresMasActivos(limit = 5) {
    try {
      // logger.info('Obteniendo doctores más activos');

      const doctores = await Cita.findAll({
        attributes: [
          'id_doctor',
          [sequelize.fn('COUNT', sequelize.col('id_cita')), 'total_citas']
        ],
        include: [
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno', 'grado_estudio'],
            include: [
              {
                model: Usuario,
                attributes: ['email']
              }
            ]
          }
        ],
        group: ['id_doctor', 'Doctor.id_doctor'],
        order: [[sequelize.fn('COUNT', sequelize.col('id_cita')), 'DESC']],
        limit: limit,
        raw: false
      });

      const resultado = doctores
        .filter(cita => cita.Doctor) // Filtrar citas sin doctor
        .map(cita => ({
          id_doctor: cita.id_doctor,
          nombre: `${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}`,
          especialidad: cita.Doctor.grado_estudio || 'No especificada',
          total_citas: parseInt(cita.dataValues.total_citas),
          email: cita.Doctor.Usuario?.email || 'No disponible'
        }));

      // logger.info('Doctores más activos obtenidos', { total: resultado.length });
      return resultado;
    } catch (error) {
      logger.error('Error obteniendo doctores más activos:', error);
      throw error;
    }
  }

  async getPacientesNuevosUltimos7Dias() {
    try {
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      const sieteDiasAtras = new Date(hoy);
      sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 6);
      sieteDiasAtras.setHours(0, 0, 0, 0);

      // logger.info('Obteniendo pacientes nuevos de los últimos 7 días');

      const pacientes = await Paciente.findAll({
        where: {
          fecha_registro: {
            [Op.gte]: sieteDiasAtras,
            [Op.lte]: hoy
          },
          activo: true
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('fecha_registro')), 'fecha'],
          [sequelize.fn('COUNT', sequelize.col('id_paciente')), 'total']
        ],
        group: [sequelize.fn('DATE', sequelize.col('fecha_registro'))],
        order: [[sequelize.fn('DATE', sequelize.col('fecha_registro')), 'ASC']],
        raw: true
      });

      // Crear un mapa de fechas con pacientes
      const pacientesPorFecha = new Map();
      pacientes.forEach(item => {
        const fecha = new Date(item.fecha);
        const fechaKey = fecha.toISOString().split('T')[0];
        pacientesPorFecha.set(fechaKey, parseInt(item.total));
      });

      // Generar los últimos 7 días completos
      const resultado = [];
      const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(sieteDiasAtras);
        fecha.setDate(fecha.getDate() + i);
        const fechaKey = fecha.toISOString().split('T')[0];
        const diaSemana = diasSemana[(fecha.getDay() + 6) % 7];
        
        resultado.push({
          dia: diaSemana,
          pacientes: pacientesPorFecha.get(fechaKey) || 0,
          fecha: fechaKey
        });
      }

      // logger.info('Pacientes nuevos de los últimos 7 días obtenidos', {
      //   totalDias: resultado.length,
      //   totalPacientes: resultado.reduce((sum, item) => sum + item.pacientes, 0)
      // });

      return resultado;
    } catch (error) {
      logger.error('Error obteniendo pacientes nuevos:', error);
      throw error;
    }
  }

  async getTasaAsistencia() {
    try {
      // logger.info('Obteniendo tasa de asistencia');

      // Obtener todas las citas para calcular tasa de asistencia
      const citas = await Cita.findAll({
        raw: true
      });

      // Contar citas atendidas: usar campo estado si existe, fallback a asistencia para compatibilidad
      const citasCompletadas = citas.filter(cita => {
        if (cita.estado) {
          return cita.estado === 'atendida';
        }
        // Fallback para compatibilidad con datos antiguos
        return cita.asistencia === true;
      }).length;

      const totalCitas = citas.length;
      const tasaAsistencia = totalCitas > 0 ? Math.round((citasCompletadas / totalCitas) * 100) : 0;

      const resultado = {
        total_citas: totalCitas,
        citas_completadas: citasCompletadas,
        citas_pendientes: totalCitas - citasCompletadas,
        tasa_asistencia: tasaAsistencia
      };

      // logger.info('Tasa de asistencia obtenida', resultado);
      return resultado;
    } catch (error) {
      logger.error('Error obteniendo tasa de asistencia:', error);
      throw error;
    }
  }

  // =====================================================
  // CONSULTAS PARA DOCTOR
  // =====================================================

  async getCitasDoctorHoy(doctorId) {
    try {
      const ahora = new Date();
      
      // Obtener fecha de hoy en hora local (sin conversión UTC)
      const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
      const mañana = new Date(hoy);
      mañana.setDate(mañana.getDate() + 1);

      // Obtener el offset de zona horaria en minutos
      const timezoneOffset = ahora.getTimezoneOffset(); // minutos de diferencia con UTC
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset <= 0 ? '+' : '-';
      const timezoneStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

      // Formatear fecha en formato YYYY-MM-DD usando hora local (no UTC)
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const hoyStr = formatLocalDate(hoy); // YYYY-MM-DD en hora local

      // Log crítico: Verificar búsqueda de citas
      // logger.info('Buscando citas de hoy', {
      //   doctorId,
      //   hoy: hoy.toISOString(),
      //   mañana: mañana.toISOString(),
      //   ahora: ahora.toISOString(),
      //   hoyStr,
      //   hoyLocal: hoy.toString(),
      //   mañanaLocal: mañana.toString(),
      //   timezoneOffset,
      //   timezoneStr
      // });

      // Usar CONVERT_TZ() de MySQL para convertir fecha_cita a zona horaria local
      // y luego comparar solo la fecha (ignorando la hora)
      // Esto asegura que las citas se filtren por el día local, no por UTC
      const citasHoy = await Cita.findAll({
        where: {
          id_doctor: doctorId,
          [Op.and]: [
            sequelize.where(
              sequelize.fn('DATE', 
                sequelize.fn('CONVERT_TZ', 
                  sequelize.col('fecha_cita'),
                  '+00:00', // UTC
                  timezoneStr // Zona horaria local
                )
              ),
              hoyStr
            ),
            {
              estado: {
                [Op.notIn]: ['cancelada', 'no_asistida'] // Excluir citas canceladas o no asistidas
              }
            }
          ]
        },
        include: [
          {
            model: Paciente,
            attributes: ['nombre', 'apellido_paterno', 'numero_celular']
          }
        ],
        order: [['fecha_cita', 'ASC']]
      });

      // Log crítico: Verificar citas encontradas
      logger.info(`Citas encontradas para hoy - DoctorId: ${doctorId}, Cantidad: ${citasHoy.length}`);

      // Si no hay citas del día actual, obtener la próxima cita disponible
      if (citasHoy.length === 0) {
        const proximaCita = await Cita.findOne({
          where: {
            id_doctor: doctorId,
            fecha_cita: {
              [Op.gte]: ahora // Citas futuras
            },
            estado: {
              [Op.notIn]: ['cancelada', 'no_asistida']
            }
          },
          include: [
            {
              model: Paciente,
              attributes: ['nombre', 'apellido_paterno', 'numero_celular']
            }
          ],
          order: [['fecha_cita', 'ASC']]
        });

        // Si hay una próxima cita, retornarla en un array
        return proximaCita ? [proximaCita] : [];
      }

      return citasHoy;
    } catch (error) {
      logger.error('Error obteniendo citas de hoy del doctor:', error);
      throw error;
    }
  }

  async getPacientesDoctor(doctorId) {
    try {
      return await Paciente.findAll({
        include: [
          {
            model: Doctor,
            through: { attributes: [] },
            where: { id_doctor: doctorId },
            attributes: []
          }
        ],
        where: { activo: true }
      });
    } catch (error) {
      logger.error('Error obteniendo pacientes del doctor:', error);
      throw error;
    }
  }

  async getMensajesPendientesDoctor(doctorId) {
    return await MensajeChat.findAll({
      where: {
        id_doctor: doctorId,
        leido: false
      },
      include: [
        {
          model: Paciente,
          attributes: ['nombre', 'apellido_paterno']
        }
      ],
      order: [['fecha_envio', 'DESC']],
      limit: 10
    });
  }

  async getSignosVitalesPaciente(pacienteId, doctorId) {
    // Verificar que el doctor tiene acceso al paciente
    const tieneAcceso = await sequelize.query(`
      SELECT 1 FROM doctor_paciente 
      WHERE id_doctor = :doctorId AND id_paciente = :pacienteId
    `, {
      replacements: { doctorId, pacienteId },
      type: sequelize.QueryTypes.SELECT
    });

    if (!tieneAcceso.length) {
      throw new Error('No tiene acceso a este paciente');
    }

    return await SignoVital.findAll({
      where: {
        id_paciente: pacienteId,
        fecha_medicion: {
          [Op.gte]: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000) // 3 meses
        }
      },
      order: [['fecha_medicion', 'DESC']],
      limit: 10
    });
  }

  async getPlanesMedicacionActivos(doctorId) {
    return await PlanMedicacion.findAll({
      where: { activo: true },
      include: [
        {
          model: Paciente,
          include: [
            {
              model: Doctor,
              through: { attributes: [] },
              where: { id_doctor: doctorId },
              attributes: []
            }
          ]
        }
      ]
    });
  }

  async getProximasCitasDoctor(doctorId) {
    const hoy = new Date();
    const proximaSemana = new Date(hoy);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    return await Cita.findAll({
      where: {
        id_doctor: doctorId,
        fecha_cita: {
          [Op.gte]: hoy,
          [Op.lte]: proximaSemana
        }
      },
      include: [
        {
          model: Paciente,
          attributes: ['nombre', 'apellido_paterno', 'numero_celular']
        }
      ],
      order: [['fecha_cita', 'ASC']]
    });
  }

  async getCitasDoctorUltimos7Dias(doctorId) {
    try {
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      const sieteDiasAtras = new Date(hoy);
      sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 6);
      sieteDiasAtras.setHours(0, 0, 0, 0);

      // logger.info('Obteniendo citas del doctor de los últimos 7 días', { doctorId });

      const citas = await Cita.findAll({
        where: {
          id_doctor: doctorId,
          fecha_cita: {
            [Op.gte]: sieteDiasAtras,
            [Op.lte]: hoy
          }
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('fecha_cita')), 'fecha'],
          [sequelize.fn('COUNT', sequelize.col('id_cita')), 'citas']
        ],
        group: [sequelize.fn('DATE', sequelize.col('fecha_cita'))],
        order: [[sequelize.fn('DATE', sequelize.col('fecha_cita')), 'ASC']],
        raw: true
      });

      // Crear un mapa de fechas con citas
      const citasPorFecha = new Map();
      citas.forEach(item => {
        const fecha = new Date(item.fecha);
        const fechaKey = fecha.toISOString().split('T')[0];
        citasPorFecha.set(fechaKey, parseInt(item.citas));
      });

      // Generar los últimos 7 días completos
      const resultado = [];
      const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(sieteDiasAtras);
        fecha.setDate(fecha.getDate() + i);
        const fechaKey = fecha.toISOString().split('T')[0];
        const diaSemana = diasSemana[(fecha.getDay() + 6) % 7];
        
        resultado.push({
          dia: diaSemana,
          citas: citasPorFecha.get(fechaKey) || 0,
          fecha: fechaKey
        });
      }

      // logger.info('Citas del doctor de los últimos 7 días procesadas', {
      //   doctorId,
      //   totalDias: resultado.length,
      //   totalCitas: resultado.reduce((sum, item) => sum + item.citas, 0)
      // });

      return resultado;
    } catch (error) {
      logger.error('Error obteniendo citas del doctor de los últimos 7 días:', error);
      throw error;
    }
  }

  async getSignosVitalesCriticosDoctor(doctorId) {
    try {
      // logger.info('Obteniendo signos vitales críticos de pacientes del doctor', { doctorId });

      // Obtener IDs de pacientes asignados al doctor
      const pacientesAsignados = await sequelize.query(`
        SELECT id_paciente FROM doctor_paciente WHERE id_doctor = :doctorId
      `, {
        replacements: { doctorId },
        type: sequelize.QueryTypes.SELECT
      });

      const pacienteIds = pacientesAsignados.map(p => p.id_paciente);

      if (pacienteIds.length === 0) {
        return [];
      }

      // Obtener signos vitales críticos de los últimos 7 días
      const placeholders = pacienteIds.map(() => '?').join(',');
      const signosCriticos = await sequelize.query(`
        SELECT 
          p.id_paciente,
          p.nombre, 
          p.apellido_paterno,
          sv.glucosa_mg_dl, 
          sv.presion_sistolica, 
          sv.presion_diastolica,
          sv.fecha_medicion,
          CASE 
            WHEN sv.glucosa_mg_dl > 200 THEN 'Glucosa crítica'
            WHEN sv.presion_sistolica > 160 THEN 'Presión sistólica alta'
            WHEN sv.presion_diastolica > 100 THEN 'Presión diastólica alta'
            ELSE 'Valor anormal'
          END as tipo_alerta
        FROM pacientes p
        JOIN signos_vitales sv ON p.id_paciente = sv.id_paciente
        WHERE p.id_paciente IN (${placeholders})
          AND sv.fecha_medicion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND (sv.glucosa_mg_dl > 200 OR sv.presion_sistolica > 160 OR sv.presion_diastolica > 100)
        ORDER BY sv.fecha_medicion DESC
        LIMIT 10
      `, {
        replacements: pacienteIds,
        type: sequelize.QueryTypes.SELECT
      });

      // logger.info('Signos vitales críticos obtenidos', {
      //   doctorId,
      //   total: signosCriticos.length
      // });

      return signosCriticos;
    } catch (error) {
      logger.error('Error obteniendo signos vitales críticos del doctor:', error);
      throw error;
    }
  }

  async getDoctorById(doctorId) {
    try {
      const doctor = await Doctor.findByPk(doctorId, {
        include: [
          { 
            model: Usuario, 
            attributes: ['email', 'rol'] 
          },
          { 
            model: Modulo, 
            attributes: ['nombre_modulo'] 
          }
        ]
      });
      return doctor;
    } catch (error) {
      logger.error('Error obteniendo doctor por ID:', error);
      throw error;
    }
  }

  async getCitasRecientesDoctor(doctorId) {
    try {
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const citas = await Cita.findAll({
        where: {
          id_doctor: doctorId,
          fecha_cita: {
            [Op.gte]: hace7Dias,
            [Op.lt]: hoy
          }
        },
        include: [
          { 
            model: Paciente, 
            attributes: ['nombre', 'apellido_paterno']
          }
        ],
        order: [['fecha_cita', 'DESC']],
        limit: 5
      });

      return citas;
    } catch (error) {
      logger.error('Error obteniendo citas recientes del doctor:', error);
      throw error;
    }
  }

  async getComorbilidadesMasFrecuentesDoctor(doctorId, estado = null) {
    try {
      // Reutilizar patrón SQL similar a getMetricasAvanzadas pero filtrando por doctor
      // Añadir filtro opcional por estado
      let query = `
        SELECT 
          c.nombre_comorbilidad as nombre,
          COUNT(DISTINCT pc.id_paciente) as frecuencia
        FROM comorbilidades c
        INNER JOIN paciente_comorbilidad pc ON c.id_comorbilidad = pc.id_comorbilidad
        INNER JOIN doctor_paciente dp ON dp.id_paciente = pc.id_paciente
        INNER JOIN pacientes p ON p.id_paciente = pc.id_paciente
        WHERE dp.id_doctor = :doctorId
      `;
      
      const replacements = { doctorId };
      
      // Añadir filtro por estado si se proporciona
      if (estado && estado.trim() !== '') {
        query += ` AND p.estado = :estado`;
        replacements.estado = estado.trim();
      }
      
      query += `
        GROUP BY c.id_comorbilidad, c.nombre_comorbilidad
        ORDER BY frecuencia DESC
        LIMIT 10
      `;
      
      const comorbilidades = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return comorbilidades;
    } catch (error) {
      logger.error('Error obteniendo comorbilidades más frecuentes del doctor:', error);
      throw error;
    }
  }

  /**
   * Obtiene comorbilidades agrupadas por periodo (semestre, anual, mensual)
   * @param {number} doctorId - ID del doctor
   * @param {string} periodo - 'semestre', 'anual' o 'mensual'
   * @param {string|null} estado - Estado opcional para filtrar
   * @param {Object|null} rangoMeses - Objeto con {mesInicio, mesFin, año} para periodo 'mensual'
   * @returns {Array} Array de objetos con periodo y comorbilidades
   */
  async getComorbilidadesPorPeriodo(doctorId, periodo, estado = null, rangoMeses = null) {
    try {
      // Validar periodo
      const periodosValidos = ['semestre', 'anual', 'mensual'];
      if (!periodosValidos.includes(periodo)) {
        throw new Error(`Periodo inválido. Debe ser uno de: ${periodosValidos.join(', ')}`);
      }

      // Validar rango de meses si el periodo es mensual
      if (periodo === 'mensual') {
        if (!rangoMeses || !rangoMeses.mesInicio || !rangoMeses.mesFin || !rangoMeses.año) {
          throw new Error('Para periodo mensual se requiere rangoMeses con mesInicio, mesFin y año');
        }
        if (rangoMeses.mesInicio < 1 || rangoMeses.mesInicio > 12 || 
            rangoMeses.mesFin < 1 || rangoMeses.mesFin > 12) {
          throw new Error('Los meses deben estar entre 1 y 12');
        }
        if (rangoMeses.mesInicio > rangoMeses.mesFin) {
          throw new Error('El mes inicial no puede ser mayor al mes final');
        }
      }

      // Construir expresión SQL para agrupar por periodo según el tipo
      let periodoExpression;
      let whereConditions = [];
      
      switch (periodo) {
        case 'semestre':
          // Formato: YYYY-S1, YYYY-S2
          periodoExpression = `CONCAT(YEAR(pc.fecha_deteccion), '-S', CASE WHEN MONTH(pc.fecha_deteccion) <= 6 THEN 1 ELSE 2 END)`;
          break;
        case 'anual':
          // Formato: YYYY
          periodoExpression = `YEAR(pc.fecha_deteccion)`;
          break;
        case 'mensual':
          // Formato: YYYY-MM para agrupar por mes
          periodoExpression = `CONCAT(YEAR(pc.fecha_deteccion), '-', LPAD(MONTH(pc.fecha_deteccion), 2, '0'))`;
          // Filtrar por rango de meses y año
          whereConditions.push(`YEAR(pc.fecha_deteccion) = :año`);
          whereConditions.push(`MONTH(pc.fecha_deteccion) >= :mesInicio`);
          whereConditions.push(`MONTH(pc.fecha_deteccion) <= :mesFin`);
          break;
      }

      let query = `
        SELECT 
          ${periodoExpression} as periodo,
          c.nombre_comorbilidad as nombre,
          COUNT(DISTINCT pc.id_paciente) as frecuencia
        FROM comorbilidades c
        INNER JOIN paciente_comorbilidad pc ON c.id_comorbilidad = pc.id_comorbilidad
        INNER JOIN doctor_paciente dp ON dp.id_paciente = pc.id_paciente
        INNER JOIN pacientes p ON p.id_paciente = pc.id_paciente
        WHERE dp.id_doctor = :doctorId
          AND pc.fecha_deteccion IS NOT NULL
      `;
      
      const replacements = { doctorId };
      
      // Añadir condiciones de rango de meses si aplica
      if (periodo === 'mensual' && rangoMeses) {
        replacements.año = parseInt(rangoMeses.año);
        replacements.mesInicio = parseInt(rangoMeses.mesInicio);
        replacements.mesFin = parseInt(rangoMeses.mesFin);
        whereConditions.forEach(condition => {
          query += ` AND ${condition}`;
        });
      }
      
      // Añadir filtro por estado si se proporciona
      if (estado && estado.trim() !== '') {
        query += ` AND p.estado = :estado`;
        replacements.estado = estado.trim();
      }
      
      query += `
        GROUP BY periodo, c.id_comorbilidad, c.nombre_comorbilidad
        ORDER BY periodo ASC, frecuencia DESC
      `;
      
      const resultados = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Transformar resultados a estructura agrupada por periodo
      const datosPorPeriodo = {};
      resultados.forEach(row => {
        const periodoKey = String(row.periodo);
        if (!datosPorPeriodo[periodoKey]) {
          datosPorPeriodo[periodoKey] = {
            periodo: periodoKey,
            comorbilidades: []
          };
        }
        datosPorPeriodo[periodoKey].comorbilidades.push({
          nombre: row.nombre,
          frecuencia: parseInt(row.frecuencia)
        });
      });

      // Convertir a array y ordenar por periodo
      // Para mensual: ordenar cronológicamente (ASC)
      // Para otros: ordenar descendente (más reciente primero)
      const periodosOrdenados = Object.values(datosPorPeriodo).sort((a, b) => {
        if (periodo === 'mensual') {
          return a.periodo.localeCompare(b.periodo); // Orden cronológico
        }
        return b.periodo.localeCompare(a.periodo); // Más reciente primero
      });

      return periodosOrdenados;
    } catch (error) {
      logger.error('Error obteniendo comorbilidades por periodo del doctor:', error);
      throw error;
    }
  }
}

export default DashboardRepository;

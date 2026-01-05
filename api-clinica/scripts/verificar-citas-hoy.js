import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Cita, Paciente, Doctor } from '../models/associations.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // Calcular timezone
    const timezoneOffset = ahora.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    const timezoneStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    const formatLocalDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const hoyStr = formatLocalDate(hoy);

    logger.info('=== CONSULTA DE CITAS DE HOY ===');
    logger.info('Hora actual:', ahora.toISOString());
    logger.info('Hoy (local):', hoy.toISOString());
    logger.info('HoyStr:', hoyStr);
    logger.info('Timezone:', timezoneStr);

    // Consulta usando CONVERT_TZ (como en el repositorio)
    const citas = await Cita.findAll({
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn('DATE',
              sequelize.fn('CONVERT_TZ',
                sequelize.col('fecha_cita'),
                '+00:00',
                timezoneStr
              )
            ),
            hoyStr
          ),
          {
            estado: {
              [Op.notIn]: ['cancelada', 'no_asistida']
            }
          }
        ]
      },
      include: [
        {
          model: Paciente,
          attributes: ['nombre', 'apellido_paterno', 'numero_celular']
        },
        {
          model: Doctor,
          attributes: ['id_doctor', 'nombre', 'apellido_paterno']
        }
      ],
      order: [['fecha_cita', 'ASC']],
      limit: 20
    });

    logger.info(`\n✅ Citas encontradas: ${citas.length}`);

    if (citas.length > 0) {
      citas.forEach((c, i) => {
        logger.info(`\n📅 Cita ${i + 1}:`);
        logger.info(`   ID: ${c.id_cita}`);
        logger.info(`   Fecha (UTC): ${c.fecha_cita}`);
        logger.info(`   Fecha (local): ${new Date(c.fecha_cita).toLocaleString('es-MX')}`);
        logger.info(`   Paciente: ${c.Paciente ? `${c.Paciente.nombre} ${c.Paciente.apellido_paterno}` : 'N/A'}`);
        logger.info(`   Doctor ID: ${c.id_doctor}`);
        logger.info(`   Estado: ${c.estado}`);
        logger.info(`   Motivo: ${c.motivo || 'N/A'}`);
      });
    } else {
      logger.warn('⚠️  No se encontraron citas para hoy');
      
      // Verificar si hay citas en general
      const todasLasCitas = await Cita.findAll({
        where: {
          estado: {
            [Op.notIn]: ['cancelada', 'no_asistida']
          }
        },
        include: [
          {
            model: Paciente,
            attributes: ['nombre', 'apellido_paterno']
          }
        ],
        order: [['fecha_cita', 'ASC']],
        limit: 10
      });

      logger.info(`\n📊 Total de citas activas en la BD: ${todasLasCitas.length}`);
      if (todasLasCitas.length > 0) {
        logger.info('\nPróximas 10 citas en la BD:');
        todasLasCitas.forEach((c, i) => {
          const fechaLocal = new Date(c.fecha_cita).toLocaleString('es-MX');
          logger.info(`   ${i + 1}. ID ${c.id_cita} - ${fechaLocal} - ${c.Paciente ? `${c.Paciente.nombre} ${c.Paciente.apellido_paterno}` : 'N/A'}`);
        });
      }
    }

    await sequelize.close();
  } catch (error) {
    logger.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
})();




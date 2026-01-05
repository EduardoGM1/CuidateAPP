import sequelize from '../config/db.js';
import Modulo from '../models/Modulo.js';
import logger from '../utils/logger.js';

async function verificarYCrearModulos() {
  try {
    logger.info('Verificando conexión a la base de datos...');
    
    // Verificar conexión
    await sequelize.authenticate();
    logger.info('Conexión a la base de datos exitosa');

    // Verificar si la tabla existe
    const [results] = await sequelize.query("SHOW TABLES LIKE 'modulos'");
    if (results.length === 0) {
      logger.error('La tabla "modulos" no existe');
      return;
    }
    logger.info('Tabla "modulos" encontrada');

    // Contar módulos existentes
    const count = await Modulo.count();
    logger.info(`Módulos existentes: ${count}`);

    if (count === 0) {
      logger.info('No hay módulos. Creando módulos de prueba...');
      
      const modulosPrueba = [
        { nombre_modulo: 'Módulo General' },
        { nombre_modulo: 'Módulo Especializado' },
        { nombre_modulo: 'Módulo Urgencias' },
        { nombre_modulo: 'Módulo Consulta Externa' },
        { nombre_modulo: 'Módulo Pediatría' }
      ];

      for (const modulo of modulosPrueba) {
        await Modulo.create(modulo);
        logger.info(`Módulo creado: ${modulo.nombre_modulo}`);
      }
      
      logger.info('Módulos de prueba creados exitosamente');
    } else {
      // Mostrar módulos existentes
      const modulos = await Modulo.findAll({
        attributes: ['id_modulo', 'nombre_modulo']
      });
      
      logger.info('Módulos existentes:');
      modulos.forEach(modulo => {
        logger.info(`- ID: ${modulo.id_modulo}, Nombre: ${modulo.nombre_modulo}`);
      });
    }

  } catch (error) {
    logger.error('Error verificando módulos:', error);
  } finally {
    await sequelize.close();
  }
}

verificarYCrearModulos();

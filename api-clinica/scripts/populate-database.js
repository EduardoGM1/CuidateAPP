import sequelize from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const populateDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '..', 'datos_correctos.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Dividir por declaraciones SQL (separadas por ;)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt.toUpperCase().includes('INSERT'));

    console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);

    // Ejecutar cada declaración
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await sequelize.query(statement);
          console.log(`✅ Declaración ${i + 1}/${statements.length} ejecutada`);
        } catch (error) {
          console.log(`⚠️  Declaración ${i + 1} omitida (posible duplicado): ${error.message}`);
        }
      }
    }

    console.log('🎉 Base de datos poblada exitosamente');
    console.log('📋 Datos de prueba disponibles:');
    console.log('   - Usuario: eduardo@doctor.com');
    console.log('   - Contraseña: Doctor123');
    console.log('   - 3 doctores, 3 pacientes, 3 citas');
    console.log('   - Medicamentos, comorbilidades y signos vitales');

  } catch (error) {
    console.error('❌ Error poblando la base de datos:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
};

populateDatabase();
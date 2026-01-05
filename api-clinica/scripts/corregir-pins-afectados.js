/**
 * Script para corregir PINs afectados por el bug del código anterior
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  PacienteAuth,
  PacienteAuthPIN,
  Paciente
} from '../models/associations.js';

async function corregirPINs() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 CORRIGIENDO PINs AFECTADOS');
    console.log('='.repeat(80) + '\n');

    // Obtener todos los PINs activos
    const allPINRecords = await PacienteAuthPIN.findAll({
      where: { activo: true },
      include: [
        {
          model: PacienteAuth,
          as: 'PacienteAuth',
          where: { activo: true },
          required: true,
          include: [
            {
              model: Paciente,
              as: 'paciente',
              required: true,
              attributes: ['id_paciente', 'nombre', 'apellido_paterno']
            }
          ]
        }
      ]
    });

    console.log(`📋 Total de PINs activos: ${allPINRecords.length}\n`);

    const testPINs = ['1313', '1414', '2020']; // Probar estos PINs comunes
    let corregidos = 0;

    for (const pinRecord of allPINRecords) {
      if (pinRecord.PacienteAuth && pinRecord.PacienteAuth.paciente) {
        const paciente = pinRecord.PacienteAuth.paciente;
        
        // Probar cada PIN para ver si fue creado con el método incorrecto
        let pinCorrecto = null;
        let necesitaCorreccion = false;

        // Primero verificar si funciona con comparación directa
        for (const testPIN of testPINs) {
          const isValidDirect = await bcrypt.compare(testPIN, pinRecord.pin_hash);
          const isValidWithSalt = await bcrypt.compare(testPIN + pinRecord.pin_salt, pinRecord.pin_hash);
          
          if (isValidDirect) {
            // Ya está correcto
            pinCorrecto = testPIN;
            break;
          } else if (isValidWithSalt) {
            // Fue creado con método incorrecto, necesita corrección
            pinCorrecto = testPIN;
            necesitaCorreccion = true;
            break;
          }
        }

        if (necesitaCorreccion && pinCorrecto) {
          console.log(`⚠️  Paciente ID ${paciente.id_paciente}: ${paciente.nombre} ${paciente.apellido_paterno}`);
          console.log(`   PIN detectado: ${pinCorrecto}`);
          console.log(`   Método incorrecto detectado, corrigiendo...`);

          // Recrear el hash correctamente
          const pin_hash = await bcrypt.hash(pinCorrecto, 10);
          const pin_salt = crypto.randomBytes(16).toString('hex');

          await pinRecord.update({
            pin_hash: pin_hash,
            pin_salt: pin_salt
          });

          // Verificar que ahora funciona
          const isValid = await bcrypt.compare(pinCorrecto, pin_hash);
          if (isValid) {
            console.log(`   ✅ PIN corregido exitosamente`);
            corregidos++;
          } else {
            console.log(`   ❌ Error al verificar corrección`);
          }
          console.log('');
        }
      }
    }

    if (corregidos === 0) {
      console.log('✅ No se encontraron PINs que necesiten corrección');
    } else {
      console.log(`✅ ${corregidos} PIN(s) corregido(s)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CORRECCIÓN COMPLETADA');
    console.log('='.repeat(80) + '\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

corregirPINs();





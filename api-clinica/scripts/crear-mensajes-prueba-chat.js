/**
 * Script para crear mensajes de prueba en el chat
 * Entre paciente "Eduardo" (PIN 2020) y doctor "Juan Perez Garcia"
 */

import sequelize from '../config/db.js';
import { Paciente, Doctor, Usuario, AuthCredential, MensajeChat } from '../models/associations.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

const main = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Buscar paciente Eduardo con PIN 2020
    console.log('\n🔍 Buscando paciente Eduardo con PIN 2020...');
    
    // Primero buscar credenciales con PIN 2020
    const credenciales = await AuthCredential.findAll({
      where: {
        user_type: 'Paciente',
        auth_method: 'pin',
        activo: true
      }
    });

    let paciente = null;
    for (const cred of credenciales) {
      const pinMatch = await bcrypt.compare('2020', cred.credential_value);
      if (pinMatch) {
        paciente = await Paciente.findByPk(cred.user_id);
        if (paciente && paciente.nombre.toLowerCase().includes('eduardo')) {
          break;
        }
      }
    }

    // Si no se encontró por PIN, buscar solo por nombre
    if (!paciente) {
      paciente = await Paciente.findOne({
        where: {
          nombre: { [Op.like]: '%eduardo%' },
          activo: true
        }
      });
    }

    if (!paciente) {
      console.error('❌ No se encontró el paciente Eduardo');
      console.log('📋 Pacientes disponibles:');
      const pacientes = await Paciente.findAll({ where: { activo: true }, limit: 10 });
      pacientes.forEach(p => {
        console.log(`   - ${p.nombre} ${p.apellido_paterno} (ID: ${p.id_paciente})`);
      });
      process.exit(1);
    }

    console.log(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);

    // Buscar doctor Juan Perez Garcia
    console.log('\n🔍 Buscando doctor Juan Perez Garcia...');
    const doctor = await Doctor.findOne({
      where: {
        nombre: { [Op.like]: '%juan%' },
        apellido_paterno: { [Op.like]: '%perez%' },
        apellido_materno: { [Op.like]: '%garcia%' },
        activo: true
      }
    });

    if (!doctor) {
      // Intentar buscar solo por nombre y apellido paterno
      const doctorAlt = await Doctor.findOne({
        where: {
          nombre: { [Op.like]: '%juan%' },
          apellido_paterno: { [Op.like]: '%perez%' },
          activo: true
        }
      });

      if (!doctorAlt) {
        console.error('❌ No se encontró el doctor Juan Perez Garcia');
        console.log('📋 Doctores disponibles:');
        const doctores = await Doctor.findAll({ where: { activo: true }, limit: 10 });
        doctores.forEach(d => {
          console.log(`   - ${d.nombre} ${d.apellido_paterno} ${d.apellido_materno || ''} (ID: ${d.id_doctor})`);
        });
        process.exit(1);
      }

      console.log(`✅ Doctor encontrado: ${doctorAlt.nombre} ${doctorAlt.apellido_paterno} ${doctorAlt.apellido_materno || ''} (ID: ${doctorAlt.id_doctor})`);
      
      // Crear mensajes de prueba
      console.log('\n💬 Creando mensajes de prueba...');
      
      const mensajes = [
        {
          id_paciente: paciente.id_paciente,
          id_doctor: doctorAlt.id_doctor,
          remitente: 'Paciente',
          mensaje_texto: 'Hola doctor, tengo una pregunta sobre mi tratamiento.',
          leido: false,
          fecha_envio: new Date(Date.now() - 2 * 60 * 60 * 1000) // Hace 2 horas
        },
        {
          id_paciente: paciente.id_paciente,
          id_doctor: doctorAlt.id_doctor,
          remitente: 'Doctor',
          mensaje_texto: 'Hola Eduardo, claro. ¿En qué puedo ayudarte?',
          leido: false,
          fecha_envio: new Date(Date.now() - 1.5 * 60 * 60 * 1000) // Hace 1.5 horas
        },
        {
          id_paciente: paciente.id_paciente,
          id_doctor: doctorAlt.id_doctor,
          remitente: 'Paciente',
          mensaje_texto: 'Quería saber si debo tomar la medicina antes o después de comer.',
          leido: true,
          fecha_envio: new Date(Date.now() - 1 * 60 * 60 * 1000) // Hace 1 hora
        },
        {
          id_paciente: paciente.id_paciente,
          id_doctor: doctorAlt.id_doctor,
          remitente: 'Doctor',
          mensaje_texto: 'Debes tomarla después de comer, preferiblemente 30 minutos después de las comidas principales.',
          leido: false,
          fecha_envio: new Date(Date.now() - 30 * 60 * 1000) // Hace 30 minutos
        },
        {
          id_paciente: paciente.id_paciente,
          id_doctor: doctorAlt.id_doctor,
          remitente: 'Paciente',
          mensaje_texto: 'Perfecto, muchas gracias doctor.',
          leido: false,
          fecha_envio: new Date(Date.now() - 10 * 60 * 1000) // Hace 10 minutos
        }
      ];

      for (const mensajeData of mensajes) {
        const mensaje = await MensajeChat.create(mensajeData);
        console.log(`   ✅ Mensaje creado: "${mensajeData.mensaje_texto.substring(0, 50)}..." (ID: ${mensaje.id_mensaje})`);
      }

      console.log(`\n✅ ${mensajes.length} mensajes de prueba creados exitosamente`);
      console.log(`\n📊 Resumen:`);
      console.log(`   - Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
      console.log(`   - Doctor: ${doctorAlt.nombre} ${doctorAlt.apellido_paterno} ${doctorAlt.apellido_materno || ''} (ID: ${doctorAlt.id_doctor})`);
      console.log(`   - Mensajes creados: ${mensajes.length}`);
      
      process.exit(0);
    }

    console.log(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno} ${doctor.apellido_materno || ''} (ID: ${doctor.id_doctor})`);
    
    // Crear mensajes de prueba
    console.log('\n💬 Creando mensajes de prueba...');
    
    const mensajes = [
      {
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Paciente',
        mensaje_texto: 'Hola doctor, tengo una pregunta sobre mi tratamiento.',
        leido: false,
        fecha_envio: new Date(Date.now() - 2 * 60 * 60 * 1000) // Hace 2 horas
      },
      {
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Doctor',
        mensaje_texto: 'Hola Eduardo, claro. ¿En qué puedo ayudarte?',
        leido: false,
        fecha_envio: new Date(Date.now() - 1.5 * 60 * 60 * 1000) // Hace 1.5 horas
      },
      {
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Paciente',
        mensaje_texto: 'Quería saber si debo tomar la medicina antes o después de comer.',
        leido: true,
        fecha_envio: new Date(Date.now() - 1 * 60 * 60 * 1000) // Hace 1 hora
      },
      {
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Doctor',
        mensaje_texto: 'Debes tomarla después de comer, preferiblemente 30 minutos después de las comidas principales.',
        leido: false,
        fecha_envio: new Date(Date.now() - 30 * 60 * 1000) // Hace 30 minutos
      },
      {
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: 'Paciente',
        mensaje_texto: 'Perfecto, muchas gracias doctor.',
        leido: false,
        fecha_envio: new Date(Date.now() - 10 * 60 * 1000) // Hace 10 minutos
      }
    ];

    for (const mensajeData of mensajes) {
      const mensaje = await MensajeChat.create(mensajeData);
      console.log(`   ✅ Mensaje creado: "${mensajeData.mensaje_texto.substring(0, 50)}..." (ID: ${mensaje.id_mensaje})`);
    }

    console.log(`\n✅ ${mensajes.length} mensajes de prueba creados exitosamente`);
    console.log(`\n📊 Resumen:`);
    console.log(`   - Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    console.log(`   - Doctor: ${doctor.nombre} ${doctor.apellido_paterno} ${doctor.apellido_materno || ''} (ID: ${doctor.id_doctor})`);
    console.log(`   - Mensajes creados: ${mensajes.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

main();


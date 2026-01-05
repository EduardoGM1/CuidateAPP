// =====================================================
// ARCHIVO INDEX PARA EXPORTAR TODOS LOS MODELOS
// =====================================================

// Importar todos los modelos
import Usuario from './Usuario.js';
import Modulo from './Modulo.js';
import Paciente from './Paciente.js';
import Doctor from './Doctor.js';
import Comorbilidad from './Comorbilidad.js';
import Medicamento from './Medicamento.js';
import SignoVital from './SignoVital.js';
import Cita from './Cita.js';
import Diagnostico from './Diagnostico.js';
import PlanMedicacion from './PlanMedicacion.js';
import RedApoyo from './RedApoyo.js';
import MensajeChat from './MensajeChat.js';
import DoctorPaciente from './DoctorPaciente.js';
import EsquemaVacunacion from './EsquemaVacunacion.js';
import PacienteComorbilidad from './PacienteComorbilidad.js';
import PlanDetalle from './PlanDetalle.js';
import PuntoChequeo from './PuntoChequeo.js';
import SistemaAuditoria from './SistemaAuditoria.js';
import NotificacionDoctor from './NotificacionDoctor.js';
// DEPRECATED: Tablas eliminadas - usar AuthCredential
// import PacienteAuth from './PacienteAuth.js';
import AuthCredential from './AuthCredential.js';

// Importar asociaciones para configurar las relaciones
import './associations.js';

// Exportar todos los modelos
export {
  Usuario,
  Modulo,
  Paciente,
  Doctor,
  Comorbilidad,
  Medicamento,
  SignoVital,
  Cita,
  Diagnostico,
  PlanMedicacion,
  RedApoyo,
  MensajeChat,
  DoctorPaciente,
  EsquemaVacunacion,
  PacienteComorbilidad,
  PlanDetalle,
  PuntoChequeo,
  SistemaAuditoria,
  NotificacionDoctor,
  // DEPRECATED: Tablas eliminadas - usar AuthCredential
  // PacienteAuth,
  AuthCredential
};

// Exportar por defecto como objeto
export default {
  Usuario,
  Modulo,
  Paciente,
  Doctor,
  Comorbilidad,
  Medicamento,
  SignoVital,
  Cita,
  Diagnostico,
  PlanMedicacion,
  RedApoyo,
  MensajeChat,
  DoctorPaciente,
  EsquemaVacunacion,
  PacienteComorbilidad,
  PlanDetalle,
  PuntoChequeo,
  SistemaAuditoria,
  NotificacionDoctor,
  // DEPRECATED: Tablas eliminadas - usar AuthCredential
  // PacienteAuth,
  AuthCredential
};

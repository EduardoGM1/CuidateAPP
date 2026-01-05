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
import Vacuna from './Vacuna.js';
import PlanDetalle from './PlanDetalle.js';
import PuntoChequeo from './PuntoChequeo.js';
import SolicitudReprogramacion from './SolicitudReprogramacion.js';
import SistemaAuditoria from './SistemaAuditoria.js';
import NotificacionDoctor from './NotificacionDoctor.js';
import MedicamentoToma from './MedicamentoToma.js';
import DeteccionComplicacion from './DeteccionComplicacion.js';
import SesionEducativa from './SesionEducativa.js';
import SaludBucal from './SaludBucal.js';
import DeteccionTuberculosis from './DeteccionTuberculosis.js';
// DEPRECATED: PacienteAuth models - Tablas eliminadas, usar AuthCredential
// import PacienteAuth, { PacienteAuthPIN, PacienteAuthBiometric } from './PacienteAuth.js';
import AuthCredential from './AuthCredential.js';
import PasswordResetToken from './PasswordResetToken.js';

// Usuario - Paciente (1:1)
Usuario.hasOne(Paciente, { foreignKey: 'id_usuario' });
Paciente.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Usuario - Doctor (1:1)
Usuario.hasOne(Doctor, { foreignKey: 'id_usuario' });
Doctor.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Paciente - SignoVital (1:N)
Paciente.hasMany(SignoVital, { foreignKey: 'id_paciente' });
SignoVital.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Cita - SignoVital (1:N)
// Usamos alias explícito para permitir include { as: 'SignosVitales' } en controladores
Cita.hasMany(SignoVital, { foreignKey: 'id_cita', as: 'SignosVitales' });
SignoVital.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

// Paciente - Cita (1:N)
Paciente.hasMany(Cita, { foreignKey: 'id_paciente' });
Cita.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Doctor - Cita (1:N)
Doctor.hasMany(Cita, { foreignKey: 'id_doctor' });
Cita.belongsTo(Doctor, { foreignKey: 'id_doctor' });

// Cita - Diagnostico (1:N)
Cita.hasMany(Diagnostico, { foreignKey: 'id_cita', as: 'Diagnosticos' });
Diagnostico.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

// Paciente - PlanMedicacion (1:N)
Paciente.hasMany(PlanMedicacion, { foreignKey: 'id_paciente' });
PlanMedicacion.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Doctor - PlanMedicacion (1:N)
Doctor.hasMany(PlanMedicacion, { foreignKey: 'id_doctor' });
PlanMedicacion.belongsTo(Doctor, { foreignKey: 'id_doctor' });

// Cita - PlanMedicacion (1:N)
Cita.hasMany(PlanMedicacion, { foreignKey: 'id_cita' });
PlanMedicacion.belongsTo(Cita, { foreignKey: 'id_cita' });

// Paciente - RedApoyo (1:N)
Paciente.hasMany(RedApoyo, { foreignKey: 'id_paciente' });
RedApoyo.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Paciente - MensajeChat (1:N)
Paciente.hasMany(MensajeChat, { foreignKey: 'id_paciente' });
MensajeChat.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Doctor - MensajeChat (1:N)
Doctor.hasMany(MensajeChat, { foreignKey: 'id_doctor' });
MensajeChat.belongsTo(Doctor, { foreignKey: 'id_doctor' });

// Modulo - Paciente (1:N)
Modulo.hasMany(Paciente, { foreignKey: 'id_modulo' });
Paciente.belongsTo(Modulo, { foreignKey: 'id_modulo' });

// Modulo - Doctor (1:N)
Modulo.hasMany(Doctor, { foreignKey: 'id_modulo' });
Doctor.belongsTo(Modulo, { foreignKey: 'id_modulo' });

// Paciente - EsquemaVacunacion (1:N)
Paciente.hasMany(EsquemaVacunacion, { foreignKey: 'id_paciente' });
EsquemaVacunacion.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Relaciones Many-to-Many
// Doctor - Paciente (N:M) a través de DoctorPaciente
Doctor.belongsToMany(Paciente, { through: DoctorPaciente, foreignKey: 'id_doctor' });
Paciente.belongsToMany(Doctor, { through: DoctorPaciente, foreignKey: 'id_paciente' });

// Paciente - Comorbilidad (N:M) a través de PacienteComorbilidad
Paciente.belongsToMany(Comorbilidad, { 
  through: PacienteComorbilidad, 
  foreignKey: 'id_paciente',
  as: 'Comorbilidades' // ✅ Alias explícito para acceso consistente
});
Comorbilidad.belongsToMany(Paciente, { 
  through: PacienteComorbilidad, 
  foreignKey: 'id_comorbilidad',
  as: 'Pacientes'
});

// Asociaciones directas para PacienteComorbilidad (tabla intermedia)
PacienteComorbilidad.belongsTo(Comorbilidad, {
  foreignKey: 'id_comorbilidad',
  as: 'Comorbilidad'
});
PacienteComorbilidad.belongsTo(Paciente, {
  foreignKey: 'id_paciente',
  as: 'Paciente'
});

// PlanMedicacion - PlanDetalle (1:N)
PlanMedicacion.hasMany(PlanDetalle, { foreignKey: 'id_plan' });
PlanDetalle.belongsTo(PlanMedicacion, { foreignKey: 'id_plan' });

// Medicamento - PlanDetalle (1:N)
Medicamento.hasMany(PlanDetalle, { foreignKey: 'id_medicamento' });
PlanDetalle.belongsTo(Medicamento, { foreignKey: 'id_medicamento' });

// PlanMedicacion - MedicamentoToma (1:N)
PlanMedicacion.hasMany(MedicamentoToma, { foreignKey: 'id_plan_medicacion' });
MedicamentoToma.belongsTo(PlanMedicacion, { foreignKey: 'id_plan_medicacion' });

// PlanDetalle - MedicamentoToma (1:N)
PlanDetalle.hasMany(MedicamentoToma, { foreignKey: 'id_plan_detalle' });
MedicamentoToma.belongsTo(PlanDetalle, { foreignKey: 'id_plan_detalle' });

// Paciente - PuntoChequeo (1:N)
Paciente.hasMany(PuntoChequeo, { foreignKey: 'id_paciente' });
PuntoChequeo.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Cita - PuntoChequeo (1:N)
Cita.hasMany(PuntoChequeo, { foreignKey: 'id_cita' });
PuntoChequeo.belongsTo(Cita, { foreignKey: 'id_cita' });

// Cita - SolicitudReprogramacion (1:N)
Cita.hasMany(SolicitudReprogramacion, { foreignKey: 'id_cita', as: 'SolicitudesReprogramacion' });
SolicitudReprogramacion.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

// Paciente - SolicitudReprogramacion (1:N)
Paciente.hasMany(SolicitudReprogramacion, { foreignKey: 'id_paciente' });
SolicitudReprogramacion.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Usuario - SistemaAuditoria (1:N)
Usuario.hasMany(SistemaAuditoria, { foreignKey: 'id_usuario' });
SistemaAuditoria.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Usuario - PasswordResetToken (1:N)
Usuario.hasMany(PasswordResetToken, { foreignKey: 'id_usuario' });
PasswordResetToken.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Doctor - NotificacionDoctor (1:N)
Doctor.hasMany(NotificacionDoctor, { foreignKey: 'id_doctor' });
NotificacionDoctor.belongsTo(Doctor, { foreignKey: 'id_doctor' });

// Paciente - NotificacionDoctor (1:N)
Paciente.hasMany(NotificacionDoctor, { foreignKey: 'id_paciente' });
NotificacionDoctor.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Cita - NotificacionDoctor (1:N)
Cita.hasMany(NotificacionDoctor, { foreignKey: 'id_cita' });
NotificacionDoctor.belongsTo(Cita, { foreignKey: 'id_cita' });

// MensajeChat - NotificacionDoctor (1:N)
MensajeChat.hasMany(NotificacionDoctor, { foreignKey: 'id_mensaje' });
NotificacionDoctor.belongsTo(MensajeChat, { foreignKey: 'id_mensaje' });

// Paciente - DeteccionComplicacion (1:N)
Paciente.hasMany(DeteccionComplicacion, { foreignKey: 'id_paciente' });
DeteccionComplicacion.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Comorbilidad - DeteccionComplicacion (1:N, opcional)
Comorbilidad.hasMany(DeteccionComplicacion, { foreignKey: 'id_comorbilidad' });
DeteccionComplicacion.belongsTo(Comorbilidad, { foreignKey: 'id_comorbilidad' });

// Cita - DeteccionComplicacion (1:N, opcional)
Cita.hasMany(DeteccionComplicacion, { foreignKey: 'id_cita' });
DeteccionComplicacion.belongsTo(Cita, { foreignKey: 'id_cita' });

// Doctor - DeteccionComplicacion (1:N, opcional)
Doctor.hasMany(DeteccionComplicacion, { foreignKey: 'id_doctor' });
DeteccionComplicacion.belongsTo(Doctor, { foreignKey: 'id_doctor' });

// Paciente - SesionEducativa (1:N)
Paciente.hasMany(SesionEducativa, { foreignKey: 'id_paciente' });
SesionEducativa.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Cita - SesionEducativa (1:N, opcional)
Cita.hasMany(SesionEducativa, { foreignKey: 'id_cita', as: 'SesionesEducativas' });
SesionEducativa.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

// Paciente - SaludBucal (1:N)
Paciente.hasMany(SaludBucal, { foreignKey: 'id_paciente' });
SaludBucal.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Cita - SaludBucal (1:N, opcional)
Cita.hasMany(SaludBucal, { foreignKey: 'id_cita', as: 'SaludBucal' });
SaludBucal.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

// Paciente - DeteccionTuberculosis (1:N)
Paciente.hasMany(DeteccionTuberculosis, { foreignKey: 'id_paciente' });
DeteccionTuberculosis.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Cita - DeteccionTuberculosis (1:N, opcional)
Cita.hasMany(DeteccionTuberculosis, { foreignKey: 'id_cita', as: 'DeteccionesTuberculosis' });
DeteccionTuberculosis.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

// ============================================================================
// ASOCIACIONES LEGACY - TABLAS ELIMINADAS
// ============================================================================
// Las siguientes asociaciones están comentadas porque las tablas fueron eliminadas:
// - paciente_auth
// - paciente_auth_pin
// - paciente_auth_biometric
// - paciente_auth_log
// 
// TODO: Migrar código que usa estas asociaciones a AuthCredential
// ============================================================================

// Paciente - PacienteAuth (1:1) - DEPRECATED: Tabla eliminada
// Paciente.hasOne(PacienteAuth, { foreignKey: 'id_paciente', as: 'auth' });
// PacienteAuth.belongsTo(Paciente, { foreignKey: 'id_paciente', as: 'paciente' });

// PacienteAuth - PacienteAuthPIN (1:1) - DEPRECATED: Tabla eliminada
// PacienteAuth.hasOne(PacienteAuthPIN, { foreignKey: 'id_auth', as: 'PacienteAuthPIN' });
// PacienteAuthPIN.belongsTo(PacienteAuth, { foreignKey: 'id_auth', as: 'PacienteAuth' });

// PacienteAuth - PacienteAuthBiometric (1:1) - DEPRECATED: Tabla eliminada
// PacienteAuth.hasOne(PacienteAuthBiometric, { foreignKey: 'id_auth', as: 'PacienteAuthBiometric' });
// PacienteAuthBiometric.belongsTo(PacienteAuth, { foreignKey: 'id_auth', as: 'PacienteAuth' });

// Asociaciones para AuthCredential (nuevo sistema unificado)
// Relación polimórfica - AuthCredential puede pertenecer a cualquier tipo de usuario
// No definimos foreign keys específicas, usamos user_type + user_id

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
  SolicitudReprogramacion,
  SistemaAuditoria,
  NotificacionDoctor,
  MedicamentoToma,
  DeteccionComplicacion,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  // DEPRECATED: PacienteAuth models - Tablas eliminadas
  // PacienteAuth,
  // PacienteAuthPIN,
  // PacienteAuthBiometric,
  Vacuna,
  AuthCredential,
  PasswordResetToken
};
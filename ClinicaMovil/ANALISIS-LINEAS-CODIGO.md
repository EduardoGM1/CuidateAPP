# Análisis de Líneas de Código - Frontend

## Resumen General
Este documento muestra el conteo de líneas de código en cada archivo del frontend (React Native).

---

## 📱 SCREENS (Pantallas) - Total: ~20,000+ líneas

### Screens/Admin (Administración)
| Líneas | Archivo |
|--------|---------|
| **6,126** | `screens/admin/DetallePaciente.js` ⚠️ **ARCHIVO MÁS GRANDE** |
| 1,896 | `screens/admin/AgregarPaciente.js` |
| 1,728 | `screens/admin/DetalleDoctor.js` |
| 1,579 | `screens/admin/GestionAdmin.js` |
| 1,054 | `screens/admin/HistorialAuditoria.js` |
| 1,045 | `screens/admin/VerTodasCitas.js` |
| 1,038 | `screens/admin/DashboardAdmin.js` |
| 927 | `screens/admin/AgregarDoctor.js` |
| 865 | `screens/admin/GestionUsuarios.js` |
| 865 | `screens/admin/GestionVacunas.js` |
| 821 | `screens/admin/GestionModulos.js` |
| 817 | `screens/admin/GestionComorbilidades.js` |
| 808 | `screens/admin/GestionMedicamentos.js` |
| 783 | `screens/admin/EditarDoctor.js` |
| 445 | `screens/admin/EditarPaciente.js` |

**Subtotal Admin: ~19,595 líneas**

### Screens/Paciente (Interfaz de Paciente)
| Líneas | Archivo |
|--------|---------|
| 1,458 | `screens/paciente/HistorialMedico.js` |
| 1,346 | `screens/paciente/MisCitas.js` |
| 830 | `screens/paciente/InicioPaciente.js` |
| 486 | `screens/paciente/MisMedicamentos.js` |
| 364 | `screens/paciente/RegistrarSignosVitales.js` |

**Subtotal Paciente: ~4,484 líneas**

### Screens/Doctor
| Líneas | Archivo |
|--------|---------|
| 1,133 | `screens/doctor/DashboardDoctor.js` |
| 447 | `screens/doctor/HistorialNotificaciones.js` |

**Subtotal Doctor: ~1,580 líneas**

### Screens/Auth (Autenticación)
| Líneas | Archivo |
|--------|---------|
| 439 | `screens/auth/LoginPIN.js` |
| 406 | `screens/auth/LoginDoctor.js` |
| 330 | `screens/auth/LoginPaciente.js` |
| 183 | `screens/auth/PantallaInicioSesion.js` |

**Subtotal Auth: ~1,358 líneas**

### Otras Screens
| Líneas | Archivo |
|--------|---------|
| 405 | `screens/DashboardPaciente.js` |
| 291 | `screens/DiagnosticScreen.js` |

**Subtotal Otras: ~696 líneas**

---

## 🧩 COMPONENTS (Componentes) - Total: ~5,000+ líneas

### Components/Forms
| Líneas | Archivo |
|--------|---------|
| 614 | `components/forms/PacienteForm.js` |
| 529 | `components/forms/FormField.js` |
| 434 | `components/forms/FormValidation.js` |
| 407 | `components/forms/DoctorForm.js` |

**Subtotal Forms: ~1,984 líneas**

### Components/DetallePaciente
| Líneas | Archivo |
|--------|---------|
| 274 | `components/DetallePaciente/shared/ModalBase.js` |
| 221 | `components/DetallePaciente/shared/OptionsModal.js` |
| 196 | `components/DetallePaciente/PatientHeader.js` |
| 133 | `components/DetallePaciente/shared/HistoryModal.js` |
| 113 | `components/DetallePaciente/MedicalSummary.js` |
| 111 | `components/DetallePaciente/shared/FormModal.js` |
| 106 | `components/DetallePaciente/ComorbilidadesSection.js` |
| 80 | `components/DetallePaciente/PatientGeneralInfo.js` |

**Subtotal DetallePaciente: ~1,234 líneas**

### Components/Paciente (Interfaz Accesible)
| Líneas | Archivo |
|--------|---------|
| 365 | `components/paciente/SimpleForm.js` |
| 206 | `components/paciente/MedicationCard.js` |
| 178 | `components/paciente/BigIconButton.js` |
| 129 | `components/paciente/ValueCard.js` |
| 113 | `components/paciente/HealthStatusIndicator.js` |
| 90 | `components/paciente/Badge.js` |
| 90 | `components/paciente/ProgressBar.js` |

**Subtotal Paciente: ~1,175 líneas**

### Components/Common
| Líneas | Archivo |
|--------|---------|
| 196 | `components/common/FilterModal.js` |
| 150 | `components/common/UsuarioSelector.js` |
| 85 | `components/common/ListCard.js` |
| 76 | `components/common/FilterChips.js` |
| 74 | `components/common/Logo.js` |
| 70 | `components/common/Input.js` |
| 68 | `components/common/BotonAudio.js` |
| 57 | `components/common/SeveridadBadge.js` |
| 52 | `components/common/Boton.js` |

**Subtotal Common: ~748 líneas**

### Otros Components
| Líneas | Archivo |
|--------|---------|
| 370 | `components/DateTimePickerButton.js` |
| 290 | `components/DatePickerButton.js` |
| 274 | `components/DateInputSeparated.js` |
| 269 | `components/PerformanceOverlay.js` |
| 243 | `components/ErrorBoundary.js` |
| 197 | `components/DateInput.js` |
| 117 | `components/TestModeToggle.js` |

**Subtotal Otros: ~1,750 líneas**

---

## 🎣 HOOKS (Hooks Personalizados) - Total: ~4,500+ líneas

| Líneas | Archivo |
|--------|---------|
| 765 | `hooks/usePacienteMedicalData.js` |
| 710 | `hooks/useDoctorForm.js` |
| 654 | `hooks/usePacienteForm.js` |
| 509 | `hooks/useGestion.js` |
| 490 | `hooks/useDashboard.js` |
| 298 | `hooks/useDetallePacienteState.js` |
| 256 | `hooks/useNotificationManager.js` |
| 236 | `hooks/usePacienteData.js` |
| 195 | `hooks/useSaveHandler.js` ⭐ **NUEVO** |
| 144 | `hooks/useModalManager.js` |
| 141 | `hooks/useRealtimeList.js` |
| 138 | `hooks/useNotificacionesDoctor.js` |
| 132 | `hooks/useReminders.js` |
| 130 | `hooks/useWebSocket.js` |
| 129 | `hooks/useAuditoria.js` |
| 122 | `hooks/useTTS.js` |
| 116 | `hooks/useMedicamentos.js` |
| 114 | `hooks/useHealthStatus.js` |
| 111 | `hooks/useTodasCitas.js` |
| 83 | `hooks/useTestMode.js` |
| 77 | `hooks/useFormState.js` |
| 32 | `hooks/useDebounce.js` |

**Total Hooks: ~4,503 líneas**

---

## 🔧 SERVICES (Servicios) - Total: ~3,500+ líneas

| Líneas | Archivo |
|--------|---------|
| 862 | `services/pushTokenService.js` |
| 779 | `services/ttsService.js` |
| 480 | `services/localNotificationService.js` |
| 309 | `services/storageService.js` |
| 189 | `services/reminderService.js` |
| 138 | `services/validationService.js` |
| 133 | `services/hapticService.js` |
| 119 | `services/logger.js` |
| 115 | `services/audioFeedbackService.js` |
| 154 | `services/firebaseInitService.js` |
| 169 | `services/connectionDiagnosticService.js` |
| 224 | `services/wsLogger.js` |
| 138 | `services/alertService.js` |

**Total Services: ~3,769 líneas**

---

## 🌐 API (Servicios de API) - Total: ~3,200+ líneas

| Líneas | Archivo |
|--------|---------|
| 2,020 | `api/gestionService.js` ⚠️ **GRANDE** |
| 418 | `api/authService.js` |
| 327 | `api/dashboardService.js` |
| 272 | `api/crudFactory.js` ⭐ **NUEVO** |
| 168 | `api/pacienteAuthService.js` |
| 153 | `api/servicioApi.js` |

**Total API: ~3,358 líneas**

---

## 🧭 NAVIGATION (Navegación) - Total: ~400 líneas

| Líneas | Archivo |
|--------|---------|
| 313 | `navigation/NavegacionProfesional.js` |
| 61 | `navigation/NavegacionPrincipal.js` |
| 30 | `navigation/NavegacionPaciente.js` |
| 29 | `navigation/NavegacionAuth.js` |

**Total Navigation: ~433 líneas**

---

## 🗄️ CONTEXT (Contextos) - Total: ~550 líneas

| Líneas | Archivo |
|--------|---------|
| 333 | `context/AuthContext.js` |
| 201 | `context/DetallePacienteContext.js` |

**Total Context: ~534 líneas**

---

## 🛠️ UTILS (Utilidades) - Total: ~2,500+ líneas

| Líneas | Archivo |
|--------|---------|
| 369 | `utils/runPerformanceTests.js` |
| 317 | `utils/executeAllTests.js` |
| 222 | `utils/dateUtils.js` |
| 214 | `utils/securityUtils.js` |
| 201 | `utils/testPacienteInterface.js` |
| 196 | `utils/sharedStyles.js` |
| 188 | `utils/citaValidator.js` |
| 180 | `utils/ttsDiagnostic.js` |
| 157 | `utils/benchmarkUtils.js` |
| 147 | `utils/validation.js` |
| 145 | `utils/performanceTest.js` |
| 117 | `utils/patientIdValidator.js` |
| 105 | `utils/constantes.js` |
| 102 | `config/constants.js` |

**Total Utils: ~2,500+ líneas**

---

## ⚙️ CONFIG (Configuración) - Total: ~500 líneas

| Líneas | Archivo |
|--------|---------|
| 246 | `config/apiConfig.js` |
| 171 | `config/theme.js` |
| 105 | `config/constants.js` |

**Total Config: ~522 líneas**

---

## 📦 STORE (Redux) - Total: ~250 líneas

| Líneas | Archivo |
|--------|---------|
| 131 | `store/slices/authSlice.js` |
| 23 | `store/store.js` |

**Total Store: ~154 líneas**

---

## 📊 ESTADÍSTICAS GENERALES

### Top 10 Archivos Más Grandes
1. **6,126 líneas** - `screens/admin/DetallePaciente.js` ⚠️
2. **2,020 líneas** - `api/gestionService.js` ⚠️
3. **1,896 líneas** - `screens/admin/AgregarPaciente.js`
4. **1,728 líneas** - `screens/admin/DetalleDoctor.js`
5. **1,579 líneas** - `screens/admin/GestionAdmin.js`
6. **1,458 líneas** - `screens/paciente/HistorialMedico.js`
7. **1,346 líneas** - `screens/paciente/MisCitas.js`
8. **1,133 líneas** - `screens/doctor/DashboardDoctor.js`
9. **1,054 líneas** - `screens/admin/HistorialAuditoria.js`
10. **1,045 líneas** - `screens/admin/VerTodasCitas.js`

### Distribución por Tipo
- **Screens**: ~27,000+ líneas (60%)
- **Components**: ~6,900+ líneas (15%)
- **Hooks**: ~4,500+ líneas (10%)
- **Services**: ~3,800+ líneas (8%)
- **API**: ~3,400+ líneas (7%)
- **Otros**: ~3,000+ líneas (7%)

### Total Estimado
**~45,000+ líneas de código** en el frontend (sin contar tests y mocks)

---

## Notas Importantes

1. **DetallePaciente.js** es el archivo más grande (6,126 líneas) - Se ha refactorizado parcialmente pero aún necesita más optimización
2. **gestionService.js** es el segundo más grande (2,020 líneas) - Se ha refactorizado con Factory Pattern
3. Los archivos marcados con ⭐ son nuevos o recientemente refactorizados
4. Los archivos marcados con ⚠️ son candidatos para futuras refactorizaciones

---

*Última actualización: Diciembre 2025*


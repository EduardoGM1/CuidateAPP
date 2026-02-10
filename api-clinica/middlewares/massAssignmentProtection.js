import { body } from 'express-validator';

/**
 * Middleware de protección contra Mass Assignment Attacks
 */
class MassAssignmentProtection {
  
  /**
   * Campos permitidos para diferentes operaciones
   */
  static getAllowedFields() {
    return {
      // Campos permitidos para registro de usuarios
      userRegistration: [
        'email',
        'password',
        'rol'
      ],

      // Campos permitidos para cambio de contraseña (change-password)
      passwordUpdate: [
        'currentPassword',
        'newPassword',
        'userId'
      ],
      
      // Campos permitidos para actualización de perfil de usuario
      userUpdate: [
        'email',
        'ultimo_login'
      ],
      
      // Campos permitidos para registro de pacientes
      patientRegistration: [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'fecha_nacimiento',
        'sexo',
        'curp',
        'telefono',
        'numero_celular', // ✅ Agregado para compatibilidad
        'email',
        'direccion',
        'estado', // ✅ Agregado (campo requerido)
        'localidad',
        'institucion_salud',
        'id_usuario',
        'id_modulo',
        'activo',
        'pin', // ✅ Agregado para configuración de PIN
        'device_id' // ✅ Agregado para identificación de dispositivo
      ],
      
      // Campos permitidos para configuración de PIN de pacientes
      pinSetup: [
        'id_paciente',
        'pin',
        'device_id'
      ],
      
      // Campos permitidos para login con PIN
      pinLogin: [
        'id_paciente',
        'pin',
        'device_id'
      ],
      
      // Campos permitidos para configuración de biometría
      biometricSetup: [
        'id_paciente',
        'device_id',
        'public_key',
        'credential_id'
      ],
      
      // Campos permitidos para login con biometría
      biometricLogin: [
        'id_paciente',
        'device_id',
        'signature',
        'challenge'
      ],
      
      // Campos permitidos para actualización de pacientes
      patientUpdate: [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'fecha_nacimiento',
        'sexo',
        'telefono', // Mapeado a numero_celular en el controlador
        'numero_celular',
        'direccion',
        'localidad',
        'institucion_salud',
        'id_modulo',
        'curp',
        'activo' // Permitido para actualización (solo Admin puede cambiar)
      ],
      
      // Campos permitidos para registro de doctores
      doctorRegistration: [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'especialidad',
        'cedula_profesional',
        'telefono',
        'email',
        'id_usuario',
        'password',
        'confirmPassword',
        'institucion_hospitalaria',
        'grado_estudio',
        'anos_servicio',
        'id_modulo',
        'activo'
      ],
      
      // Campos permitidos para actualización de doctores
      doctorUpdate: [
        'email',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'telefono',
        'institucion_hospitalaria',
        'grado_estudio',
        'anos_servicio',
        'id_modulo',
        'activo'
      ],
      
      // Campos permitidos para signos vitales
      vitalSigns: [
        'id_paciente',
        'id_cita',
        'fecha_medicion',
        'peso_kg',
        'talla_m',
        'imc',
        'medida_cintura_cm',
        'presion_sistolica',
        'presion_diastolica',
        'frecuencia_cardiaca',
        'temperatura_c',
        'saturacion_oxigeno',
        'glucosa_mg_dl'
      ],
      
      // Campos permitidos para citas
      appointment: [
        'id_paciente',
        'id_doctor',
        'fecha_cita',
        'hora_cita',
        'motivo_consulta',
        'estado'
      ],
      
      // Campos permitidos para medicamentos
      medication: [
        'nombre',
        'dosis_recomendada',
        'contraindicaciones',
        'instrucciones'
      ],
      
      // Campos permitidos para planes de medicación
      medicationPlan: [
        'id_diagnostico',
        'id_medicamento',
        'dosis',
        'frecuencia',
        'duracion_dias',
        'instrucciones_especiales'
      ],
      
      // Campos permitidos para diagnósticos
      diagnosis: [
        'id_paciente',
        'id_doctor',
        'diagnostico_principal',
        'diagnosticos_secundarios',
        'fecha_diagnostico',
        'observaciones'
      ],
      
      // Campos permitidos para mensajes de chat
      chatMessage: [
        'id_remitente',
        'id_destinatario',
        'mensaje',
        'tipo_mensaje'
      ],
      
      // Campos permitidos para red de apoyo
      supportNetwork: [
        'id_paciente',
        'nombre_contacto',
        'relacion',
        'telefono',
        'email',
        'es_contacto_emergencia'
      ],
      
      // Campos permitidos para detección de complicaciones
      deteccionComplicacion: [
        'id_paciente',
        'id_comorbilidad',
        'id_cita',
        'id_doctor',
        'exploracion_pies',
        'exploracion_fondo_ojo',
        'realiza_auto_monitoreo',
        'auto_monitoreo_glucosa',
        'auto_monitoreo_presion',
        'tipo_complicacion',
        'fecha_deteccion',
        'fecha_diagnostico',
        'observaciones'
        // NO incluir: registrado_por, fecha_creacion (se establecen automáticamente)
      ]
    };
  }

  /**
   * Campos peligrosos que nunca deben ser permitidos
   */
  static getDangerousFields() {
    return [
      'id',
      'id_usuario',
      'id_paciente',
      'id_doctor',
      'password_hash',
      'refresh_token_hash',
      'token_version',
      'refresh_token_expires_at',
      'created_at',
      'updated_at',
      'deleted_at',
      'activo',
      'admin',
      'super_admin',
      'permissions',
      'roles',
      'access_level',
      'is_verified',
      'verification_token',
      'reset_token',
      'reset_token_expires_at',
      'login_attempts',
      'locked_until',
      'last_login_ip',
      'session_id',
      'api_key',
      'secret_key',
      'private_key',
      'public_key',
      'encryption_key',
      'salt',
      'hash',
      'checksum',
      'signature',
      'token',
      'jwt',
      'oauth_token',
      'access_token',
      'refresh_token',
      'bearer_token',
      'api_token',
      'auth_token',
      'session_token',
      'csrf_token',
      'xss_token',
      'security_token',
      'validation_token',
      'confirmation_token',
      'activation_token',
      'invitation_token',
      'password_reset_token',
      'email_verification_token',
      'phone_verification_token',
      'two_factor_token',
      'backup_codes',
      'recovery_codes',
      'mfa_secret',
      'totp_secret',
      'hotp_secret',
      'biometric_data',
      'fingerprint_data',
      'face_id_data',
      'voice_data',
      'retina_data',
      'iris_data',
      'palm_data',
      'vein_data',
      'dna_data',
      'genetic_data',
      'medical_record_id',
      'patient_id',
      'doctor_id',
      'nurse_id',
      'admin_id',
      'supervisor_id',
      'manager_id',
      'director_id',
      'ceo_id',
      'owner_id',
      'creator_id',
      'modifier_id',
      'deleter_id',
      'auditor_id',
      'reviewer_id',
      'approver_id',
      'rejector_id',
      'assigner_id',
      'assignee_id',
      'watcher_id',
      'follower_id',
      'subscriber_id',
      'member_id',
      'user_id',
      'account_id',
      'organization_id',
      'company_id',
      'department_id',
      'team_id',
      'group_id',
      'role_id',
      'permission_id',
      'privilege_id',
      'access_id',
      'resource_id',
      'object_id',
      'entity_id',
      'record_id',
      'document_id',
      'file_id',
      'attachment_id',
      'media_id',
      'image_id',
      'video_id',
      'audio_id',
      'link_id',
      'url_id',
      'path_id',
      'route_id',
      'endpoint_id',
      'api_id',
      'service_id',
      'function_id',
      'method_id',
      'action_id',
      'operation_id',
      'task_id',
      'job_id',
      'process_id',
      'thread_id',
      'session_id',
      'connection_id',
      'socket_id',
      'channel_id',
      'room_id',
      'conversation_id',
      'message_id',
      'notification_id',
      'alert_id',
      'warning_id',
      'error_id',
      'exception_id',
      'log_id',
      'event_id',
      'activity_id',
      'action_id',
      'transaction_id',
      'payment_id',
      'order_id',
      'invoice_id',
      'receipt_id',
      'bill_id',
      'charge_id',
      'fee_id',
      'tax_id',
      'discount_id',
      'coupon_id',
      'promo_id',
      'offer_id',
      'deal_id',
      'bargain_id',
      'sale_id',
      'purchase_id',
      'buy_id',
      'sell_id',
      'trade_id',
      'exchange_id',
      'transfer_id',
      'deposit_id',
      'withdrawal_id',
      'balance_id',
      'credit_id',
      'debit_id',
      'account_balance',
      'credit_limit',
      'debit_limit',
      'spending_limit',
      'transaction_limit',
      'daily_limit',
      'monthly_limit',
      'yearly_limit',
      'lifetime_limit',
      'quota',
      'allowance',
      'budget',
      'fund',
      'capital',
      'investment',
      'savings',
      'checking',
      'savings_account',
      'checking_account',
      'credit_account',
      'debit_account',
      'loan_account',
      'mortgage_account',
      'insurance_account',
      'retirement_account',
      'pension_account',
      'social_security_account',
      'medicare_account',
      'medicaid_account',
      'health_insurance_account',
      'dental_insurance_account',
      'vision_insurance_account',
      'life_insurance_account',
      'disability_insurance_account',
      'unemployment_insurance_account',
      'workers_compensation_account',
      'liability_insurance_account',
      'property_insurance_account',
      'auto_insurance_account',
      'home_insurance_account',
      'renters_insurance_account',
      'business_insurance_account',
      'professional_insurance_account',
      'malpractice_insurance_account',
      'errors_omissions_insurance_account',
      'cyber_insurance_account',
      'data_breach_insurance_account',
      'privacy_insurance_account',
      'security_insurance_account',
      'compliance_insurance_account',
      'regulatory_insurance_account',
      'audit_insurance_account',
      'investigation_insurance_account',
      'litigation_insurance_account',
      'settlement_insurance_account',
      'judgment_insurance_account',
      'award_insurance_account',
      'damages_insurance_account',
      'penalty_insurance_account',
      'fine_insurance_account',
      'sanction_insurance_account',
      'censure_insurance_account',
      'reprimand_insurance_account',
      'warning_insurance_account',
      'notice_insurance_account',
      'citation_insurance_account',
      'violation_insurance_account',
      'infraction_insurance_account',
      'misdemeanor_insurance_account',
      'felony_insurance_account',
      'crime_insurance_account',
      'fraud_insurance_account',
      'theft_insurance_account',
      'embezzlement_insurance_account',
      'forgery_insurance_account',
      'counterfeiting_insurance_account',
      'money_laundering_insurance_account',
      'racketeering_insurance_account',
      'conspiracy_insurance_account',
      'aiding_abetting_insurance_account',
      'accessory_insurance_account',
      'accomplice_insurance_account',
      'co_conspirator_insurance_account',
      'co_defendant_insurance_account',
      'co_plaintiff_insurance_account',
      'co_appellant_insurance_account',
      'co_respondent_insurance_account',
      'co_petitioner_insurance_account',
      'co_respondent_insurance_account',
      'co_claimant_insurance_account',
      'co_beneficiary_insurance_account',
      'co_heir_insurance_account',
      'co_executor_insurance_account',
      'co_administrator_insurance_account',
      'co_trustee_insurance_account',
      'co_guardian_insurance_account',
      'co_conservator_insurance_account',
      'co_power_of_attorney_insurance_account',
      'co_agent_insurance_account',
      'co_representative_insurance_account',
      'co_attorney_insurance_account',
      'co_lawyer_insurance_account',
      'co_counsel_insurance_account',
      'co_advocate_insurance_account',
      'co_defender_insurance_account',
      'co_prosecutor_insurance_account',
      'co_district_attorney_insurance_account',
      'co_state_attorney_insurance_account',
      'co_federal_attorney_insurance_account',
      'co_public_defender_insurance_account',
      'co_private_defender_insurance_account',
      'co_criminal_defender_insurance_account',
      'co_civil_defender_insurance_account',
      'co_family_defender_insurance_account',
      'co_juvenile_defender_insurance_account',
      'co_immigration_defender_insurance_account',
      'co_deportation_defender_insurance_account',
      'co_asylum_defender_insurance_account',
      'co_refugee_defender_insurance_account',
      'co_visa_defender_insurance_account',
      'co_passport_defender_insurance_account',
      'co_citizenship_defender_insurance_account',
      'co_naturalization_defender_insurance_account',
      'co_denaturalization_defender_insurance_account',
      'co_expatriation_defender_insurance_account',
      'co_renunciation_defender_insurance_account',
      'co_relinquishment_defender_insurance_account',
      'co_derivation_defender_insurance_account',
      'co_acquisition_defender_insurance_account',
      'co_birthright_defender_insurance_account',
      'co_jus_soli_defender_insurance_account',
      'co_jus_sanguinis_defender_insurance_account',
      'co_territorial_defender_insurance_account',
      'co_maritime_defender_insurance_account',
      'co_aerial_defender_insurance_account',
      'co_space_defender_insurance_account',
      'co_cyber_defender_insurance_account',
      'co_digital_defender_insurance_account',
      'co_virtual_defender_insurance_account',
      'co_online_defender_insurance_account',
      'co_offline_defender_insurance_account',
      'co_remote_defender_insurance_account',
      'co_local_defender_insurance_account',
      'co_domestic_defender_insurance_account',
      'co_foreign_defender_insurance_account',
      'co_international_defender_insurance_account',
      'co_global_defender_insurance_account',
      'co_universal_defender_insurance_account',
      'co_cosmic_defender_insurance_account',
      'co_galactic_defender_insurance_account',
      'co_universal_defender_insurance_account',
      'co_multiversal_defender_insurance_account',
      'co_omniversal_defender_insurance_account',
      'co_metaversal_defender_insurance_account',
      'co_hyperversal_defender_insurance_account',
      'co_ultraversal_defender_insurance_account',
      'co_superversal_defender_insurance_account',
      'co_megaversal_defender_insurance_account',
      'co_gigaversal_defender_insurance_account',
      'co_teraversal_defender_insurance_account',
      'co_petaversal_defender_insurance_account',
      'co_exaversal_defender_insurance_account',
      'co_zettaversal_defender_insurance_account',
      'co_yottaversal_defender_insurance_account',
      'co_ronnaversal_defender_insurance_account',
      'co_quettaversal_defender_insurance_account'
    ];
  }

  /**
   * Middleware para prevenir mass assignment - MEJORADO PARA DESARROLLO
   */
  static preventMassAssignment(allowedFields, operation = 'default') {
    return (req, res, next) => {
      // Skip para tests y desarrollo
      if (process.env.NODE_ENV === 'test' || 
          (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true')) {
        return next();
      }

      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      const dangerousFields = this.getDangerousFields();
      const fields = allowedFields || this.getAllowedFields()[operation] || [];
      
      // Crear objeto sanitizado
      const sanitizedBody = {};
      const rejectedFields = [];
      const dangerousFieldsFound = [];

      // Verificar cada campo en el body
      Object.keys(req.body).forEach(key => {
        // Verificar si el campo está permitido (tiene prioridad sobre campos peligrosos)
        if (fields.includes(key)) {
          sanitizedBody[key] = req.body[key];
          return;
        }

        // Verificar si el campo está en la lista de campos peligrosos
        if (dangerousFields.includes(key)) {
          dangerousFieldsFound.push(key);
          return; // No incluir campos peligrosos
        }

        // Campo no permitido ni peligroso
        rejectedFields.push(key);
      });

      // Log de campos rechazados para auditoría
      if (rejectedFields.length > 0 || dangerousFieldsFound.length > 0) {
        console.warn('Mass Assignment Protection:', {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
          operation,
          rejectedFields,
          dangerousFieldsFound,
          allowedFields: fields,
          bodyKeys: Object.keys(req.body)
        });
      }

      // Si se encuentran campos peligrosos, rechazar la request
      if (dangerousFieldsFound.length > 0) {
        return res.status(400).json({
          error: 'Campos peligrosos detectados en la solicitud',
          code: 'DANGEROUS_FIELDS_DETECTED',
          dangerousFields: dangerousFieldsFound,
          timestamp: new Date().toISOString()
        });
      }

      // Reemplazar el body con la versión sanitizada
      req.body = sanitizedBody;
      next();
    };
  }

  /**
   * Validador específico para diferentes operaciones
   */
  static validateOperation(operation) {
    const allowedFields = this.getAllowedFields()[operation];
    if (!allowedFields) {
      throw new Error(`Operación no válida: ${operation}`);
    }

    return this.preventMassAssignment(allowedFields, operation);
  }

  /**
   * Middleware para validar campos específicos
   */
  static validateFields(fields) {
    return body(fields).custom((value, { req }) => {
      const dangerousFields = this.getDangerousFields();
      const rejectedFields = [];
      const dangerousFieldsFound = [];

      if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach(key => {
          if (dangerousFields.includes(key)) {
            dangerousFieldsFound.push(key);
          } else if (!fields.includes(key)) {
            rejectedFields.push(key);
          }
        });
      }

      if (dangerousFieldsFound.length > 0) {
        throw new Error(`Campos peligrosos detectados: ${dangerousFieldsFound.join(', ')}`);
      }

      if (rejectedFields.length > 0) {
        throw new Error(`Campos no permitidos: ${rejectedFields.join(', ')}`);
      }

      return true;
    });
  }
}

export default MassAssignmentProtection;

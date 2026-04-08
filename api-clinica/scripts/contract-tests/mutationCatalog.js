/**
 * Catálogo de pruebas de contrato para métodos mutadores (POST/PUT/PATCH/DELETE).
 * Amplía este archivo al añadir rutas; ejecuta `npm run test:contract:scan` para listar
 * todas las rutas mutadoras del backend y detectar huecos.
 */

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function adminEmail() {
  return (process.env.TEST_ADMIN_EMAIL || process.env.TEST_DOCTOR_EMAIL || '').trim();
}

function adminPassword() {
  return process.env.TEST_ADMIN_PASSWORD || process.env.TEST_DOCTOR_PASSWORD || '';
}

/**
 * @typedef {object} Scenario
 * @property {string} id
 * @property {string} [description]
 * @property {('web'|'mobile')[]} clients
 * @property {'get'|'post'|'put'|'patch'|'delete'} method
 * @property {(ctx: object) => string} path
 * @property {(ctx: object) => object|undefined} [body]
 * @property {Record<string, string>} [requestSchema]
 * @property {number[]} expectStatuses
 * @property {boolean} [negative]
 * @property {(ctx: object, res: import('axios').AxiosResponse) => void} [after]
 * @property {(ctx: object) => boolean} [skipIf]
 */

/** @returns {Scenario[]} */
export function buildScenarios() {
  return [
    {
      id: 'auth.login.web_mobile_shape',
      description: 'Login: email y password como strings (igual web y app)',
      clients: ['web', 'mobile'],
      method: 'post',
      path: () => '/auth/login',
      body: () => ({
        email: adminEmail().toLowerCase(),
        password: adminPassword(),
      }),
      requestSchema: {
        email: 'string',
        password: 'string',
      },
      expectStatuses: [200],
      skipIf: () => !adminEmail() || !adminPassword(),
      after: (ctx, res) => {
        const t = res.data?.token || res.data?.data?.token;
        if (t) ctx.token = t;
        const rt = res.data?.refresh_token || res.data?.data?.refresh_token;
        if (rt) ctx.refreshToken = rt;
      },
    },
    {
      id: 'cita.create.reject_invalid_paciente_id',
      description: 'POST cita: id_paciente inválido → 400 (contrato numérico)',
      clients: ['web'],
      method: 'post',
      path: () => '/citas',
      body: () => ({
        id_paciente: 'no-es-numero',
        fecha_cita: tomorrowIso(),
        motivo: 'Prueba contrato',
        es_primera_consulta: false,
      }),
      requestSchema: {
        id_paciente: 'string',
        fecha_cita: 'isoDate',
        motivo: 'string',
        es_primera_consulta: 'boolean',
      },
      expectStatuses: [400],
      negative: true,
      skipIf: (ctx) => !ctx.token,
    },
    {
      id: 'cita.create.valid',
      description: 'POST cita: tipos alineados con controlador (números, fecha ISO, boolean)',
      clients: ['web', 'mobile'],
      method: 'post',
      path: () => '/citas',
      body: (ctx) => ({
        id_paciente: ctx.pacienteId,
        id_doctor: ctx.doctorId,
        fecha_cita: tomorrowIso(),
        motivo: 'Cita contrato API',
        observaciones: null,
        es_primera_consulta: false,
        estado: 'pendiente',
      }),
      requestSchema: {
        id_paciente: 'integer',
        id_doctor: 'integer',
        fecha_cita: 'isoDate',
        motivo: 'string',
        es_primera_consulta: 'boolean',
        estado: 'string',
      },
      expectStatuses: [200, 201],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId || !ctx.doctorId,
      after: (ctx, res) => {
        const id = res.data?.id_cita ?? res.data?.data?.id_cita;
        if (id) ctx.citaId = id;
      },
    },
    {
      id: 'cita.update.put',
      description: 'PUT cita: campos parciales (Sequelize update)',
      clients: ['web'],
      method: 'put',
      path: (ctx) => `/citas/${ctx.citaId}`,
      body: () => ({
        motivo: 'Actualizado contrato',
        observaciones: 'OK',
      }),
      requestSchema: {
        motivo: 'string',
        observaciones: 'string',
      },
      expectStatuses: [200],
      skipIf: (ctx) => !ctx.token || !ctx.citaId,
    },
    {
      id: 'signos.post.valid',
      description: 'POST signos vitales: números como number (JSON app/web)',
      clients: ['web', 'mobile'],
      method: 'post',
      path: (ctx) => `/pacientes/${ctx.pacienteId}/signos-vitales`,
      body: () => ({
        peso_kg: 72.5,
        talla_m: 1.7,
        medida_cintura_cm: 88,
        presion_sistolica: 118,
        presion_diastolica: 76,
        glucosa_mg_dl: 92,
        colesterol_mg_dl: 180,
        trigliceridos_mg_dl: 110,
        observaciones: 'Contrato tipos',
      }),
      requestSchema: {
        peso_kg: 'number',
        talla_m: 'number',
        medida_cintura_cm: 'number',
        presion_sistolica: 'integer',
        presion_diastolica: 'integer',
        glucosa_mg_dl: 'integer',
        colesterol_mg_dl: 'number',
        trigliceridos_mg_dl: 'integer',
        observaciones: 'string',
      },
      expectStatuses: [200, 201],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId,
      after: (ctx, res) => {
        const id =
          res.data?.data?.id_signo ||
          res.data?.data?.id ||
          res.data?.id_signo;
        if (id) ctx.signoId = id;
      },
    },
    {
      id: 'signos.put.valid',
      description: 'PUT signos vitales',
      clients: ['web'],
      method: 'put',
      path: (ctx) => `/pacientes/${ctx.pacienteId}/signos-vitales/${ctx.signoId}`,
      body: () => ({
        peso_kg: 73,
        talla_m: 1.7,
        observaciones: 'Update contrato',
      }),
      requestSchema: {
        peso_kg: 'number',
        talla_m: 'number',
        observaciones: 'string',
      },
      expectStatuses: [200],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId || !ctx.signoId,
    },
    {
      id: 'diagnostico.post.valid',
      description: 'POST diagnóstico (id_cita int, descripcion string)',
      clients: ['web'],
      method: 'post',
      path: (ctx) => `/pacientes/${ctx.pacienteId}/diagnosticos`,
      body: (ctx) => ({
        id_cita: ctx.citaId,
        descripcion: 'Diagnóstico de prueba contrato',
      }),
      requestSchema: {
        id_cita: 'integer',
        descripcion: 'string',
      },
      expectStatuses: [200, 201],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId || !ctx.citaId,
      after: (ctx, res) => {
        const id =
          res.data?.data?.id_diagnostico ||
          res.data?.data?.id ||
          res.data?.id_diagnostico;
        if (id) ctx.diagnosticoId = id;
      },
    },
    {
      id: 'diagnostico.delete',
      description: 'DELETE diagnóstico',
      clients: ['web'],
      method: 'delete',
      path: (ctx) =>
        `/pacientes/${ctx.pacienteId}/diagnosticos/${ctx.diagnosticoId}`,
      expectStatuses: [200, 204],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId || !ctx.diagnosticoId,
    },
    {
      id: 'red_apoyo.post.valid',
      description: 'POST red de apoyo (campos backend: nombre_contacto, etc.)',
      clients: ['web'],
      method: 'post',
      path: (ctx) => `/pacientes/${ctx.pacienteId}/red-apoyo`,
      body: () => ({
        nombre_contacto: 'Contacto Contrato',
        parentesco: 'Familiar',
        numero_celular: '5551234567',
        email: 'contacto@test.local',
        direccion: 'Calle 1',
        localidad: 'Local',
      }),
      requestSchema: {
        nombre_contacto: 'string',
        parentesco: 'string',
        numero_celular: 'string',
        email: 'string',
        direccion: 'string',
        localidad: 'string',
      },
      expectStatuses: [200, 201],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId,
      after: (ctx, res) => {
        const raw = res.data?.data;
        const id = raw?.id_red_apoyo ?? raw?.id_contacto ?? raw?.id;
        if (id) ctx.redApoyoId = id;
      },
    },
    {
      id: 'red_apoyo.delete',
      description: 'DELETE contacto red de apoyo',
      clients: ['web'],
      method: 'delete',
      path: (ctx) =>
        `/pacientes/${ctx.pacienteId}/red-apoyo/${ctx.redApoyoId}`,
      expectStatuses: [200, 204],
      skipIf: (ctx) => !ctx.token || !ctx.pacienteId || !ctx.redApoyoId,
    },
    {
      id: 'mobile.refresh_token.shape',
      description: 'POST /mobile/refresh-token: refresh_token string (cliente app)',
      clients: ['mobile'],
      method: 'post',
      path: () => '/mobile/refresh-token',
      body: (ctx) => ({
        refresh_token: ctx.refreshToken,
      }),
      requestSchema: { refresh_token: 'string' },
      expectStatuses: [200],
      skipIf: (ctx) => !ctx.refreshToken,
    },
    {
      id: 'mobile.login.same_shape_as_web',
      description: 'POST /mobile/login: email y password string (app móvil)',
      clients: ['mobile'],
      method: 'post',
      path: () => '/mobile/login',
      body: () => ({
        email: adminEmail().toLowerCase(),
        password: adminPassword(),
      }),
      requestSchema: {
        email: 'string',
        password: 'string',
      },
      expectStatuses: [200],
      skipIf: () => !adminEmail() || !adminPassword(),
      after: (ctx, res) => {
        const t = res.data?.token || res.data?.data?.token;
        if (t) ctx.token = t;
        const rt = res.data?.refresh_token || res.data?.data?.refresh_token;
        if (rt) ctx.refreshToken = rt;
      },
    },
    {
      id: 'cita.put.estado',
      description: 'PUT /citas/:id/estado: estado string (enum en backend)',
      clients: ['web'],
      method: 'put',
      path: (ctx) => `/citas/${ctx.citaId}/estado`,
      body: () => ({
        estado: 'atendida',
        observaciones: 'Contrato tipos',
      }),
      requestSchema: {
        estado: 'string',
        observaciones: 'string',
      },
      expectStatuses: [200, 400],
      skipIf: (ctx) => !ctx.token || !ctx.citaId,
    },
    {
      id: 'auth.change_password.shape',
      description:
        'PUT /auth/change-password: tipos string (contraseña actual incorrecta → no modifica cuenta)',
      clients: ['web'],
      method: 'put',
      path: () => '/auth/change-password',
      body: () => ({
        currentPassword: '__contrato_tipos_no_es_la_real__',
        newPassword: 'NuevaSegura9!',
      }),
      requestSchema: {
        currentPassword: 'string',
        newPassword: 'string',
      },
      expectStatuses: [400, 401, 403],
      skipIf: (ctx) => !ctx.token,
    },
  ];
}

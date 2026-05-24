const API = (process.env.API_BASE_URL || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const email = process.env.TEST_EMAIL || 'eduardolalito99@hotmail.com';
const pass = process.env.TEST_PASSWORD || 'Admin123!';

async function req(method, path, body, token) {
  const t0 = Date.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data, ms: Date.now() - t0 };
}

const login = await req('POST', '/api/auth/login', { email, password: pass });
if (!login.data?.token) {
  console.error('Login failed', login.status, login.data);
  process.exit(1);
}
const token = login.data.token;

const pac = await req('GET', '/api/pacientes?limit=5&search=QA', null, token);
const id = pac.data?.data?.pacientes?.[0]?.id_paciente ?? pac.data?.pacientes?.[0]?.id_paciente;
console.log(`Paciente QA id=${id} (${pac.ms}ms)`);

const fin = new Date().toISOString().slice(0, 10);
const ini = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
const mon = await req(
  'GET',
  `/api/pacientes/${id}/signos-vitales/evolucion?fechaInicio=${ini}&fechaFin=${fin}&monthlyOnly=1`,
  null,
  token
);
console.log(`Evolución monthlyOnly: ok=${mon.ok} ${mon.ms}ms total=${mon.data?.total} meses=${mon.data?.monthly?.length}`);

const evo = await req(
  'GET',
  `/api/pacientes/${id}/signos-vitales/evolucion?fechaInicio=${ini}&fechaFin=${fin}&maxPoints=60`,
  null,
  token
);
console.log(
  `Evolución puntos: ok=${evo.ok} ${evo.ms}ms total=${evo.data?.total} puntos=${evo.data?.data?.length} truncated=${evo.data?.truncated}`
);

const dash = await req('GET', '/api/dashboard/doctor/summary', null, token);
console.log(`Dashboard: ok=${dash.ok} ${dash.ms}ms`);

const list = await req('GET', '/api/pacientes?limit=20', null, token);
const n = list.data?.data?.pacientes?.length ?? list.data?.pacientes?.length ?? 0;
console.log(`Pacientes: ok=${list.ok} ${list.ms}ms count=${n}`);

process.exit(evo.ok && dash.ok && list.ok ? 0 : 1);

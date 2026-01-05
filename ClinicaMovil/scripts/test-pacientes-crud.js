// Frontend-side E2E-like test for Pacientes CRUD using axios
// Usage: node scripts/test-pacientes-crud.js --base http://localhost:3000

import axios from 'axios';

function parseArgs() {
	const args = process.argv.slice(2);
	const out = {};
	for (let i = 0; i < args.length; i += 2) {
		const k = args[i];
		const v = args[i + 1];
		if (!k?.startsWith('--')) continue;
		out[k.substring(2)] = v;
	}
	return out;
}

function h(token) {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loginAdmin(base) {
	// idempotent register -> login
	try {
		await axios.post(`${base}/api/auth/register`, {
			email: 'admin.qa@example.com',
			password: 'AdminQa#123',
			rol: 'Admin',
		}).catch(() => {});
		const l = await axios.post(`${base}/api/auth/login`, {
			email: 'admin.qa@example.com',
			password: 'AdminQa#123',
		});
		return l.data.token;
	} catch (e) {
		throw new Error(`Auth failed: ${e.response?.status} ${(e.response?.data && JSON.stringify(e.response.data)) || e.message}`);
	}
}

async function main() {
	const { base = 'http://localhost:3000' } = parseArgs();
	const token = await loginAdmin(base);
	const headers = h(token);

	const results = [];
	const step = async (name, fn) => {
		const start = Date.now();
		try {
			const data = await fn();
			results.push({ name, ok: true, ms: Date.now() - start });
			console.log(`✅ ${name} (${Date.now() - start}ms)`);
			return data;
		} catch (e) {
			const status = e.response?.status;
			const msg = e.response?.data || e.message;
			results.push({ name, ok: false, ms: Date.now() - start, status, msg });
			console.error(`❌ ${name} (${Date.now() - start}ms)`, status, msg);
			throw e;
		}
	};

	// CREATE
	const created = await step('Crear Paciente', async () => {
		const res = await axios.post(`${base}/api/pacientes`, {
			nombre: 'Paciente QA',
			apellido_paterno: 'Prueba',
			sexo: 'Mujer',
			fecha_nacimiento: '1990-01-01',
			institucion_salud: 'IMSS',
			direccion: 'Calle QA 123',
			localidad: 'CDMX',
			numero_celular: '5550009999',
		}, { headers });
		return res.data;
	});

	const pacienteId = created?.id_paciente || created?.data?.id_paciente || created?.id || created?.data?.id;

	// READ list
	await step('Listar Pacientes', async () => {
		const res = await axios.get(`${base}/api/pacientes`, { headers });
		return res.data;
	});

	// READ by id
	await step('Obtener Paciente por ID', async () => {
		const res = await axios.get(`${base}/api/pacientes/${pacienteId}`, { headers });
		return res.data;
	});

	// UPDATE
	await step('Actualizar Paciente', async () => {
		const res = await axios.put(`${base}/api/pacientes/${pacienteId}`, {
			nombre: 'Paciente QA Editado',
		}, { headers });
		return res.data;
	});

	// DELETE
	await step('Eliminar Paciente', async () => {
		const res = await axios.delete(`${base}/api/pacientes/${pacienteId}`, { headers });
		return { status: res.status };
	});

	const ok = results.filter(r => r.ok).length;
	const fail = results.length - ok;
	console.log('\n===== RESUMEN PACIENTES CRUD (frontend) =====');
	results.forEach(r => console.log(`${r.ok ? '✔️' : '❌'} ${r.name} - ${r.ms}ms`));
	console.log('OK:', ok, 'FAIL:', fail);
	if (fail > 0) process.exit(2);
}

main().catch(err => {
	console.error('Error fatal prueba pacientes:', err?.message || err);
	process.exit(1);
});







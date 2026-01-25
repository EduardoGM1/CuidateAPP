import { jest } from '@jest/globals';

const mockCita = { findByPk: jest.fn() };
const mockPaciente = {};
const mockDoctor = {};
const mockSignoVital = {};
const mockDiagnostico = {};
const mockPlanMedicacion = {};
const mockPuntoChequeo = {};
const mockEsquemaVacunacion = {};
const mockDoctorPaciente = {};
const mockComorbilidad = {};
const mockPacienteComorbilidad = {};

jest.mock('../models/associations.js', () => ({
	Cita: mockCita,
	Paciente: mockPaciente,
	Doctor: mockDoctor,
	SignoVital: mockSignoVital,
	Diagnostico: mockDiagnostico,
	PlanMedicacion: mockPlanMedicacion,
	PuntoChequeo: mockPuntoChequeo,
	EsquemaVacunacion: mockEsquemaVacunacion,
	DoctorPaciente: mockDoctorPaciente,
	Comorbilidad: mockComorbilidad,
	PacienteComorbilidad: mockPacienteComorbilidad
}));

// Importar getCita después de los mocks
import { getCita } from '../controllers/cita.js';

describe('Cita -> incluye SignosVitales en getCita', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('debe retornar la cita con arreglo SignosVitales cuando existan registros vinculados', async () => {
		const signos = [
			{ id_signo: 1, id_cita: 10, presion_sistolica: 120, presion_diastolica: 80 },
			{ id_signo: 2, id_cita: 10, peso_kg: 70.5 }
		];

		const citaMock = { id_cita: 10, Paciente: { nombre: 'Juan', apellido_paterno: 'P' }, Doctor: { nombre: 'Ana', apellido_paterno: 'D' }, SignosVitales: signos };

		mockCita.findByPk.mockResolvedValue(citaMock);

		const req = { params: { id: 10 } };
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await getCita(req, res);

		expect(mockCita.findByPk).toHaveBeenCalledWith(10, expect.objectContaining({ include: expect.any(Array) }));
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ SignosVitales: expect.any(Array) }));
		const response = res.json.mock.calls[0][0];
		expect(response.SignosVitales).toHaveLength(2);
	});

	it('debe responder 404 si la cita no existe', async () => {
		mockCita.findByPk.mockResolvedValue(null);
		const req = { params: { id: 999 } };
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await getCita(req, res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({ error: 'Cita no encontrada' });
	});
});

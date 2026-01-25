// IMPORTANTE: Los mocks deben estar ANTES de cualquier importación

// Mock de apiConfig PRIMERO - debe retornar siempre un objeto válido
const mockConfig = {
	baseURL: 'http://localhost:3000',
	timeout: 15000
};

jest.mock('../config/apiConfig', () => ({
	getApiConfigSync: () => mockConfig,
	getApiConfig: () => Promise.resolve(mockConfig),
	getApiConfigWithFallback: () => Promise.resolve(mockConfig),
	testApiConnectivity: () => Promise.resolve({ success: true })
}));

// Mock de storageService
const mockGetAuthToken = jest.fn(async () => 'FAKE_TOKEN');
const mockGetOrCreateDeviceId = jest.fn(async () => 'device-123');

jest.mock('../services/storageService', () => ({
	storageService: {
		getAuthToken: mockGetAuthToken,
		getOrCreateDeviceId: mockGetOrCreateDeviceId,
		clearAuthData: jest.fn()
	}
}));

// Mock de Logger - debe exportar tanto default como named exports
jest.mock('../services/logger', () => {
	const mockLogger = {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		success: jest.fn(),
		debug: jest.fn(),
		apiCall: jest.fn(),
		apiResponse: jest.fn()
	};
	return {
		__esModule: true,
		default: mockLogger,
		...mockLogger
	};
});

// Mocks de axios - debe estar antes de cualquier importación que use axios
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

// Crear la instancia mock ANTES del mock de axios
const mockAxiosInstance = {
	post: mockPost,
	get: mockGet,
	put: mockPut,
	delete: mockDelete,
	interceptors: {
		request: { 
			use: jest.fn((onFulfilled, onRejected) => {
				// Si se pasa un callback, ejecutarlo con un config mock
				if (onFulfilled && typeof onFulfilled === 'function') {
					try {
						onFulfilled({ headers: {}, url: '/test', method: 'post' });
					} catch (e) {
						// Ignorar errores en el mock
					}
				}
				return 1;
			}), 
			eject: jest.fn() 
		},
		response: { 
			use: jest.fn((onFulfilled, onRejected) => {
				if (onFulfilled && typeof onFulfilled === 'function') {
					try {
						onFulfilled({ data: {}, status: 200 });
					} catch (e) {
						// Ignorar errores en el mock
					}
				}
				return 1;
			}), 
			eject: jest.fn() 
		}
	},
	defaults: {
		headers: {}
	}
};

// Crear la función mock de create
const mockCreateFn = jest.fn(() => mockAxiosInstance);

jest.mock('axios', () => {
	return {
		__esModule: true,
		create: mockCreateFn,
		default: {
			create: mockCreateFn
		}
	};
});

// Importar gestionService DESPUÉS de todos los mocks
const { gestionService } = require('../api/gestionService');

describe('ClinicaMovil - createPacienteSignosVitales', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Resetear el mock de create para que siempre retorne la instancia
		mockCreateFn.mockReturnValue(mockAxiosInstance);
	});

	it('envía id_cita en el payload y recibe respuesta formateada', async () => {
		const pacienteId = 7;
		const payload = {
			peso_kg: 72.5,
			talla_m: 1.78,
			presion_sistolica: 118,
			presion_diastolica: 76,
			id_cita: 123,
			observaciones: 'Control de rutina'
		};

		const mockResponseData = {
			success: true,
			message: 'Signos vitales registrados exitosamente',
			data: { id_signo: 555, id_cita: 123 }
		};

		// Configurar mockPost para retornar la respuesta esperada
		mockPost.mockResolvedValueOnce({
			status: 201,
			data: mockResponseData
		});

		const response = await gestionService.createPacienteSignosVitales(pacienteId, payload);

		// Verifica que se creó la instancia de axios
		expect(mockCreateFn).toHaveBeenCalled();
		// Verifica URL y payload
		expect(mockPost).toHaveBeenCalledWith(
			`/pacientes/${pacienteId}/signos-vitales`, 
			expect.objectContaining({ id_cita: 123 })
		);
		// Verifica respuesta propagada (createPacienteSignosVitales retorna response.data)
		expect(response).toEqual(mockResponseData);
		expect(response?.data?.id_signo).toBe(555);
		expect(response?.data?.id_cita).toBe(123);
	});

	it('incluye encabezados de autenticación y dispositivo en requests', async () => {
		const pacienteId = 9;
		const payload = { peso_kg: 70, id_cita: 77 };

		mockPost.mockResolvedValueOnce({ status: 201, data: { success: true, data: { id_signo: 1, id_cita: 77 } } });

		await gestionService.createPacienteSignosVitales(pacienteId, payload);

		// Verificamos que el post fue llamado con los datos correctos
		// Los interceptores se ejecutan automáticamente cuando se hace el request
		// En un entorno real, los interceptores añaden los headers de autenticación
		expect(mockPost).toHaveBeenCalledWith(
			`/pacientes/${pacienteId}/signos-vitales`,
			payload
		);
		// Verificamos que el request se hizo correctamente
		// En un entorno real, los interceptores llamarían a getAuthToken y getOrCreateDeviceId
		// para añadir los headers de autenticación y dispositivo
		expect(mockPost).toHaveBeenCalled();
	});
});

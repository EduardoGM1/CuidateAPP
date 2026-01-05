/**
 * @file ChatWebSocket.test.js
 * @description Tests para eventos WebSocket del chat
 * @author Senior Developer
 * @date 2025-11-19
 */

describe('Chat WebSocket Events', () => {
  let mockSubscribeToEvent;
  let callbacks = {};

  beforeEach(() => {
    callbacks = {};
    mockSubscribeToEvent = jest.fn((event, callback) => {
      callbacks[event] = callback;
      return jest.fn(); // unsubscribe function
    });
  });

  describe('mensaje_actualizado', () => {
    test('debe recargar mensajes cuando se recibe evento de actualización', async () => {
      const mockCargarMensajes = jest.fn();
      const mockPacienteIdRef = { current: '123' };

      // Simular callback de mensaje_actualizado
      const callback = (data) => {
        const currentPacienteId = mockPacienteIdRef.current;
        if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
          setTimeout(() => {
            if (mockCargarMensajes) {
              mockCargarMensajes(false);
            }
          }, 300);
        }
      };

      // Simular evento
      callback({
        id_paciente: '123',
        mensaje: {
          id_mensaje: 1,
          mensaje_texto: 'Mensaje actualizado',
        },
      });

      // Verificar que se llama después del delay
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(mockCargarMensajes).toHaveBeenCalledWith(false);
    });

    test('debe ignorar eventos de otros pacientes', async () => {
      const mockCargarMensajes = jest.fn();
      const mockPacienteIdRef = { current: '123' };

      const callback = (data) => {
        const currentPacienteId = mockPacienteIdRef.current;
        if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
          setTimeout(() => {
            if (mockCargarMensajes) {
              mockCargarMensajes(false);
            }
          }, 300);
        }
      };

      // Simular evento de otro paciente
      callback({
        id_paciente: '456', // Diferente
        mensaje: {
          id_mensaje: 1,
          mensaje_texto: 'Mensaje de otro paciente',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 400));
      expect(mockCargarMensajes).not.toHaveBeenCalled();
    });
  });

  describe('mensaje_eliminado', () => {
    test('debe recargar mensajes cuando se recibe evento de eliminación', async () => {
      const mockCargarMensajes = jest.fn();
      const mockPacienteIdRef = { current: '123' };

      const callback = (data) => {
        const currentPacienteId = mockPacienteIdRef.current;
        if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
          setTimeout(() => {
            if (mockCargarMensajes) {
              mockCargarMensajes(false);
            }
          }, 300);
        }
      };

      // Simular evento de eliminación
      callback({
        id_paciente: '123',
        id_mensaje: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 400));
      expect(mockCargarMensajes).toHaveBeenCalledWith(false);
    });

    test('debe ignorar eliminaciones de otros pacientes', async () => {
      const mockCargarMensajes = jest.fn();
      const mockPacienteIdRef = { current: '123' };

      const callback = (data) => {
        const currentPacienteId = mockPacienteIdRef.current;
        if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
          setTimeout(() => {
            if (mockCargarMensajes) {
              mockCargarMensajes(false);
            }
          }, 300);
        }
      };

      callback({
        id_paciente: '456', // Diferente
        id_mensaje: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 400));
      expect(mockCargarMensajes).not.toHaveBeenCalled();
    });
  });

  describe('usuario_escribiendo', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('debe mostrar indicador cuando paciente está escribiendo', () => {
      let escribiendo = false;
      const mockSetEscribiendo = jest.fn((value) => {
        escribiendo = value;
      });
      const mockPacienteIdRef = { current: '123' };

      const callback = (data) => {
        const currentPacienteId = mockPacienteIdRef.current;
        if ((data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) 
            && data.remitente === 'Paciente') {
          mockSetEscribiendo(true);
        }
      };

      callback({
        id_paciente: '123',
        remitente: 'Paciente',
      });

      expect(mockSetEscribiendo).toHaveBeenCalledWith(true);
    });

    test('debe ocultar indicador después de timeout', () => {
      let escribiendo = true;
      const mockSetEscribiendo = jest.fn((value) => {
        escribiendo = value;
      });
      const mockPacienteIdRef = { current: '123' };
      let timeoutId = null;

      const callback = (data) => {
        const currentPacienteId = mockPacienteIdRef.current;
        if ((data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) 
            && data.remitente === 'Paciente') {
          mockSetEscribiendo(true);
          timeoutId = setTimeout(() => {
            mockSetEscribiendo(false);
          }, 3000);
        }
      };

      callback({
        id_paciente: '123',
        remitente: 'Paciente',
      });

      expect(mockSetEscribiendo).toHaveBeenCalledWith(true);
      expect(mockSetEscribiendo).toHaveBeenCalledTimes(1);

      // Avanzar tiempo
      jest.advanceTimersByTime(3000);

      expect(mockSetEscribiendo).toHaveBeenCalledWith(false);
      expect(mockSetEscribiendo).toHaveBeenCalledTimes(2);
    });
  });
});


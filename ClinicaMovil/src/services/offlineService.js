/**
 * Servicio de Modo Offline
 * 
 * Maneja la cola de sincronización para operaciones offline.
 * Almacena operaciones pendientes y las sincroniza cuando hay conexión.
 */

import { storageService } from './storageService';
import Logger from './logger';
import NetInfo from '@react-native-community/netinfo';

class OfflineService {
  constructor() {
    this.queue = [];
    this.isOnline = true;
    this.syncing = false;
    this.maxRetries = 3;
    this.syncInterval = null;
  }

  /**
   * Inicializar el servicio
   */
  async initialize() {
    try {
      // Cargar cola guardada
      await this.loadQueue();
      
      // Monitorear estado de conexión
      this.setupNetworkListener();
      
      // Iniciar sincronización automática
      this.startAutoSync();
      
      Logger.info('OfflineService: Inicializado correctamente');
    } catch (error) {
      Logger.error('OfflineService: Error en inicialización', error);
    }
  }

  /**
   * Configurar listener de red
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (wasOffline && this.isOnline) {
        Logger.info('OfflineService: Conexión restaurada, iniciando sincronización');
        this.syncQueue();
      }
      
      Logger.debug('OfflineService: Estado de red', { 
        isOnline: this.isOnline,
        type: state.type 
      });
    });
  }

  /**
   * Agregar operación a la cola
   */
  async addToQueue(operation) {
    try {
      const queueItem = {
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: operation.type, // 'create', 'update', 'delete'
        resource: operation.resource, // 'signoVital', 'cita', etc.
        data: operation.data,
        timestamp: new Date().toISOString(),
        retries: 0,
        status: 'pending',
      };

      this.queue.push(queueItem);
      await this.saveQueue();
      
      Logger.info('OfflineService: Operación agregada a la cola', { 
        id: queueItem.id,
        operation: operation.type,
        resource: operation.resource 
      });

      // Intentar sincronizar si hay conexión
      if (this.isOnline) {
        this.syncQueue();
      }

      return queueItem.id;
    } catch (error) {
      Logger.error('OfflineService: Error agregando a la cola', error);
      throw error;
    }
  }

  /**
   * Sincronizar cola
   */
  async syncQueue() {
    if (this.syncing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncing = true;
    Logger.info('OfflineService: Iniciando sincronización', { 
      queueLength: this.queue.length 
    });

    const pendingItems = this.queue.filter(item => item.status === 'pending');
    
    for (const item of pendingItems) {
      try {
        await this.executeOperation(item);
        item.status = 'completed';
        Logger.info('OfflineService: Operación sincronizada', { id: item.id });
      } catch (error) {
        item.retries++;
        Logger.error('OfflineService: Error sincronizando operación', { 
          id: item.id,
          error: error.message,
          retries: item.retries 
        });

        if (item.retries >= this.maxRetries) {
          item.status = 'failed';
          Logger.error('OfflineService: Operación fallida después de reintentos', { 
            id: item.id 
          });
        }
      }
    }

    // Limpiar operaciones completadas y fallidas
    this.queue = this.queue.filter(item => 
      item.status === 'pending' || item.status === 'processing'
    );
    
    await this.saveQueue();
    this.syncing = false;

    Logger.info('OfflineService: Sincronización completada', { 
      remaining: this.queue.length 
    });
  }

  /**
   * Ejecutar operación individual
   */
  async executeOperation(item) {
    // Importar servicios dinámicamente para evitar dependencias circulares
    const gestionService = (await import('../api/gestionService')).default;
    
    switch (item.operation) {
      case 'create':
        return await this.executeCreate(item, gestionService);
      case 'update':
        return await this.executeUpdate(item, gestionService);
      case 'delete':
        return await this.executeDelete(item, gestionService);
      default:
        throw new Error(`Operación no soportada: ${item.operation}`);
    }
  }

  /**
   * Ejecutar creación
   */
  async executeCreate(item, gestionService) {
    // Para mensajes de chat, usar chatService directamente (no está en gestionService)
    if (item.resource === 'mensajeChat') {
      const chatService = (await import('../api/chatService')).default;
      if (item.data.mensaje_texto) {
        return await chatService.enviarMensajeTexto(
          item.data.id_paciente,
          item.data.id_doctor,
          item.data.remitente,
          item.data.mensaje_texto
        );
      } else if (item.data.mensaje_audio_url) {
        return await chatService.enviarMensajeAudio(
          item.data.id_paciente,
          item.data.id_doctor,
          item.data.remitente,
          item.data.mensaje_audio_url,
          item.data.mensaje_audio_duracion,
          item.data.mensaje_audio_transcripcion
        );
      } else {
        throw new Error('Mensaje de chat sin texto ni audio');
      }
    }

    const resourceMap = {
      signoVital: 'createSignoVital',
      pacienteSignoVital: 'createPacienteSignosVitales', // Para pacientes
      medicamentoToma: 'registrarTomaMedicamento', // Para confirmación de medicamentos
      cita: 'createCita',
      diagnostico: 'createDiagnostico',
      medicamento: 'createMedicamento',
    };

    const method = resourceMap[item.resource];
    if (!method || !gestionService[method]) {
      throw new Error(`Método no encontrado para ${item.resource}`);
    }

    // Para createPacienteSignosVitales, los datos vienen como { pacienteId, signosVitalesData }
    if (method === 'createPacienteSignosVitales' && item.data.pacienteId) {
      return await gestionService[method](item.data.pacienteId, item.data.signosVitalesData);
    }

    // Para registrarTomaMedicamento, los datos vienen como { id_plan_medicacion, id_plan_detalle, hora_toma, observaciones }
    if (method === 'registrarTomaMedicamento') {
      return await gestionService[method](
        item.data.id_plan_medicacion,
        item.data.id_plan_detalle || null,
        item.data.hora_toma || null,
        item.data.observaciones || null
      );
    }

    return await gestionService[method](item.data);
  }

  /**
   * Ejecutar actualización
   */
  async executeUpdate(item, gestionService) {
    const resourceMap = {
      signoVital: 'updateSignoVital',
      cita: 'updateCita',
      diagnostico: 'updateDiagnostico',
      medicamento: 'updateMedicamento',
    };

    const method = resourceMap[item.resource];
    if (!method || !gestionService[method]) {
      throw new Error(`Método no encontrado para ${item.resource}`);
    }

    return await gestionService[method](item.data.id, item.data);
  }

  /**
   * Ejecutar eliminación
   */
  async executeDelete(item, gestionService) {
    const resourceMap = {
      signoVital: 'deleteSignoVital',
      cita: 'deleteCita',
      diagnostico: 'deleteDiagnostico',
      medicamento: 'deleteMedicamento',
    };

    const method = resourceMap[item.resource];
    if (!method || !gestionService[method]) {
      throw new Error(`Método no encontrado para ${item.resource}`);
    }

    return await gestionService[method](item.data.id);
  }

  /**
   * Guardar cola en almacenamiento local
   */
  async saveQueue() {
    try {
      await storageService.setItem('offline_queue', this.queue);
    } catch (error) {
      Logger.error('OfflineService: Error guardando cola', error);
    }
  }

  /**
   * Cargar cola desde almacenamiento local
   */
  async loadQueue() {
    try {
      const savedQueue = await storageService.getItem('offline_queue');
      if (savedQueue && Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        Logger.info('OfflineService: Cola cargada', { count: this.queue.length });
      }
    } catch (error) {
      Logger.error('OfflineService: Error cargando cola', error);
      this.queue = [];
    }
  }

  /**
   * Iniciar sincronización automática
   */
  startAutoSync() {
    // Sincronizar cada 30 segundos si hay conexión
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.syncQueue();
      }
    }, 30000);
  }

  /**
   * Detener sincronización automática
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Obtener estado de la cola
   */
  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      completed: this.queue.filter(item => item.status === 'completed').length,
      failed: this.queue.filter(item => item.status === 'failed').length,
      isOnline: this.isOnline,
      syncing: this.syncing,
    };
  }

  /**
   * Limpiar cola
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    Logger.info('OfflineService: Cola limpiada');
  }

  /**
   * Obtener cola completa (para debugging)
   */
  async getQueue() {
    await this.loadQueue(); // Asegurar que tenemos la última versión
    return this.queue;
  }
}

// Singleton
const offlineService = new OfflineService();

export default offlineService;


import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Hook para monitorear el rendimiento de la aplicación
 * 
 * Mide:
 * - Tiempo de renderizado de componentes
 * - FPS (Frames per second)
 * - Uso de memoria
 * - Tiempo de respuesta de operaciones
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - Activar/desactivar monitoreo
 * @param {number} options.sampleInterval - Intervalo de muestreo en ms (default: 1000)
 * @returns {Object} Métricas de rendimiento
 */
const usePerformanceMonitor = ({ enabled = true, sampleInterval = 1000 } = {}) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    renderCount: 0,
    lastRenderTime: 0,
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const renderStartTimeRef = useRef(performance.now());
  const frameTimesRef = useRef([]);
  const intervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Medir tiempo de renderizado - usando refs para evitar loops infinitos
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  // Actualizar métricas de render periódicamente (cada 500ms) para evitar loops
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        renderCount: renderCountRef.current,
        lastRenderTime: lastRenderTimeRef.current,
      }));
    }, 500); // Actualizar métricas cada 500ms

    return () => clearInterval(intervalId);
  }, [enabled]);

  // Rastrear renders sin causar actualizaciones de estado
  useLayoutEffect(() => {
    if (!enabled) return;

    const now = performance.now();
    const renderTime = now - renderStartTimeRef.current;

    // Solo actualizar refs (no causa re-render)
    renderCountRef.current += 1;
    if (renderTime > 0 && renderTime < 1000) { // Validar tiempo razonable
      lastRenderTimeRef.current = renderTime;
    }

    // Capturar tiempo de inicio para el próximo render
    renderStartTimeRef.current = performance.now();
  });

  // Medir FPS
  useEffect(() => {
    if (!enabled) return;

    const measureFPS = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTimeRef.current;
      
      frameCountRef.current++;
      
      // Calcular FPS cada segundo
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        const avgFrameTime = deltaTime / frameCountRef.current;
        
        frameTimesRef.current.push(avgFrameTime);
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }
        
        const avgFrameTimeFromHistory = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          frameTime: avgFrameTimeFromHistory,
        }));
        
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
      
      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    animationFrameRef.current = requestAnimationFrame(measureFPS);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Medir uso de memoria periódicamente
  useEffect(() => {
    if (!enabled) return;

    const measureMemory = () => {
      if (performance.memory) {
        const memoryMB = performance.memory.usedJSHeapSize / 1048576;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memoryMB * 100) / 100,
        }));
      }
    };

    intervalRef.current = setInterval(measureMemory, sampleInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, sampleInterval]);

  // Medir tiempo de operaciones específicas
  const measureOperation = (operationName, operation) => {
    if (!enabled) return operation();
    
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ ${operationName}: ${duration.toFixed(2)}ms`);
    
    return result;
  };

  // Medir tiempo de operaciones asíncronas
  const measureAsyncOperation = async (operationName, operation) => {
    if (!enabled) return operation();
    
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ ${operationName}: ${duration.toFixed(2)}ms`);
    
    return result;
  };

  // Resetear métricas
  const resetMetrics = () => {
    frameCountRef.current = 0;
    lastFrameTimeRef.current = Date.now();
    frameTimesRef.current = [];
    renderCountRef.current = 0;
    lastRenderTimeRef.current = 0;
    renderStartTimeRef.current = performance.now();
    setMetrics({
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      renderCount: 0,
      lastRenderTime: 0,
    });
  };

  return {
    metrics,
    measureOperation,
    measureAsyncOperation,
    resetMetrics,
  };
};

export default usePerformanceMonitor;


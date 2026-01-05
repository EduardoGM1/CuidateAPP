import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce de valores
 * @param {any} value - Valor a debounce
 * @param {number} delay - Tiempo de espera en milisegundos (por defecto 300ms)
 * @returns {any} - Valor debounced
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearch = useDebounce(searchQuery, 300);
 * 
 * // Usar debouncedSearch en useEffect en lugar de searchQuery
 * useEffect(() => {
 *   // Filtrar con debouncedSearch
 * }, [debouncedSearch]);
 */
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Establecer un timer que actualizará el valor debounced después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timer si el valor cambia antes del delay
    // O si el componente se desmonta
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-ejecutar si value o delay cambian

  return debouncedValue;
};

export default useDebounce;


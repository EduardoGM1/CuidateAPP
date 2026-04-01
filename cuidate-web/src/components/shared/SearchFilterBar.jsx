import { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button } from '../ui';
import { normalizeString } from '../../utils/sanitize';

const DEBOUNCE_MS = 400;

/**
 * Barra de búsqueda y filtros. Emite onSearch con params normalizados.
 * @param {{ onSearch: (params: Record<string, string|number>) => void, placeholder?: string, filterOptions?: { key: string, label: string, options: { value: string, label: string }[] }[] }} props
 */
export default function SearchFilterBar({
  onSearch,
  placeholder = 'Buscar…',
  filterOptions = [],
  initialSearch = '',
  initialFilters = {},
}) {
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);
  const timerRef = useRef(null);
  const latestSearchRef = useRef(initialSearch || '');
  const latestFiltersRef = useRef(initialFilters || {});

  useEffect(() => {
    setSearch(initialSearch || '');
    latestSearchRef.current = initialSearch || '';
  }, [initialSearch]);

  useEffect(() => {
    setFilters(initialFilters || {});
    latestFiltersRef.current = initialFilters || {};
  }, [initialFilters]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const emitSearch = useCallback(() => {
    const term = normalizeString(latestSearchRef.current, { maxLength: 100 });
    const out = { ...latestFiltersRef.current, search: term };
    onSearch(out);
  }, [onSearch]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    latestSearchRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const term = normalizeString(value, { maxLength: 100 });
      const out = { ...latestFiltersRef.current, search: term };
      onSearch(out);
    }, DEBOUNCE_MS);
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters };
    if (value === '' || value == null) delete next[key];
    else next[key] = value;
    setFilters(next);
    latestFiltersRef.current = next;
    onSearch({
      ...next,
      search: normalizeString(latestSearchRef.current, { maxLength: 100 }),
    });
  };

  return (
    <div className="search-filter-bar">
      <div className="search-cell">
        <Input
          className="search-filter-bar-input-wrap"
          label=""
          type="search"
          placeholder={placeholder}
          value={search}
          onChange={handleSearchChange}
          maxLength={100}
        />
      </div>
      {filterOptions.map((filter) => (
        <div key={filter.key} className="filter-cell">
          <label className="filter-label">{filter.label}</label>
          <select
            value={filters[filter.key] ?? ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value || undefined)}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <Button
        type="button"
        variant="primary"
        onClick={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          emitSearch();
        }}
      >
        Buscar
      </Button>
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button } from '../ui';
import { normalizeString } from '../../utils/sanitize';

/**
 * Barra de búsqueda y filtros. Emite onSearch con params normalizados.
 * @param {{ onSearch: (params: Record<string, string|number>) => void, placeholder?: string, filterOptions?: { key: string, label: string, options: { value: string, label: string }[] }[], singleRow?: boolean, dateRange?: { fechaDesde?: string, fechaHasta?: string, onChange: (field: 'fecha_desde'|'fecha_hasta', value: string) => void, idPrefix?: string } }} props
 */
export default function SearchFilterBar({
  onSearch,
  onReset,
  placeholder = 'Buscar…',
  filterOptions = [],
  initialSearch = '',
  initialFilters = {},
  resetLabel = 'Restaurar filtros',
  singleRow = false,
  dateRange = null,
}) {
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedSearch, setAppliedSearch] = useState(normalizeString(initialSearch, { maxLength: 100 }));
  const latestSearchRef = useRef(initialSearch || '');
  const latestFiltersRef = useRef(initialFilters || {});

  useEffect(() => {
    setSearch(initialSearch || '');
    setAppliedSearch(normalizeString(initialSearch, { maxLength: 100 }));
    latestSearchRef.current = initialSearch || '';
  }, [initialSearch]);

  useEffect(() => {
    setFilters(initialFilters || {});
    latestFiltersRef.current = initialFilters || {};
  }, [initialFilters]);

  const emitSearch = useCallback(() => {
    const term = normalizeString(latestSearchRef.current, { maxLength: 100 });
    setAppliedSearch(term);
    const out = { ...latestFiltersRef.current, search: term };
    onSearch(out);
  }, [onSearch]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    latestSearchRef.current = value;
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      emitSearch();
    }
  };

  const handleReset = () => {
    setSearch('');
    setAppliedSearch('');
    latestSearchRef.current = '';
    const cleared = { ...initialFilters };
    setFilters(cleared);
    latestFiltersRef.current = cleared;
    if (typeof onReset === 'function') {
      onReset();
    } else {
      onSearch({ ...cleared, search: '' });
    }
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters };
    if (value === '' || value == null) delete next[key];
    else next[key] = value;
    setFilters(next);
    latestFiltersRef.current = next;
    onSearch({
      ...next,
      search: appliedSearch,
    });
  };

  const barClass = singleRow ? 'search-filter-bar search-filter-bar--single-row' : 'search-filter-bar';
  const dateIdPrefix = dateRange?.idPrefix || 'filter';

  return (
    <div className={barClass}>
      <div className="search-cell">
        <Input
          className="search-filter-bar-input-wrap"
          label=""
          type="search"
          placeholder={placeholder}
          value={search}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
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
      {dateRange && (
        <>
          <div className="filter-cell filter-cell--date">
            <label className="filter-label" htmlFor={`${dateIdPrefix}-fecha-desde`}>
              Fecha desde
            </label>
            <input
              id={`${dateIdPrefix}-fecha-desde`}
              type="date"
              className="search-filter-bar-date"
              value={dateRange.fechaDesde || ''}
              max={dateRange.fechaHasta || undefined}
              onChange={(e) => dateRange.onChange('fecha_desde', e.target.value)}
            />
          </div>
          <div className="filter-cell filter-cell--date">
            <label className="filter-label" htmlFor={`${dateIdPrefix}-fecha-hasta`}>
              Fecha hasta
            </label>
            <input
              id={`${dateIdPrefix}-fecha-hasta`}
              type="date"
              className="search-filter-bar-date"
              value={dateRange.fechaHasta || ''}
              min={dateRange.fechaDesde || undefined}
              onChange={(e) => dateRange.onChange('fecha_hasta', e.target.value)}
            />
          </div>
        </>
      )}
      <div className="search-filter-bar-actions">
      <Button type="button" variant="primary" onClick={emitSearch}>
        Buscar
      </Button>
      {typeof onReset === 'function' && (
        <Button type="button" variant="outline" onClick={handleReset}>
          {resetLabel}
        </Button>
      )}
      </div>
    </div>
  );
}

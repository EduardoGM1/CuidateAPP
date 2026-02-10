import { useMemo } from 'react';
import { Button } from '../ui';
import { parsePositiveInt } from '../../utils/params';

/**
 * Paginación reutilizable: texto "Mostrando X–Y de Z" y botones Anterior/Siguiente.
 * @param {number} currentPage - Página actual (1-based)
 * @param {number} totalItems - Total de registros
 * @param {number} pageSize - Registros por página
 * @param {(page: number) => void} onPageChange - Callback al cambiar página
 * @param {string} [ariaLabel] - Aria-label del contenedor
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  ariaLabel = 'Paginación',
}) {
  const totalItemsSafe = Math.max(0, parsePositiveInt(totalItems, 0));
  const pageSizeSafe = Math.max(1, parsePositiveInt(pageSize, 20));
  const currentPageSafe = Math.max(1, parsePositiveInt(currentPage, 1));

  const { totalPages, from, to, hasPrev, hasNext } = useMemo(() => {
    const total = totalItemsSafe;
    const size = pageSizeSafe;
    const page = currentPageSafe;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const pageBounded = Math.min(Math.max(1, page), totalPages);
    const from = total === 0 ? 0 : (pageBounded - 1) * size + 1;
    const to = Math.min(pageBounded * size, total);
    return {
      totalPages,
      from,
      to,
      hasPrev: pageBounded > 1,
      hasNext: pageBounded < totalPages,
      currentPageBounded: pageBounded,
    };
  }, [totalItemsSafe, pageSizeSafe, currentPageSafe]);

  const currentPageBounded = Math.min(Math.max(1, currentPageSafe), totalPages);

  const handlePrev = () => {
    if (currentPageBounded > 1) onPageChange?.(currentPageBounded - 1);
  };

  const handleNext = () => {
    if (currentPageBounded < totalPages) onPageChange?.(currentPageBounded + 1);
  };

  if (totalItemsSafe === 0 && currentPageSafe <= 1) {
    return null;
  }

  return (
    <nav
      className="pagination-bar"
      aria-label={ariaLabel}
      style={{
        marginTop: 'var(--space-4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-texto-secundario)',
        }}
      >
        {totalItemsSafe === 0
          ? 'Sin resultados'
          : `Mostrando ${from}–${to} de ${totalItemsSafe}`}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={!hasPrev}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-texto-secundario)',
            minWidth: '4rem',
            textAlign: 'center',
          }}
        >
          Página {currentPageBounded} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={handleNext}
          disabled={!hasNext}
          aria-label="Página siguiente"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}

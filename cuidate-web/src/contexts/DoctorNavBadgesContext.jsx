import { createContext, useContext, useMemo } from 'react';

const DoctorNavBadgesContext = createContext(null);

const noopRefresh = () => {};
const FALLBACK_BADGES = { refreshDoctorNavBadges: noopRefresh };

/**
 * Expone `refreshDoctorNavBadges` del layout para páginas hijas (p. ej. tras marcar notificación leída).
 */
export function DoctorNavBadgesProvider({ refresh, children }) {
  const value = useMemo(
    () => ({
      refreshDoctorNavBadges: typeof refresh === 'function' ? refresh : () => {},
    }),
    [refresh]
  );
  return <DoctorNavBadgesContext.Provider value={value}>{children}</DoctorNavBadgesContext.Provider>;
}

/** @returns {{ refreshDoctorNavBadges: () => void | Promise<void> }} */
export function useDoctorNavBadgesRefresh() {
  const ctx = useContext(DoctorNavBadgesContext);
  return ctx ?? FALLBACK_BADGES;
}

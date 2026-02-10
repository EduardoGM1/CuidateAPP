/** Claves de localStorage/sessionStorage */
export const STORAGE_KEYS = {
  TOKEN: 'cuidate_web_token',
  REFRESH_TOKEN: 'cuidate_web_refresh_token',
  USER: 'cuidate_web_user',
};

export function getStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

/** Regex alineado con validateInput y controllers/auth */
export const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  if (/\.\./.test(trimmed)) return false;
  return EMAIL_FORMAT_REGEX.test(trimmed);
}

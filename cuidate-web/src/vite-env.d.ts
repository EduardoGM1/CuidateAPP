/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API (sin barra final). Vacío = mismo origen (p. ej. /api vía Nginx). */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

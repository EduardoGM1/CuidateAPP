import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { verifyUploadSignature } from '../utils/uploadSignedUrl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(path.join(__dirname, '..', 'uploads'));

function resolveSafeUploadFile(requestPath) {
  const relative = String(requestPath || '').replace(/^\/+/, '');
  const absolute = path.normalize(path.join(UPLOADS_ROOT, relative));
  if (!absolute.startsWith(UPLOADS_ROOT)) return null;
  return absolute;
}

function sendUploadFile(req, res) {
  const absolute = resolveSafeUploadFile(req.path);
  if (!absolute) {
    return res.status(403).json({ error: 'Ruta no permitida' });
  }
  if (!fs.existsSync(absolute)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  const ext = path.extname(absolute).toLowerCase();
  const mimeByExt = {
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
  };
  if (mimeByExt[ext]) {
    res.setHeader('Content-Type', mimeByExt[ext]);
  }
  return res.sendFile(absolute);
}

function hasValidBearerJwt(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sirve /uploads solo con JWT válido o URL firmada (exp + sig).
 */
export function protectedUploads(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (hasValidBearerJwt(req)) {
    return sendUploadFile(req, res);
  }

  const uploadPath = `/uploads${req.path || ''}`;
  const { exp, sig } = req.query;
  if (verifyUploadSignature(uploadPath, exp, sig)) {
    return sendUploadFile(req, res);
  }

  return res.status(401).json({ error: 'Acceso no autorizado al recurso' });
}

export default protectedUploads;

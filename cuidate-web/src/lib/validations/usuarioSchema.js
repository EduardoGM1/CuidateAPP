import { z } from 'zod';
import { LIMITS } from '../../utils/constants';
import { ROLES } from '../../utils/constants';

const emailSchema = z
  .string()
  .min(1, 'El correo es obligatorio')
  .max(LIMITS.EMAIL_MAX, 'Correo demasiado largo')
  .email('Correo no válido');

/** Schema para crear usuario (Admin o Doctor) con opción de contraseña o invitación por correo */
export const nuevoUsuarioSchema = z
  .object({
    email: emailSchema,
    rol: z.enum([ROLES.ADMIN, ROLES.DOCTOR], { required_error: 'Elige un rol' }),
    modo: z.enum(['password', 'invite'], { required_error: 'Elige cómo dar acceso' }),
    password: z.string().max(LIMITS.PASSWORD_MAX, 'Contraseña demasiado larga').optional().or(z.literal('')),
    nombre: z.string().max(100, 'Demasiado largo').optional().or(z.literal('')),
    apellido_paterno: z.string().max(100, 'Demasiado largo').optional().or(z.literal('')),
    apellido_materno: z.string().max(100, 'Demasiado largo').optional().or(z.literal('')),
    id_modulo: z.union([z.string(), z.number()]).optional().transform((v) => {
      if (v === '' || v == null) return undefined;
      const n = Number(v);
      return Number.isNaN(n) || n <= 0 ? undefined : n;
    }),
  })
  .superRefine((data, ctx) => {
    if (data.modo === 'password') {
      const p = (data.password || '').trim();
      if (p.length < 8) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'La contraseña debe tener al menos 8 caracteres' });
      }
    }
    if (data.rol === ROLES.DOCTOR) {
      if (!(data.nombre || '').trim()) ctx.addIssue({ code: 'custom', path: ['nombre'], message: 'El nombre es obligatorio para doctor' });
      if (!(data.apellido_paterno || '').trim()) ctx.addIssue({ code: 'custom', path: ['apellido_paterno'], message: 'El apellido paterno es obligatorio para doctor' });
    }
  });

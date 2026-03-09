import { z } from 'zod';
import { LIMITS } from '../../utils/constants';

/** Schema para crear doctor con invitación: sin contraseña; se envía correo para confirmar y crear contraseña */
export const doctorCreateSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .max(LIMITS.EMAIL_MAX, 'Correo demasiado largo')
    .email('Correo no válido'),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Nombre demasiado largo'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio').max(100, 'Demasiado largo'),
  apellido_materno: z.string().max(100, 'Demasiado largo').optional().or(z.literal('')),
  id_modulo: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }),
});

export const doctorEditSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .max(LIMITS.EMAIL_MAX, 'Correo demasiado largo')
    .email('Correo no válido'),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Nombre demasiado largo'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio').max(100, 'Demasiado largo'),
  apellido_materno: z.string().max(100, 'Demasiado largo').optional().or(z.literal('')),
  id_modulo: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }),
  telefono: z.string().max(30, 'Demasiado largo').optional().or(z.literal('')),
});

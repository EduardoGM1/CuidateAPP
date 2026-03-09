import { z } from 'zod';
import { LIMITS } from '../../utils/constants';

const moduloOptional = z.union([z.string(), z.number()]).optional().transform((v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) || n <= 0 ? undefined : n;
});

/** Schema para crear doctor (invitación por correo o con contraseña). Paridad con app móvil. */
export const doctorCreateSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El correo es obligatorio')
      .max(LIMITS.EMAIL_MAX, 'Correo demasiado largo')
      .email('Correo no válido'),
    nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Nombre demasiado largo'),
    apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio').max(100, 'Demasiado largo'),
    apellido_materno: z.string().max(100, 'Demasiado largo').optional().or(z.literal('')),
    id_modulo: moduloOptional,
    telefono: z.string().max(30, 'Demasiado largo').optional().or(z.literal('')),
    institucion_hospitalaria: z.string().max(150, 'Demasiado largo').optional().or(z.literal('')),
    grado_estudio: z.string().max(120, 'Demasiado largo').optional().or(z.literal('')),
    anos_servicio: z.union([z.string(), z.number()]).optional().transform((v) => {
      if (v === '' || v == null) return undefined;
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) || n < 0 ? undefined : n;
    }),
    activo: z.boolean().optional().default(true),
    usePassword: z.boolean().optional().default(false),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128).optional().or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
  })
  .refine((data) => !data.usePassword || (data.password && data.password.length >= 8), {
    message: 'La contraseña debe tener al menos 8 caracteres',
    path: ['password'],
  })
  .refine((data) => !data.usePassword || data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
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
  id_modulo: moduloOptional,
  telefono: z.string().max(30, 'Demasiado largo').optional().or(z.literal('')),
  institucion_hospitalaria: z.string().max(150, 'Demasiado largo').optional().or(z.literal('')),
  grado_estudio: z.string().max(120, 'Demasiado largo').optional().or(z.literal('')),
  anos_servicio: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) || n < 0 ? undefined : n;
  }),
  activo: z.boolean().optional(),
});

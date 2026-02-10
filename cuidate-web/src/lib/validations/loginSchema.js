import { z } from 'zod';
import { LIMITS } from '../../utils/constants';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .max(LIMITS.EMAIL_MAX, 'Correo demasiado largo')
    .email('Correo no válido'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .min(LIMITS.PASSWORD_MIN, `Mínimo ${LIMITS.PASSWORD_MIN} caracteres`)
    .max(LIMITS.PASSWORD_MAX, 'Contraseña demasiado larga'),
});

import { z } from 'zod';
import { LIMITS } from '../../utils/constants';

const PASSWORD_CHANGE_MIN = 8;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z
      .string()
      .min(1, 'La nueva contraseña es obligatoria')
      .min(PASSWORD_CHANGE_MIN, `Mínimo ${PASSWORD_CHANGE_MIN} caracteres`)
      .max(LIMITS.PASSWORD_MAX, 'Contraseña demasiado larga'),
    confirmNewPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmNewPassword'],
  });

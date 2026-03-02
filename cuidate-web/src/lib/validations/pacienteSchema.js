import { z } from 'zod';

const maxNombre = 100;
const maxCurp = 18;
const maxCelular = 20;
const maxEstado = 80;
const maxDireccion = 500;
const maxLocalidad = 100;

/** Fecha en formato YYYY-MM-DD o Date válida */
const fechaNacimientoSchema = z
  .string()
  .min(1, 'La fecha de nacimiento es obligatoria')
  .refine((v) => {
    const d = new Date(v);
    return !Number.isNaN(d.getTime());
  }, 'Fecha no válida');

/** CURP: 18 caracteres, formato oficial (paridad con app móvil). */
const curpSchema = z
  .string()
  .min(1, 'El CURP es obligatorio')
  .max(maxCurp, 'CURP demasiado largo')
  .transform((v) => (v ? v.trim().toUpperCase() : ''))
  .refine((v) => /^[A-ZÑ]{4}[0-9]{6}[HM][A-ZÑ]{5}[A-Z0-9]{2}$/.test(v), 'El CURP no tiene un formato válido');

export const pacienteCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(maxNombre, 'Nombre demasiado largo'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio').max(maxNombre, 'Demasiado largo'),
  apellido_materno: z.string().max(maxNombre, 'Demasiado largo').optional().or(z.literal('')),
  fecha_nacimiento: fechaNacimientoSchema,
  curp: curpSchema,
  numero_celular: z.string().max(maxCelular, 'Demasiado largo').optional().or(z.literal('')),
  estado: z.string().min(1, 'El estado es obligatorio').max(maxEstado, 'Demasiado largo'),
  localidad: z.string().min(1, 'La localidad/municipio es obligatorio').max(maxLocalidad, 'Demasiado largo'),
  direccion: z.string().max(maxDireccion, 'Demasiado largo').optional().or(z.literal('')),
  sexo: z.string().max(20).optional().or(z.literal('')),
  institucion_salud: z.string().min(1, 'Debe seleccionar una institución de salud').max(80, 'Demasiado largo'),
  id_modulo: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }),
});

export const pacienteEditSchema = pacienteCreateSchema.extend({
  activo: z.boolean().optional(),
});

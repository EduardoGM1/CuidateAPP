import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const citaSource = fs.readFileSync(path.join(__dirname, '../controllers/cita.js'), 'utf8');

describe('Cita -> getCita consulta Sequelize', () => {
  it('no debe solicitar codigo_paciente en Paciente', () => {
    expect(citaSource).not.toMatch(/['"]codigo_paciente['"]/);
    expect(citaSource).toMatch(/numero_expediente/);
  });

  it('debe incluir SignosVitales en getCita', () => {
    const getCitaBlock = citaSource.slice(
      citaSource.indexOf('export const getCita'),
      citaSource.indexOf('export const getCitasByPaciente')
    );
    expect(getCitaBlock).toMatch(/model:\s*SignoVital/);
    expect(getCitaBlock).toMatch(/SignosVitales/);
  });
});

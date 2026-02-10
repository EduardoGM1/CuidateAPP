import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';

const sectionTitles = {
  pacientes: 'Pacientes',
  citas: 'Citas',
  reportes: 'Reportes',
  doctores: 'Doctores',
};

export function Placeholder() {
  const { pathname } = useLocation();
  const section = pathname.replace(/^\//, '') || 'próximamente';
  const title = sectionTitles[section] ?? section;

  return (
    <Card title={title}>
      <p style={{ color: 'var(--color-texto-secundario)' }}>
        Esta sección se implementará en la siguiente fase.
      </p>
    </Card>
  );
}

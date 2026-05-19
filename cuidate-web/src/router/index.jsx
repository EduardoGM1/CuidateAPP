import { Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminRoute from '../components/auth/AdminRoute';
import PageLoadingFallback from '../components/common/PageLoadingFallback';
import StaleAssetsFallback from '../components/common/StaleAssetsFallback';
import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import ConfirmarCuenta from '../pages/ConfirmarCuenta';
import AvisoPrivacidad from '../pages/legal/AvisoPrivacidad';
import PrivacyConsentGate from '../components/legal/PrivacyConsentGate';
import * as P from './lazyPages';

const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/forgot-password', element: <ForgotPassword /> },
    { path: '/reset-password', element: <ResetPassword /> },
    { path: '/confirmar-cuenta', element: <ConfirmarCuenta /> },
    { path: '/aviso-privacidad', element: <AvisoPrivacidad /> },
    {
      path: '/',
      errorElement: <StaleAssetsFallback autoReload />,
      element: (
        <ProtectedRoute>
          <PrivacyConsentGate>
            <MainLayout />
          </PrivacyConsentGate>
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <P.Dashboard /> },
        { path: 'dashboard', element: <P.Dashboard /> },
        { path: 'pacientes', element: <P.PacientesList /> },
        { path: 'pacientes/nuevo', element: <P.AgregarPaciente /> },
        { path: 'pacientes/:id', element: <P.PacienteDetail /> },
        { path: 'pacientes/:id/editar', element: <P.EditarPaciente /> },
        { path: 'pacientes/:id/agendar-cita', element: <P.AgendarCita /> },
        { path: 'citas', element: <P.CitasList /> },
        { path: 'citas/:id', element: <P.CitaDetail /> },
        { path: 'reportes', element: <P.ReportesPage /> },
        { path: 'doctores', element: <AdminRoute><P.DoctoresList /></AdminRoute> },
        { path: 'doctores/nuevo', element: <AdminRoute><P.AgregarDoctor /></AdminRoute> },
        { path: 'doctores/:id/editar', element: <AdminRoute><P.EditarDoctor /></AdminRoute> },
        { path: 'doctores/:id', element: <AdminRoute><P.DoctorDetail /></AdminRoute> },
        { path: 'admin/auditoria', element: <AdminRoute><P.AuditoriaList /></AdminRoute> },
        { path: 'admin/auditoria/:id', element: <AdminRoute><P.AuditoriaDetail /></AdminRoute> },
        { path: 'admin/catalogos', element: <AdminRoute><P.CatalogosPage /></AdminRoute> },
        { path: 'admin/usuarios', element: <AdminRoute><P.UsuariosList /></AdminRoute> },
        { path: 'admin/operaciones', element: <AdminRoute><P.AdminOperacionesPage /></AdminRoute> },
        { path: 'admin/tickets', element: <AdminRoute><P.AdminTicketsPage /></AdminRoute> },
        { path: 'admin/tickets/:id', element: <AdminRoute><P.TicketDetailPage /></AdminRoute> },
        { path: 'soporte/tickets/nuevo', element: <P.TicketNuevoPage /> },
        { path: 'soporte/tickets/:id', element: <P.TicketDetailPage /> },
        { path: 'soporte/tickets', element: <P.DoctorTicketsPage /> },
        { path: 'notificaciones', element: <P.NotificacionesDoctor /> },
        { path: 'solicitudes-reprogramacion', element: <P.SolicitudesReprogramacion /> },
        { path: 'chat', element: <P.ChatList /> },
        { path: 'chat/:id', element: <P.ChatConversacion /> },
        { path: 'perfil', element: <P.Perfil /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

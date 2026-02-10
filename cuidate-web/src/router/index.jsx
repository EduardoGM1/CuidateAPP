import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminRoute from '../components/auth/AdminRoute';
import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import PacientesList from '../pages/pacientes/PacientesList';
import PacienteDetail from '../pages/pacientes/PacienteDetail';
import AgregarPaciente from '../pages/pacientes/AgregarPaciente';
import EditarPaciente from '../pages/pacientes/EditarPaciente';
import AgendarCita from '../pages/pacientes/AgendarCita';
import CitasList from '../pages/citas/CitasList';
import CitaDetail from '../pages/citas/CitaDetail';
import ReportesPage from '../pages/reportes/ReportesPage';
import DoctoresList from '../pages/doctores/DoctoresList';
import DoctorDetail from '../pages/doctores/DoctorDetail';
import AgregarDoctor from '../pages/doctores/AgregarDoctor';
import EditarDoctor from '../pages/doctores/EditarDoctor';
import AuditoriaList from '../pages/auditoria/AuditoriaList';
import AuditoriaDetail from '../pages/auditoria/AuditoriaDetail';
import CatalogosPage from '../pages/admin/CatalogosPage';
import UsuariosList from '../pages/admin/UsuariosList';
import NotificacionesDoctor from '../pages/doctor/NotificacionesDoctor';
import SolicitudesReprogramacion from '../pages/doctor/SolicitudesReprogramacion';
import ChatList from '../pages/doctor/ChatList';
import ChatConversacion from '../pages/doctor/ChatConversacion';
import Perfil from '../pages/Perfil';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'pacientes', element: <PacientesList /> },
      { path: 'pacientes/nuevo', element: <AgregarPaciente /> },
      { path: 'pacientes/:id', element: <PacienteDetail /> },
      { path: 'pacientes/:id/editar', element: <EditarPaciente /> },
      { path: 'pacientes/:id/agendar-cita', element: <AgendarCita /> },
      { path: 'citas', element: <CitasList /> },
      { path: 'citas/:id', element: <CitaDetail /> },
      { path: 'reportes', element: <ReportesPage /> },
      { path: 'doctores', element: <DoctoresList /> },
      { path: 'doctores/nuevo', element: <AdminRoute><AgregarDoctor /></AdminRoute> },
      { path: 'doctores/:id/editar', element: <AdminRoute><EditarDoctor /></AdminRoute> },
      { path: 'doctores/:id', element: <DoctorDetail /> },
      { path: 'admin/auditoria', element: <AdminRoute><AuditoriaList /></AdminRoute> },
      { path: 'admin/auditoria/:id', element: <AdminRoute><AuditoriaDetail /></AdminRoute> },
      { path: 'admin/catalogos', element: <AdminRoute><CatalogosPage /></AdminRoute> },
      { path: 'admin/usuarios', element: <AdminRoute><UsuariosList /></AdminRoute> },
      { path: 'notificaciones', element: <NotificacionesDoctor /> },
      { path: 'solicitudes-reprogramacion', element: <SolicitudesReprogramacion /> },
      { path: 'chat', element: <ChatList /> },
      { path: 'chat/:id', element: <ChatConversacion /> },
      { path: 'perfil', element: <Perfil /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], {
  future: {
    v7_startTransition: true,
  },
});

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

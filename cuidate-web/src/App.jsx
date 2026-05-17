import AppRouter from './router';
import AppErrorBoundary from './components/common/AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRouter />
    </AppErrorBoundary>
  );
}

import { Outlet } from 'react-router';
import { AuthProvider } from './contexts/auth-context';
import { AuthModalProvider } from './components/auth/AuthModalProvider';
import { ThemeProvider } from './contexts/theme-context';
import { ModelProvider } from './contexts/model-context';
import { UIModeProvider } from './contexts/ui-mode-context';
import { Toaster } from './components/ui/sonner';
import { AppLayout } from './components/layout/app-layout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ModelProvider>
            <UIModeProvider>
              <AuthModalProvider>
              <AppLayout>
                <Outlet />
              </AppLayout>
              <Toaster richColors position="top-right" />
            </AuthModalProvider>
            </UIModeProvider>
          </ModelProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAdmin, RequireAuth } from './components/layout/Guards';
import { BrandMark } from './components/layout/Brand';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAuthorizationPage } from './pages/NewAuthorizationPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditPage } from './pages/AuditPage';
import { isSupabaseConfigured } from './lib/supabase';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="mt-2 text-[26px] font-bold text-ink">Página não encontrada</h1>
      <Link to="/" className="mt-5 text-sm font-bold text-brand-focus hover:underline">
        Voltar ao painel
      </Link>
    </div>
  );
}

function MissingConfig() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="card max-w-lg px-9 py-9">
        <BrandMark />
        <h1 className="mt-5 text-[22px] font-bold text-ink">Configuração pendente</h1>
        <p className="mt-2 text-[15px] leading-6 text-soft">
          As variáveis <code className="rounded bg-canvas px-1.5 py-0.5 text-[13px]">VITE_SUPABASE_URL</code> e{' '}
          <code className="rounded bg-canvas px-1.5 py-0.5 text-[13px]">VITE_SUPABASE_ANON_KEY</code> não foram definidas.
          Configure-as no arquivo <strong>.env</strong> (computador) ou em <strong>Site configuration → Environment variables</strong> (Netlify) e publique novamente.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <MissingConfig />;
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="nova" element={<NewAuthorizationPage />} />
              <Route path="historico" element={<HistoryPage />} />
              <Route path="relatorios" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
              <Route path="usuarios" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
              <Route path="auditoria" element={<RequireAdmin><AuditPage /></RequireAdmin>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

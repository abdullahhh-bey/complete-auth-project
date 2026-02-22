
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import styles from './components/ui/Button.module.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button
          onClick={logout}
          className={clsx(styles.button, styles.secondary, styles.sm)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <h2>Welcome, {user?.name || 'User'}!</h2>
        <p style={{ color: 'var(--color-muted-foreground)' }}>You are successfully authenticated.</p>
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-muted)', borderRadius: 'var(--radius-md)' }}>
          <code>User ID: {user?.name}</code><br />
          <code>Email: {user?.email}</code>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Route */}
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;

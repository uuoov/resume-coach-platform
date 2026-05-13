import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

const HomePage = lazy(() => import('./pages/HomePage'));
const ResumeUploadPage = lazy(() => import('./pages/ResumeUploadPage'));
const JDInputPage = lazy(() => import('./pages/JDInputPage'));
const MatchResultPage = lazy(() => import('./pages/MatchResultPage'));
const OptimizationPage = lazy(() => import('./pages/OptimizationPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

const RouteFallback = () => (
  <div className="route-fallback" aria-label="页面加载中" aria-busy="true" />
);

const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteFallback />}>{children}</Suspense>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // 或者显示加载指示器
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // 或者显示加载指示器
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={
        <Layout>
          <ProtectedRoute>
            <LazyRoute>
              <HomePage />
            </LazyRoute>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/resume" element={
        <Layout>
          <ProtectedRoute>
            <LazyRoute>
              <ResumeUploadPage />
            </LazyRoute>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/jd" element={
        <Layout>
          <ProtectedRoute>
            <LazyRoute>
              <JDInputPage />
            </LazyRoute>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/match" element={
        <Layout>
          <ProtectedRoute>
            <LazyRoute>
              <MatchResultPage />
            </LazyRoute>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/optimize" element={
        <Layout>
          <ProtectedRoute>
            <LazyRoute>
              <OptimizationPage />
            </LazyRoute>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/history" element={
        <Layout>
          <ProtectedRoute>
            <LazyRoute>
              <HistoryPage />
            </LazyRoute>
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/login" element={
        <PublicRoute>
          <LazyRoute>
            <LoginPage />
          </LazyRoute>
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <LazyRoute>
            <RegisterPage />
          </LazyRoute>
        </PublicRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

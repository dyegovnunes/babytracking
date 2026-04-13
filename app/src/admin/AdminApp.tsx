import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminEngagementPage from './pages/AdminEngagementPage';
import AdminPushPage from './pages/AdminPushPage';
import AdminMonetizationPage from './pages/AdminMonetizationPage';
import AdminConfigPage from './pages/AdminConfigPage';
import AdminLayout from './components/AdminLayout';

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route path="*" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="engagement" element={<AdminEngagementPage />} />
              <Route path="push" element={<AdminPushPage />} />
              <Route path="monetization" element={<AdminMonetizationPage />} />
              <Route path="config" element={<AdminConfigPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </Routes>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import AdminLayout from './components/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'
import AdminPostsPage from './pages/AdminPostsPage'
import AdminPostEditorPage from './pages/AdminPostEditorPage'

export default function BlogAdminApp() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        {/* Login — público */}
        <Route path="/login" element={<AdminLoginPage />} />

        {/* Rotas protegidas */}
        <Route
          path="/*"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="/posts" element={<AdminPostsPage />} />
                  <Route path="/posts/new" element={<AdminPostEditorPage />} />
                  <Route path="/posts/:slug" element={<AdminPostEditorPage />} />
                  <Route path="/analytics" element={<AdminAnalyticsPage />} />
                  <Route path="/dashboard" element={<AdminDashboardPage />} />
                  <Route index element={<Navigate to="/posts" replace />} />
                  <Route path="*" element={<Navigate to="/posts" replace />} />
                </Routes>
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

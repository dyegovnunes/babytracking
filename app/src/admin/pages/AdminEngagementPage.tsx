import { Navigate } from 'react-router-dom';

// Engagement data is now part of the Dashboard
export default function AdminEngagementPage() {
  return <Navigate to="/paineladmin/dashboard" replace />;
}

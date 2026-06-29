import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/Loading/Loading';

function normalizeRole(role) {
  if (role === 'adviser') return 'advisor';
  return role;
}

export default function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  const role = normalizeRole(user.role);
  const allowed = (roles || []).map(normalizeRole);
  if (!allowed.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

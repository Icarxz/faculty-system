import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const userRole = localStorage.getItem('userRole');

  // 1. If they aren't logged in at all, kick them to the login screen
  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  // 2. THE FIX: If they try to access a page they aren't allowed in
  if (!allowedRoles.includes(userRole)) {
    // Dynamically bounce them back to their correct home page based on their role
    switch (userRole) {
      case 'FACULTY':
        return <Navigate to="/faculty-dashboard" replace />;
      case 'ADMIN':
        return <Navigate to="/admin-dashboard" replace />;
      case 'DEAN':
        return <Navigate to="/dean-dashboard" replace />;
      case 'STUDENT':
      default:
        return <Navigate to="/student-dashboard" replace />;
    }
  }

  // 3. If they pass the check, let them see the page!
  return <>{children}</>;
}
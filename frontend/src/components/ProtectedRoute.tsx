import React from 'react';
import { Navigate } from 'react-router-dom';

// We define the props this component will accept
interface ProtectedRouteProps {
  children: React.ReactNode; // The actual page we want to show
  allowedRoles: string[];    // An array of roles allowed to see this page
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  // Check the browser memory to see who is logged in
  const userRole = localStorage.getItem('userRole');

  // If they aren't logged in at all, kick them to the login screen
  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  // If they are logged in, but their role isn't in the allowed list...
  if (!allowedRoles.includes(userRole)) {
    // We can be polite and send them to the public dashboard instead of kicking them completely out
    return <Navigate to="/student-dashboard" replace />;
  }

  // If they pass both checks, let them see the page!
  return <>{children}</>;
}
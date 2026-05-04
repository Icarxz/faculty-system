import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import FacultyDashboard from './components/FacultyDashboard';
import AdminDashboard from './components/AdminDashboard';
import DeanDashboard from './components/DeanDashboard';
import StudentDashboard from './components/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Import the bouncer!


export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login */}
        <Route path="/" element={<Login />} />
        
        {/* The Student View */}
        <Route 
          path="/student-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY', 'ADMIN', 'DEAN']}>
              <StudentDashboard /> 
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/faculty-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'FACULTY', 'ADMIN', 'DEAN']}>
              <FacultyDashboard />
            </ProtectedRoute>
          } 
        />

        {/* The Admin View: STRICTLY ADMIN ONLY */}
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* The Dean View: STRICTLY DEAN ONLY */}
        <Route 
          path="/dean-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['DEAN']}>
              <DeanDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all: If they type a weird URL, send them to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
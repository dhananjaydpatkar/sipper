import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import './index.css';

const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactElement, requireAdmin?: boolean }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && user.role !== 'ADMIN') return <Navigate to="/" />;
  
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex-center">Loading...</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            {user?.role === 'ADMIN' ? <AdminDashboard /> : <Dashboard />}
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;

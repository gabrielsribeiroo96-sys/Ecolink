import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantDashboard from './pages/RestaurantDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBF9]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2D5A36] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A5D4E]" data-testid="loading-text">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRouter = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          user ? (
            user.role === 'restaurant' ? (
              <Navigate to="/dashboard/restaurant" replace />
            ) : (
              <Navigate to="/dashboard/collector" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/dashboard/restaurant"
        element={
          <ProtectedRoute allowedRole="restaurant">
            <RestaurantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/collector"
        element={
          <ProtectedRoute allowedRole="collector">
            <CollectorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRouter;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Overtime from './pages/Overtime';
import UsersPage from './pages/Users';

const Spinner = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isFetchingProfile } = useAuth();

  if (isLoading || isFetchingProfile) return <Spinner />;

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, isLoading, isFetchingProfile } = useAuth();

  if (isLoading || isFetchingProfile) return <Spinner />;

  return (
    <Routes>
      <Route path="/login" element={user && profile ? <Navigate to="/" replace /> : <Login />} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0A0A0A] font-sans text-zinc-100 selection:bg-indigo-500/30 flex flex-col antialiased">
              <Navbar />
              <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
                <Dashboard />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0A0A0A] font-sans text-zinc-100 selection:bg-indigo-500/30 flex flex-col antialiased">
              <Navbar />
              <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
                <Timesheet />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/overtime"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0A0A0A] font-sans text-zinc-100 selection:bg-indigo-500/30 flex flex-col antialiased">
              <Navbar />
              <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
                <Overtime />
              </main>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0A0A0A] font-sans text-zinc-100 selection:bg-indigo-500/30 flex flex-col antialiased">
              <Navbar />
              <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
                <UsersPage />
              </main>
            </div>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

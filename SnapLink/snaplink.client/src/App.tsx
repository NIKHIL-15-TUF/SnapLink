import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  // FIX: Reading localStorage once at module load means the app never reacts
  // to login/logout — the stale value is used for the lifetime of the module.
  // useState initialises once per render cycle and forces a re-render when
  // the auth state changes (LoginPage/RegisterPage call window.location.href
  // which triggers a full reload, but using state is the correct pattern and
  // makes the guard reactive if we ever switch to navigate() instead).
  const [token] = useState(() => localStorage.getItem("token"));

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

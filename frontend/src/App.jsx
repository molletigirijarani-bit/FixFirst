import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./customer/CustomerDashboard";
import RepairerDashboard from "./repairer/RepairerDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import { getStoredUser, getStoredToken } from "./services/api";
import "./App.css";

function getDashboardPath(role) {
  if (role === "customer") return "/customer-dashboard";
  if (role === "repairer") return "/repairer-dashboard";
  if (role === "admin") return "/admin-dashboard";
  return "/login";
}

function RequireAuth({ children, allowedRole }) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

function PublicHome() {
  const user = getStoredUser();
  const token = getStoredToken();

  // If a repairer or admin lands on root, give them a seamless direct route to their workspace
  if (token && user?.role === "repairer") {
    return <Navigate to="/repairer-dashboard" replace />;
  }
  if (token && user?.role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <CustomerDashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Customer Homepage */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/home" element={<PublicHome />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-Specific Dashboards */}
        <Route
          path="/customer-dashboard"
          element={
            <RequireAuth allowedRole="customer">
              <CustomerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/repairer-dashboard"
          element={
            <RequireAuth allowedRole="repairer">
              <RepairerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <RequireAuth allowedRole="admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import AdminDashboard from "../admin/AdminDashboard";

export default function Dashboard({ expectedRole }) {
  if (expectedRole === "admin") {
    return <AdminDashboard />;
  }
  return <AdminDashboard />;
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  getStoredUser,
  clearSession,
} from "../services/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [activeTab, setActiveTab] = useState("overview"); // "overview", "repairs", "users"

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRepairers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    completedRequests: 0,
  });

  const [repairs, setRepairs] = useState([]);
  const [users, setUsers] = useState([]);
  const [userCounts, setUserCounts] = useState({ total: 0, customer: 0, repairer: 0, admin: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [repairSearch, setRepairSearch] = useState("");
  const [repairStatusFilter, setRepairStatusFilter] = useState("All");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userSearch, setUserSearch] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError("");
    try {
      const [statsData, repairsData, usersData] = await Promise.all([
        apiRequest("/repairs/stats"),
        apiRequest("/repairs"),
        apiRequest("/auth/users"),
      ]);

      if (statsData) {
        setStats(statsData);
      }

      setRepairs(Array.isArray(repairsData) ? repairsData : []);

      if (usersData) {
        setUsers(usersData.users || []);
        if (usersData.counts) setUserCounts(usersData.counts);
      }
    } catch (err) {
      setError(err.message || "Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRepair(id) {
    const confirmed = window.confirm(
      "Admin Action: Are you sure you want to delete this repair request?"
    );
    if (!confirmed) return;

    setActionLoadingId(id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/repairs/${id}`, { method: "DELETE" });
      setSuccess("Repair request deleted successfully.");
      await loadDashboardData();
    } catch (err) {
      setError(err.message || "Could not delete repair request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUpdateRepairStatus(id, newStatus) {
    setActionLoadingId(id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/repairs/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      setSuccess(`Repair status updated to ${newStatus}.`);
      await loadDashboardData();
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  // Filtered repairs
  const filteredRepairs = repairs.filter((r) => {
    const matchesStatus =
      repairStatusFilter === "All" ||
      (r.status || "").toLowerCase() === repairStatusFilter.toLowerCase();

    const q = repairSearch.toLowerCase();
    const matchesSearch =
      !repairSearch ||
      (r.item && r.item.toLowerCase().includes(q)) ||
      (r.problem && r.problem.toLowerCase().includes(q)) ||
      (r.area && r.area.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesRole =
      userRoleFilter === "All" ||
      (u.role || "").toLowerCase() === userRoleFilter.toLowerCase();

    const q = userSearch.toLowerCase();
    const matchesSearch =
      !userSearch ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    return matchesRole && matchesSearch;
  });

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f4f7fb",
      color: "#172033",
      fontFamily: "'DM Sans', Arial, sans-serif",
    },
    header: {
      background: "#153e35",
      color: "white",
      padding: "20px 6%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
    },
    badge: {
      background: "#d97706",
      color: "white",
      borderRadius: "20px",
      padding: "4px 12px",
      fontSize: "12px",
      fontWeight: "bold",
      marginLeft: "8px",
    },
    content: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "32px 20px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
      marginBottom: "28px",
    },
    card: {
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      borderLeft: "4px solid #36865b",
    },
    number: {
      fontSize: "28px",
      fontWeight: "800",
      margin: "6px 0 0",
      color: "#153e35",
    },
    label: {
      fontSize: "12px",
      color: "#667085",
      fontWeight: "700",
      textTransform: "uppercase",
    },
    tabs: {
      display: "flex",
      gap: "12px",
      marginBottom: "24px",
      borderBottom: "2px solid #e4e7ec",
      paddingBottom: "12px",
    },
    tabBtn: (active) => ({
      padding: "10px 22px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "14px",
      background: active ? "#153e35" : "#e4e7ec",
      color: active ? "white" : "#475467",
    }),
    panel: {
      background: "white",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "16px",
      fontSize: "14px",
    },
    th: {
      textAlign: "left",
      padding: "12px 14px",
      background: "#f8faf9",
      color: "#475467",
      borderBottom: "2px solid #eaecf0",
      fontWeight: "700",
    },
    td: {
      padding: "14px",
      borderBottom: "1px solid #eaecf0",
      verticalAlign: "middle",
    },
    button: {
      border: "none",
      borderRadius: "8px",
      padding: "8px 16px",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "13px",
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", display: "flex", alignItems: "center" }}>
            FixFirst <span style={styles.badge}>ADMIN CONSOLE</span>
          </h1>
          <p style={{ margin: "4px 0 0", color: "#d7e8e2", fontSize: "14px" }}>
            Platform Administration & Management · {currentUser?.name || "Admin"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={loadDashboardData}
            style={{ ...styles.button, background: "#245347", color: "white" }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh Data"}
          </button>
          <button
            onClick={handleLogout}
            style={{ ...styles.button, background: "white", color: "#153e35" }}
          >
            Log Out
          </button>
        </div>
      </header>

      <main style={styles.content}>
        {error && (
          <div
            role="alert"
            style={{
              background: "#fef3f2",
              color: "#b42318",
              border: "1px solid #fecdca",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              background: "#edfcf2",
              color: "#1b7340",
              border: "1px solid #aaf0c4",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
            }}
          >
            ✓ {success}
          </div>
        )}

        {/* Real DB statistics */}
        <section style={styles.grid}>
          <div style={styles.card}>
            <span style={styles.label}>Total Customers</span>
            <p style={styles.number}>{stats.totalCustomers}</p>
          </div>
          <div style={{ ...styles.card, borderLeftColor: "#0284c7" }}>
            <span style={styles.label}>Total Repairers</span>
            <p style={{ ...styles.number, color: "#0284c7" }}>{stats.totalRepairers}</p>
          </div>
          <div style={{ ...styles.card, borderLeftColor: "#7c3aed" }}>
            <span style={styles.label}>Total Requests</span>
            <p style={{ ...styles.number, color: "#7c3aed" }}>{stats.totalRequests}</p>
          </div>
          <div style={{ ...styles.card, borderLeftColor: "#d97706" }}>
            <span style={styles.label}>Pending Requests</span>
            <p style={{ ...styles.number, color: "#d97706" }}>{stats.pendingRequests}</p>
          </div>
          <div style={{ ...styles.card, borderLeftColor: "#2563eb" }}>
            <span style={styles.label}>In Progress</span>
            <p style={{ ...styles.number, color: "#2563eb" }}>{stats.inProgressRequests}</p>
          </div>
          <div style={{ ...styles.card, borderLeftColor: "#16a34a" }}>
            <span style={styles.label}>Completed</span>
            <p style={{ ...styles.number, color: "#16a34a" }}>{stats.completedRequests}</p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={styles.tabBtn(activeTab === "overview")}
            onClick={() => setActiveTab("overview")}
          >
            System Overview
          </button>
          <button
            style={styles.tabBtn(activeTab === "repairs")}
            onClick={() => setActiveTab("repairs")}
          >
            Repair Requests ({repairs.length})
          </button>
          <button
            style={styles.tabBtn(activeTab === "users")}
            onClick={() => setActiveTab("users")}
          >
            User Accounts ({users.length})
          </button>
        </div>

        {/* TAB 1: System Overview */}
        {activeTab === "overview" && (
          <section style={styles.panel}>
            <h2 style={{ marginTop: 0 }}>System Health & Summary</h2>
            <p style={{ color: "#667085" }}>
              FixFirst real-time database metric overview.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              <div style={{ border: "1px solid #eaecf0", padding: "20px", borderRadius: "10px" }}>
                <h3 style={{ margin: "0 0 10px", color: "#153e35" }}>Platform Activity</h3>
                <p>
                  <strong>Total Registered Users:</strong> {userCounts.total}
                </p>
                <p>
                  <strong>Customers:</strong> {userCounts.customer}
                </p>
                <p>
                  <strong>Repair Professionals:</strong> {userCounts.repairer}
                </p>
                <p>
                  <strong>System Administrators:</strong> {userCounts.admin}
                </p>
              </div>

              <div style={{ border: "1px solid #eaecf0", padding: "20px", borderRadius: "10px" }}>
                <h3 style={{ margin: "0 0 10px", color: "#153e35" }}>Repair Lifecycle</h3>
                <p>
                  <strong>Total Submissions:</strong> {stats.totalRequests}
                </p>
                <p>
                  <strong>Awaiting Claim (Pending):</strong> {stats.pendingRequests}
                </p>
                <p>
                  <strong>Under Repair (In Progress):</strong> {stats.inProgressRequests}
                </p>
                <p>
                  <strong>Successfully Restored (Completed):</strong> {stats.completedRequests}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: Manage Repair Requests */}
        {activeTab === "repairs" && (
          <section style={styles.panel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 4px" }}>Manage All Repair Requests</h2>
                <p style={{ margin: 0, color: "#667085", fontSize: "14px" }}>
                  Monitor customer requests, assignments, and work progress across the platform.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="search"
                  placeholder="Search item, area, customer..."
                  value={repairSearch}
                  onChange={(e) => setRepairSearch(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    fontSize: "13px",
                    width: "220px",
                  }}
                />

                <select
                  value={repairStatusFilter}
                  onChange={(e) => setRepairStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    fontSize: "13px",
                    background: "white",
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p>Loading repair requests...</p>
            ) : filteredRepairs.length === 0 ? (
              <p style={{ color: "#667085", padding: "20px 0" }}>
                No repair requests match your filter.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Item & Problem</th>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Area</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Assigned Repairer</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRepairs.map((r) => {
                      const status = r.status || "Pending";
                      return (
                        <tr key={r._id}>
                          <td style={styles.td}>
                            <strong>{r.item}</strong>
                            <div style={{ fontSize: "13px", color: "#667085", marginTop: "3px" }}>
                              {r.problem}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div>{r.customer?.name || r.name || "Customer"}</div>
                            {r.customer?.email && (
                              <div style={{ fontSize: "12px", color: "#667085" }}>
                                {r.customer.email}
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>{r.area}</td>
                          <td style={styles.td}>
                            <select
                              value={status}
                              disabled={actionLoadingId === r._id}
                              onChange={(e) => handleUpdateRepairStatus(r._id, e.target.value)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #d0d5dd",
                                fontSize: "13px",
                                fontWeight: "600",
                                background:
                                  status === "Completed"
                                    ? "#edfcf2"
                                    : status === "In Progress"
                                    ? "#eff8ff"
                                    : "#fff7e6",
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                          <td style={styles.td}>
                            {r.assignedRepairer ? (
                              <span style={{ color: "#175cd3", fontWeight: "600" }}>
                                🛠️ {r.assignedRepairer.name || "Repairer"}
                              </span>
                            ) : (
                              <span style={{ color: "#b54708" }}>Unassigned</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleDeleteRepair(r._id)}
                              disabled={actionLoadingId === r._id}
                              style={{
                                ...styles.button,
                                background: "#fee4e2",
                                color: "#b42318",
                                padding: "6px 12px",
                                fontSize: "12px",
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: User Accounts */}
        {activeTab === "users" && (
          <section style={styles.panel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 4px" }}>Registered User Accounts</h2>
                <p style={{ margin: 0, color: "#667085", fontSize: "14px" }}>
                  View registered customers, repair professionals, and administrators.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="search"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    fontSize: "13px",
                    width: "220px",
                  }}
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    fontSize: "13px",
                    background: "white",
                  }}
                >
                  <option value="All">All Roles ({userCounts.total})</option>
                  <option value="customer">Customers ({userCounts.customer})</option>
                  <option value="repairer">Repairers ({userCounts.repairer})</option>
                  <option value="admin">Admins ({userCounts.admin})</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p>Loading user accounts...</p>
            ) : filteredUsers.length === 0 ? (
              <p style={{ color: "#667085", padding: "20px 0" }}>No users found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Member Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const roleBadgeColor =
                        u.role === "admin"
                          ? { bg: "#fef3c7", text: "#92400e" }
                          : u.role === "repairer"
                          ? { bg: "#e0f2fe", text: "#0369a1" }
                          : { bg: "#ecfdf5", text: "#065f46" };

                      return (
                        <tr key={u._id}>
                          <td style={styles.td}>
                            <strong>{u.name}</strong>
                          </td>
                          <td style={styles.td}>{u.email}</td>
                          <td style={styles.td}>
                            <span
                              style={{
                                background: roleBadgeColor.bg,
                                color: roleBadgeColor.text,
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "700",
                                textTransform: "capitalize",
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

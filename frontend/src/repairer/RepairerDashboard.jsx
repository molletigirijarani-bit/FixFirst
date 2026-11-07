import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  getStoredUser,
  clearSession,
} from "../services/api";

export default function RepairerDashboard() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [activeTab, setActiveTab] = useState("available"); // "available" or "assigned"
  const [stats, setStats] = useState({
    available: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
  });

  const [availableRepairs, setAvailableRepairs] = useState([]);
  const [assignedRepairs, setAssignedRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setErrorMessage("");
    try {
      const [statsData, availableData, assignedData] = await Promise.all([
        apiRequest("/repairs/stats"),
        apiRequest("/repairs/available"),
        apiRequest("/repairs/assigned"),
      ]);

      if (statsData) {
        setStats({
          available: statsData.available ?? 0,
          assigned: statsData.assigned ?? 0,
          inProgress: statsData.inProgress ?? 0,
          completed: statsData.completed ?? 0,
        });
      }

      setAvailableRepairs(Array.isArray(availableData) ? availableData : []);
      setAssignedRepairs(Array.isArray(assignedData) ? assignedData : []);
    } catch (err) {
      setErrorMessage(
        err.message || "Failed to load repairer data. Make sure backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(repairId) {
    setClaimingId(repairId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await apiRequest(`/repairs/${repairId}/claim`, {
        method: "POST",
      });

      setSuccessMessage(result.message || "Repair request claimed successfully!");
      // Switch to assigned tab so repairer immediately sees their claimed request
      setActiveTab("assigned");
      await loadAllData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to claim request.");
    } finally {
      setClaimingId(null);
    }
  }

  async function handleStatusChange(repairId, newStatus) {
    setUpdatingId(repairId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await apiRequest(`/repairs/${repairId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      setSuccessMessage(result.message || `Status updated to ${newStatus}`);
      await loadAllData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update repair status.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  // Filter assigned repairs
  const filteredAssigned = assignedRepairs.filter((repair) => {
    if (statusFilter === "All") return true;
    return (repair.status || "").toLowerCase() === statusFilter.toLowerCase();
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
      display: "inline-block",
      background: "#27794b",
      color: "#ffffff",
      borderRadius: "20px",
      padding: "4px 12px",
      fontSize: "12px",
      fontWeight: "bold",
      marginLeft: "8px",
    },
    content: {
      maxWidth: "1150px",
      margin: "0 auto",
      padding: "32px 20px",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      marginBottom: "28px",
    },
    statCard: {
      background: "white",
      padding: "20px 24px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      borderLeft: "4px solid #36865b",
    },
    statNumber: {
      fontSize: "30px",
      fontWeight: "800",
      margin: "6px 0 0",
      color: "#153e35",
    },
    statLabel: {
      fontSize: "13px",
      color: "#667085",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    tabsContainer: {
      display: "flex",
      gap: "12px",
      marginBottom: "20px",
      borderBottom: "2px solid #e4e7ec",
      paddingBottom: "12px",
    },
    tabBtn: (isActive) => ({
      padding: "10px 20px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "14px",
      background: isActive ? "#153e35" : "#e4e7ec",
      color: isActive ? "white" : "#475467",
      transition: "all 0.2s",
    }),
    panel: {
      background: "white",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    },
    card: {
      border: "1px solid #eaecf0",
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "16px",
      background: "#ffffff",
      transition: "transform 0.15s, box-shadow 0.15s",
    },
    button: {
      border: "none",
      borderRadius: "8px",
      padding: "10px 18px",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "13px",
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", display: "flex", alignItems: "center" }}>
              FixFirst <span style={styles.badge}>REPAIRER PORTAL</span>
            </h1>
            <p style={{ margin: "4px 0 0", color: "#d7e8e2", fontSize: "14px" }}>
              Welcome back, {currentUser?.name || "Professional"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={loadAllData}
            style={{
              ...styles.button,
              background: "#245347",
              color: "white",
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              ...styles.button,
              background: "white",
              color: "#153e35",
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <main style={styles.content}>
        {/* Alerts */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              background: "#fef3f2",
              color: "#b42318",
              border: "1px solid #fecdca",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            style={{
              background: "#edfcf2",
              color: "#1b7340",
              border: "1px solid #aaf0c4",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* Database-backed statistics */}
        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Available Unclaimed</span>
            <p style={styles.statNumber}>{stats.available}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeftColor: "#175cd3" }}>
            <span style={styles.statLabel}>My Assigned Total</span>
            <p style={{ ...styles.statNumber, color: "#175cd3" }}>{stats.assigned}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeftColor: "#b54708" }}>
            <span style={styles.statLabel}>My In Progress</span>
            <p style={{ ...styles.statNumber, color: "#b54708" }}>{stats.inProgress}</p>
          </div>
          <div style={{ ...styles.statCard, borderLeftColor: "#12b76a" }}>
            <span style={styles.statLabel}>My Completed</span>
            <p style={{ ...styles.statNumber, color: "#12b76a" }}>{stats.completed}</p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div style={styles.tabsContainer}>
          <button
            style={styles.tabBtn(activeTab === "available")}
            onClick={() => setActiveTab("available")}
          >
            Available Requests ({availableRepairs.length})
          </button>
          <button
            style={styles.tabBtn(activeTab === "assigned")}
            onClick={() => setActiveTab("assigned")}
          >
            My Assigned Requests ({assignedRepairs.length})
          </button>
        </div>

        {/* TAB 1: Available Unclaimed Requests */}
        {activeTab === "available" && (
          <section style={styles.panel}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                Unclaimed Repair Requests
              </h2>
              <p style={{ margin: 0, color: "#667085", fontSize: "14px" }}>
                Customers waiting for a repairer. Click "Claim Request" to assign the job to yourself.
              </p>
            </div>

            {loading ? (
              <p style={{ color: "#667085" }}>Loading available requests...</p>
            ) : availableRepairs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#667085",
                }}
              >
                <span style={{ fontSize: "36px" }}>🎉</span>
                <p style={{ fontWeight: "600", fontSize: "16px", marginTop: "12px" }}>
                  No unclaimed repair requests at the moment.
                </p>
                <p style={{ fontSize: "14px" }}>
                  Check back soon or refresh to see newly submitted requests from customers.
                </p>
              </div>
            ) : (
              <div>
                {availableRepairs.map((repair) => (
                  <article key={repair._id} style={styles.card}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 300px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>
                            {repair.item}
                          </h3>
                          <span
                            style={{
                              background: "#fff7e6",
                              color: "#b54708",
                              border: "1px solid #fedf89",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            Unclaimed
                          </span>
                        </div>

                        <p style={{ color: "#344054", fontSize: "15px", margin: "8px 0" }}>
                          <strong>Problem:</strong> {repair.problem}
                        </p>

                        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "13px", color: "#667085" }}>
                          <div>
                            <strong>📍 Area:</strong> {repair.area}
                          </div>
                          <div>
                            <strong>👤 Customer:</strong> {repair.name || repair.customer?.name || "Customer"}
                          </div>
                          {repair.createdAt && (
                            <div>
                              <strong>📅 Submitted:</strong>{" "}
                              {new Date(repair.createdAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ minWidth: "150px" }}>
                        <button
                          onClick={() => handleClaim(repair._id)}
                          disabled={claimingId === repair._id}
                          style={{
                            ...styles.button,
                            background: "#153e35",
                            color: "white",
                            width: "100%",
                          }}
                        >
                          {claimingId === repair._id ? "Claiming..." : "Claim Request →"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: My Assigned Requests */}
        {activeTab === "assigned" && (
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
                <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                  My Assigned Requests
                </h2>
                <p style={{ margin: 0, color: "#667085", fontSize: "14px" }}>
                  Update the status as you repair and finish each item.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label htmlFor="filterStatus" style={{ fontSize: "13px", fontWeight: "600" }}>
                  Filter:
                </label>
                <select
                  id="filterStatus"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    background: "white",
                    fontSize: "13px",
                  }}
                >
                  <option value="All">All ({assignedRepairs.length})</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p style={{ color: "#667085" }}>Loading assigned requests...</p>
            ) : filteredAssigned.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#667085",
                }}
              >
                <span style={{ fontSize: "36px" }}>🛠️</span>
                <p style={{ fontWeight: "600", fontSize: "16px", marginTop: "12px" }}>
                  No requests found for this filter.
                </p>
                <p style={{ fontSize: "14px" }}>
                  Switch to the "Available Requests" tab to claim work.
                </p>
              </div>
            ) : (
              <div>
                {filteredAssigned.map((repair) => {
                  const status = repair.status || "In Progress";
                  const isCompleted = status === "Completed";

                  return (
                    <article key={repair._id} style={styles.card}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: "1 1 300px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>
                              {repair.item}
                            </h3>
                            <span
                              style={{
                                background: isCompleted ? "#edfcf2" : "#eff8ff",
                                color: isCompleted ? "#1b7340" : "#175cd3",
                                border: `1px solid ${isCompleted ? "#aaf0c4" : "#b2ddff"}`,
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "700",
                              }}
                            >
                              {status}
                            </span>
                          </div>

                          <p style={{ color: "#344054", fontSize: "15px", margin: "8px 0" }}>
                            <strong>Problem:</strong> {repair.problem}
                          </p>

                          <div
                            style={{
                              background: "#f8faf9",
                              padding: "12px",
                              borderRadius: "8px",
                              margin: "12px 0",
                              fontSize: "13px",
                            }}
                          >
                            <div>
                              <strong>Customer Name:</strong>{" "}
                              {repair.customer?.name || repair.name || "Customer"}
                            </div>
                            <div>
                              <strong>Area:</strong> {repair.area}
                            </div>
                            {(repair.phone || repair.customer?.phone) && (
                              <div>
                                <strong>Contact:</strong>{" "}
                                {repair.phone || repair.customer?.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            minWidth: "200px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475467" }}>
                            Update Repair Status:
                          </label>

                          <select
                            value={status}
                            disabled={updatingId === repair._id}
                            onChange={(e) => handleStatusChange(repair._id, e.target.value)}
                            style={{
                              padding: "10px",
                              borderRadius: "8px",
                              border: "1px solid #d0d5dd",
                              background: "white",
                              fontSize: "14px",
                              fontWeight: "600",
                            }}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>

                          {updatingId === repair._id && (
                            <span style={{ fontSize: "12px", color: "#667085" }}>
                              Saving changes...
                            </span>
                          )}

                          {isCompleted && (
                            <span style={{ fontSize: "12px", color: "#1b7340", fontWeight: "600" }}>
                              ✓ Marked as completed
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

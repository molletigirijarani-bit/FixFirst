import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, saveSession } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveSession(data.token, data.user);

      const role = data.user.role;

      if (role === "customer") {
        navigate("/customer-dashboard", { replace: true });
      } else if (role === "repairer") {
        navigate("/repairer-dashboard", { replace: true });
      } else if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        setMessage("Invalid user role. Please contact support.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Welcome back</h1>
        <p>Log in to manage your FixFirst activity.</p>

        {message && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fef3f2",
              color: "#b42318",
              border: "1px solid #fecdca",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {message}
          </div>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="Enter your email"
          autoComplete="email"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading} style={{ marginTop: "16px" }}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p style={{ marginTop: "18px" }}>
          New to FixFirst? <Link to="/register">Create an account</Link>
        </p>

        <Link to="/" style={{ color: "#36865b", fontWeight: "600" }}>
          ← Back to home
        </Link>
      </form>
    </main>
  );
}

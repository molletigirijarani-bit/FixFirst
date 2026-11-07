import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setIsError(false);
      setMessage(
        `${data.message || "Registration successful!"} Redirecting to login...`
      );
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create your account</h1>
        <p>Join FixFirst and give your items a second life.</p>

        {message && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: isError ? "#fef3f2" : "#edfcf2",
              color: isError ? "#b42318" : "#1b7340",
              border: `1px solid ${isError ? "#fecdca" : "#aaf0c4"}`,
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {message}
          </div>
        )}

        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="e.g. Maya Sharma"
          autoComplete="name"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="Enter your email"
          autoComplete="email"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          required
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />

        <label htmlFor="role">Account type</label>
        <select
          id="role"
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="customer">Customer (I want to repair items)</option>
          <option value="repairer">Repairer (I offer repair services)</option>
        </select>

        <button type="submit" disabled={loading} style={{ marginTop: "16px" }}>
          {loading ? "Creating account..." : "Register"}
        </button>

        <p style={{ marginTop: "18px" }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>

        <Link to="/" style={{ color: "#36865b", fontWeight: "600" }}>
          ← Back to home
        </Link>
      </form>
    </main>
  );
}

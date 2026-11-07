import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  apiRequest,
  getStoredUser,
  getStoredToken,
  clearSession,
} from "../services/api";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const token = getStoredToken();

  const [repairCost, setRepairCost] = useState("400");
  const [replacementCost, setReplacementCost] = useState("1800");

  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [repairRequests, setRepairRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Load providers on mount
  useEffect(() => {
    let ignore = false;

    async function loadProviders() {
      try {
        const data = await apiRequest("/providers");
        if (!ignore && Array.isArray(data)) {
          setProviders(data);
        }
      } catch (err) {
        if (!ignore) {
          console.warn("Could not load dynamic providers, using default demo data:", err);
          setProviders([
            {
              id: "demo-1",
              name: "Ravi Electronics (Demo)",
              category: "Electronics",
              area: "Madhapur, Hyderabad",
              price: "₹200–₹800 (Sample Range)",
              rating: 4.8,
              icon: "🔌",
              isDemo: true,
            },
            {
              id: "demo-2",
              name: "GreenFix Appliances (Demo)",
              category: "Home Appliances",
              area: "Kondapur, Hyderabad",
              price: "₹300–₹1,000 (Sample Range)",
              rating: 4.7,
              icon: "🔧",
              isDemo: true,
            },
            {
              id: "demo-3",
              name: "CycleCare Workshop (Demo)",
              category: "Bicycles",
              area: "Gachibowli, Hyderabad",
              price: "₹100–₹500 (Sample Range)",
              rating: 4.9,
              icon: "🚲",
              isDemo: true,
            },
          ]);
        }
      } finally {
        if (!ignore) {
          setLoadingProviders(false);
        }
      }
    }

    loadProviders();

    return () => {
      ignore = true;
    };
  }, []);

  // Load customer's repair requests when token changes
  useEffect(() => {
    if (!token) return;

    let ignore = false;

    async function loadRepairs() {
      try {
        const data = await apiRequest("/repairs/my-repairs");
        if (!ignore) {
          setRepairRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error fetching customer repairs:", error);
          setRequestError(
            error.message || "Could not load your repair requests. Backend may be offline."
          );
        }
      } finally {
        if (!ignore) {
          setLoadingRequests(false);
        }
      }
    }

    loadRepairs();

    return () => {
      ignore = true;
    };
  }, [token]);

  // Refresh customer repair requests manually from user action
  async function handleRefreshRepairs() {
    if (!token) return;
    setLoadingRequests(true);
    setRequestError("");
    try {
      const data = await apiRequest("/repairs/my-repairs");
      setRepairRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error refreshing repairs:", error);
      setRequestError(error.message || "Failed to refresh repair requests.");
    } finally {
      setLoadingRequests(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  // Cost calculator calculations
  const repair = Number(repairCost);
  const replacement = Number(replacementCost);

  const validCosts =
    repairCost !== "" &&
    replacementCost !== "" &&
    Number.isFinite(repair) &&
    Number.isFinite(replacement) &&
    repair >= 0 &&
    replacement > 0;

  const savings = replacement - repair;
  const repairPercentage = validCosts
    ? Math.min(Math.round((repair / replacement) * 100), 100)
    : 0;

  // Filter providers
  const filteredProviders = providers.filter((provider) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (provider.name && provider.name.toLowerCase().includes(q)) ||
      (provider.area && provider.area.toLowerCase().includes(q)) ||
      (provider.category && provider.category.toLowerCase().includes(q));

    const matchesCategory =
      category === "All" ||
      (provider.category &&
        provider.category.toLowerCase().includes(category.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  // Submit repair request
  async function handleRequestSubmit(event) {
    event.preventDefault();
    setFormMessage("");
    setFormError(false);

    if (!token) {
      setFormError(true);
      setFormMessage("Please log in as a customer to submit a repair request.");
      return;
    }

    if (currentUser && currentUser.role !== "customer") {
      setFormError(true);
      setFormMessage(
        `You are logged in as a ${currentUser.role}. Only customers can create repair requests.`
      );
      return;
    }

    const form = event.currentTarget;
    // Use namedItem() because "item" is also a built-in collection method.
    const itemField = form.elements.namedItem("item");
    const problemField = form.elements.namedItem("problem");
    const areaField = form.elements.namedItem("area");
    const phoneField = form.elements.namedItem("phone");

    const item = itemField?.value?.trim() || "";
    const problem = problemField?.value?.trim() || "";
    const area = areaField?.value?.trim() || "";
    const phone = phoneField?.value?.trim() || "";

    if (!item || !problem || !area) {
      setFormError(true);
      setFormMessage("Please fill in the item name, problem, and your area.");
      return;
    }

    setSubmitting(true);

    try {
      const newRepair = await apiRequest("/repairs", {
        method: "POST",
        body: JSON.stringify({ item, problem, area, phone }),
      });

      setFormError(false);
      const createdRepair = newRepair?.repair || newRepair;
      setFormMessage(
        `Success! Your repair request for "${createdRepair?.item || item}" has been registered.`
      );
      form.reset();

      // A refresh failure must not turn a successfully-created request into a false failure.
      try {
        await handleRefreshRepairs();
      } catch (refreshError) {
        console.warn("Request was created, but the list could not refresh:", refreshError);
      }

      // Smooth scroll to my-repairs
      setTimeout(() => {
        document.getElementById("my-repairs")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (error) {
      setFormError(true);
      setFormMessage(error.message || "Failed to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete repair request (customer allowed only if Pending and unassigned)
  async function handleDeleteRequest(requestId, itemStatus) {
    if (itemStatus && itemStatus !== "Pending") {
      alert("This repair is already in progress or completed and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this repair request?"
    );
    if (!confirmed) return;

    setDeletingId(requestId);
    try {
      await apiRequest(`/repairs/${requestId}`, {
        method: "DELETE",
      });

      setRepairRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (error) {
      alert(error.message || "Could not delete the repair request.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app">
      {/* Navigation */}
      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon">↻</span>
          Fix<span>First</span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#calculator">Cost Calculator</a>
          <a href="#providers">Find a Repairer</a>
          <a href="#my-repairs">My Repairs</a>
          {currentUser && currentUser.role === "repairer" && (
            <Link to="/repairer-dashboard" style={{ color: "#36865b", fontWeight: "700" }}>
              Repairer Portal →
            </Link>
          )}
          {currentUser && currentUser.role === "admin" && (
            <Link to="/admin-dashboard" style={{ color: "#36865b", fontWeight: "700" }}>
              Admin Portal →
            </Link>
          )}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "13px",
                  background: "#e8f5ee",
                  color: "#205739",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontWeight: "600",
                }}
              >
                👤 {currentUser.name} ({currentUser.role})
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="secondary-button"
                style={{ padding: "8px 14px", fontSize: "13px" }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Link to="/login" className="secondary-button" style={{ padding: "8px 14px", fontSize: "13px" }}>
                Log in
              </Link>
              <Link to="/register" className="nav-button" style={{ padding: "8px 14px", fontSize: "13px" }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero section */}
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot"></span>
              A SMALL REPAIR. A BIG DIFFERENCE.
            </div>

            <h1>
              Don't replace it.
              <br />
              <span>Repair it first.</span>
            </h1>

            <p className="hero-description">
              Save money, reduce waste, and support local repair professionals.
              Give your everyday essentials a second chance with FixFirst.
            </p>

            <div className="hero-actions">
              <a href="#calculator" className="primary-button">
                Compare Your Costs <span>→</span>
              </a>

              <a href="#providers" className="secondary-button">
                Find a Repairer
              </a>
            </div>

            <div className="hero-note">
              <span>♻</span>
              Better for your wallet. Better for the planet.
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-circle">
              <span className="tool tool-one">🔧</span>
              <span className="tool tool-two">💡</span>
              <span className="tool tool-three">⚙️</span>

              <div className="repair-illustration">
                <div className="illustration-top">✦</div>
                <div className="illustration-symbol">↻</div>
                <div className="illustration-title">REPAIR</div>
                <div className="illustration-caption">
                  Give it another life
                </div>
              </div>

              <div className="floating-card">
                <span className="floating-icon">✓</span>
                <div>
                  <strong>Waste less</strong>
                  <p>Choose repair first</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact strip */}
        <section className="impact-strip">
          <div>
            <span className="impact-icon">💰</span>
            <div>
              <strong>Spend smarter</strong>
              <p>Compare costs before replacing</p>
            </div>
          </div>

          <div>
            <span className="impact-icon">🌱</span>
            <div>
              <strong>Reduce waste</strong>
              <p>Keep useful products in service</p>
            </div>
          </div>

          <div>
            <span className="impact-icon">🛠️</span>
            <div>
              <strong>Support local skills</strong>
              <p>Discover nearby repair services</p>
            </div>
          </div>
        </section>

        {/* Cost calculator */}
        <section className="calculator-section section" id="calculator">
          <div className="section-heading">
            <div className="eyebrow">MAKE AN INFORMED DECISION</div>
            <h2>Repair or replace?</h2>
            <p>
              A simple comparison can help you understand your potential
              savings before you decide.
            </p>
          </div>

          <div className="calculator-card">
            <div className="calculator-inputs">
              <div className="field">
                <label htmlFor="repairCost">Estimated repair cost (₹)</label>
                <input
                  id="repairCost"
                  type="number"
                  min="0"
                  value={repairCost}
                  onChange={(event) => setRepairCost(event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="replacementCost">Replacement cost (₹)</label>
                <input
                  id="replacementCost"
                  type="number"
                  min="1"
                  value={replacementCost}
                  onChange={(event) => setReplacementCost(event.target.value)}
                />
              </div>

              <div className="example-note">
                💡 Enter estimates for your own item to compare costs.
              </div>
            </div>

            <div className="calculator-result">
              <span className="result-label">YOUR COST COMPARISON</span>

              {validCosts ? (
                <>
                  <h3>
                    {savings >= 0
                      ? `Potential savings: ₹${savings.toLocaleString("en-IN")}`
                      : `Repair costs ₹${Math.abs(savings).toLocaleString("en-IN")} more`}
                  </h3>

                  <div className="cost-row">
                    <span>Repair</span>
                    <strong>₹{repair.toLocaleString("en-IN")}</strong>
                  </div>

                  <div className="cost-row">
                    <span>Replace</span>
                    <strong>₹{replacement.toLocaleString("en-IN")}</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${repairPercentage}%` }}
                    ></div>
                  </div>

                  <p className="result-note">
                    Repair cost is {repairPercentage}% of the replacement cost.
                  </p>
                </>
              ) : (
                <p className="validation-message">
                  Enter a non-negative repair cost and a replacement cost greater than zero.
                </p>
              )}

              <p className="disclaimer">
                Estimates only. Consider safety, reliability, and remaining product life before deciding.
              </p>
            </div>
          </div>
        </section>

        {/* Find a repairer */}
        <section className="providers-section section" id="providers">
          <div className="section-heading">
            <div className="eyebrow">GIVE LOCAL REPAIRERS A CHANCE</div>
            <h2>Find your next repairer.</h2>
            <p>
              Explore local repair professionals and demonstration listings.
            </p>
          </div>

          <div className="provider-filters">
            <input
              type="search"
              placeholder="Search name, category or area..."
              aria-label="Search repair providers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Home Appliances">Home Appliances</option>
              <option value="Bicycles">Bicycles</option>
            </select>
          </div>

          {loadingProviders ? (
            <p style={{ textAlign: "center", color: "#667085", padding: "20px" }}>
              Loading repair service providers...
            </p>
          ) : (
            <div className="provider-grid">
              {filteredProviders.length > 0 ? (
                filteredProviders.map((provider) => (
                  <article className="provider-card" key={provider.id}>
                    <div className="provider-card-top">
                      <div className="provider-icon">{provider.icon || "🔧"}</div>
                      {provider.isDemo ? (
                        <span
                          style={{
                            background: "#fff7e6",
                            color: "#b54708",
                            border: "1px solid #fedf89",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          ★ {provider.rating} · Sample Listing
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#e8f5ee",
                            color: "#205739",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          Registered Repairer
                        </span>
                      )}
                    </div>

                    <h3>{provider.name}</h3>
                    <p className="provider-category">{provider.category}</p>

                    <div className="provider-detail">
                      <span>📍</span> {provider.area}
                    </div>

                    <div className="provider-detail">
                      <span>₹</span> {provider.price || "Contact for diagnostic quote"}
                    </div>

                    <button
                      type="button"
                      className="provider-button"
                      onClick={() => {
                        document
                          .getElementById("request")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Request a Repair →
                    </button>
                  </article>
                ))
              ) : (
                <p className="empty-state">
                  No matching providers. Try another search or category.
                </p>
              )}
            </div>
          )}

          <p className="demo-note">
            ℹ️ Provider Listings Note: Sample listings are labelled for demonstration. As real local professionals register, their profile details appear in the directory.
          </p>
        </section>

        {/* Submit repair request */}
        <section className="request-section section" id="request">
          <div className="request-copy">
            <div className="eyebrow">EVERY REPAIR STARTS SOMEWHERE</div>
            <h2>What needs fixing?</h2>
            <p>
              Describe your broken item and where you need help.
              Start your repair request here.
            </p>

            <div className="request-benefit">
              <span>✓</span> Keep products useful for longer
            </div>
            <div className="request-benefit">
              <span>✓</span> Make more informed spending decisions
            </div>
            <div className="request-benefit">
              <span>✓</span> Help reduce avoidable waste
            </div>
          </div>

          <form className="request-form" onSubmit={handleRequestSubmit}>
            <h3>Repair request</h3>
            <p className="form-subtitle">
              Tell us a little about the problem.
            </p>

            {formMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: formError ? "#fef3f2" : "#edfcf2",
                  color: formError ? "#b42318" : "#1b7340",
                  border: `1px solid ${formError ? "#fecdca" : "#aaf0c4"}`,
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
                role={formError ? "alert" : "status"}
              >
                {formMessage}
                {!token && (
                  <div style={{ marginTop: "8px" }}>
                    <Link to="/login" style={{ fontWeight: "700", textDecoration: "underline" }}>
                      Log in here →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="item">Item name *</label>
              <input
                id="item"
                name="item"
                placeholder="e.g. Electric fan, Microwave, Blender"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="problem">Describe the problem *</label>
              <textarea
                id="problem"
                name="problem"
                placeholder="What happened to your item? e.g. motor makes noise and stops after 2 minutes"
                rows="3"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="area">Your area / locality *</label>
              <input
                id="area"
                name="area"
                placeholder="e.g. Madhapur, Hyderabad"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Contact phone (optional)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="e.g. 9876543210"
              />
            </div>

            <button
              type="submit"
              className="primary-button form-submit"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Repair Request →"}
            </button>
          </form>
        </section>

        {/* Customer's repair requests */}
        <section className="section" id="my-repairs">
          <div className="section-heading">
            <div className="eyebrow">TRACK YOUR REQUESTS</div>
            <h2>My Repair Requests</h2>
            <p>
              View the repair requests you submitted and track their current status.
            </p>
          </div>

          {!token ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                background: "#f8faf9",
                borderRadius: "12px",
                maxWidth: "600px",
                margin: "0 auto",
                border: "1px dashed #c0d8cb",
              }}
            >
              <span style={{ fontSize: "36px" }}>🔒</span>
              <h3 style={{ margin: "12px 0 6px" }}>Login to track your repairs</h3>
              <p style={{ color: "#5f7066", marginBottom: "18px" }}>
                Please log in with your customer account to view and manage your submitted repair requests.
              </p>
              <Link to="/login" className="primary-button" style={{ display: "inline-block" }}>
                Log In Now →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleRefreshRepairs}
                  disabled={loadingRequests}
                  style={{ padding: "8px 18px" }}
                >
                  {loadingRequests ? "Refreshing..." : "↻ Refresh Requests"}
                </button>
              </div>

              {requestError && (
                <div
                  role="alert"
                  style={{
                    maxWidth: "700px",
                    margin: "0 auto 20px",
                    padding: "12px",
                    background: "#fef3f2",
                    color: "#b42318",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  {requestError}
                </div>
              )}

              {loadingRequests ? (
                <p style={{ textAlign: "center", color: "#5f7066" }}>
                  Loading your repair requests...
                </p>
              ) : repairRequests.length === 0 ? (
                <div className="empty-state" style={{ maxWidth: "500px", margin: "0 auto" }}>
                  <p>You haven't submitted any repair requests yet.</p>
                  <a
                    href="#request"
                    className="provider-button"
                    style={{ display: "inline-block", marginTop: "10px" }}
                  >
                    Submit a Request Above ↑
                  </a>
                </div>
              ) : (
                <div className="provider-grid">
                  {repairRequests.map((request) => {
                    const status = request.status || "Pending";
                    const isPending = status === "Pending";
                    const isCompleted = status === "Completed";
                    const isInProgress = status === "In Progress";

                    const badgeColor = isCompleted
                      ? { bg: "#e6f8ef", text: "#1b7340", border: "#a6e5c2" }
                      : isInProgress
                      ? { bg: "#eff8ff", text: "#175cd3", border: "#b2ddff" }
                      : { bg: "#fff7e6", text: "#b54708", border: "#fedf89" };

                    return (
                      <article
                        className="provider-card"
                        key={request._id}
                        style={{ display: "flex", flexDirection: "column" }}
                      >
                        <div className="provider-card-top">
                          <div className="provider-icon">
                            {isCompleted ? "✅" : isInProgress ? "⚙️" : "⏳"}
                          </div>
                          <span
                            style={{
                              background: badgeColor.bg,
                              color: badgeColor.text,
                              border: `1px solid ${badgeColor.border}`,
                              padding: "4px 10px",
                              borderRadius: "14px",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            {status}
                          </span>
                        </div>

                        <h3>{request.item}</h3>
                        <p style={{ color: "#475467", fontSize: "14px", flex: "1 0 auto" }}>
                          {request.problem}
                        </p>

                        <div className="provider-detail">
                          <span>📍</span> {request.area}
                        </div>

                        {request.createdAt && (
                          <div className="provider-detail">
                            <span>📅</span> Submitted:{" "}
                            {new Date(request.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}

                        <div
                          style={{
                            background: "#f9fafb",
                            padding: "10px",
                            borderRadius: "8px",
                            margin: "12px 0",
                            fontSize: "13px",
                          }}
                        >
                          <strong>Assigned Repairer:</strong>{" "}
                          {request.assignedRepairer ? (
                            <span style={{ color: "#175cd3", fontWeight: "600" }}>
                              🛠️ {request.assignedRepairer.name || "Assigned Professional"}
                            </span>
                          ) : (
                            <span style={{ color: "#b54708" }}>
                              Unassigned (Waiting for repairer to claim)
                            </span>
                          )}
                        </div>

                        <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                          {isPending ? (
                            <button
                              type="button"
                              className="provider-button"
                              style={{
                                background: "#fee4e2",
                                color: "#b42318",
                                width: "100%",
                              }}
                              onClick={() => handleDeleteRequest(request._id, request.status)}
                              disabled={deletingId === request._id}
                            >
                              {deletingId === request._id ? "Deleting..." : "Delete Request"}
                            </button>
                          ) : (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#667085",
                                textAlign: "center",
                                padding: "6px",
                              }}
                            >
                              {isCompleted
                                ? "✓ This repair has been completed!"
                                : "⚙️ In progress: cannot be deleted while work is underway."}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Closing banner */}
        <section className="closing-banner">
          <span>♻</span>
          <div>
            <h2>Before you throw it away, give repair a chance.</h2>
            <p>Small choices today can help reduce tomorrow's waste.</p>
          </div>
          <a href="#calculator">Start Comparing →</a>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <a href="#home" className="brand">
          <span className="brand-icon">↻</span>
          Fix<span>First</span>
        </a>
        <p>Repair more. Waste less. Live better.</p>
        <span>© 2026 FixFirst · Repair Before Replace</span>
      </footer>
    </div>
  );
}

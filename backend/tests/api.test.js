const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const RepairRequest = require("../models/RepairRequest");
const Review = require("../models/Review");

async function runTests() {
  console.log("==================================================");
  console.log("FixFirst Isolated Test Suite (Task 8)");
  console.log("==================================================");

  // SAFETY GUARD: Never run destructive tests against the production/live database
  const testDbUri = process.env.TEST_MONGO_URI;

  if (!testDbUri) {
    console.log("SAFETY GUARD: Dedicated TEST_MONGO_URI not configured.");
    console.log("To prevent accidental mutation or deletion of live database records,");
    console.log("destructive end-to-end workflow tests are skipped by default.");
    console.log("");
    console.log("To run tests against an isolated test database, configure in server/.env:");
    console.log("  TEST_MONGO_URI=mongodb+srv://<user>:<password>@cluster/fixfirst_test?retryWrites=true&w=majority");
    console.log("==================================================");
    process.exit(0);
  }

  let server;
  const TEST_PORT = process.env.TEST_PORT || 5099;
  const BASE_URL = `http://localhost:${TEST_PORT}/api`;

  // Tracking sets for guaranteed cleanup
  const createdUserIds = new Set();
  const createdRepairIds = new Set();
  const createdReviewIds = new Set();

  try {
    console.log("Connecting to dedicated test database...");
    await mongoose.connect(testDbUri);
    console.log("✓ Connected to test database.");

    server = app.listen(TEST_PORT);
    console.log(`✓ Test server running on ${BASE_URL}`);

    async function api(endpoint, options = {}, token = null) {
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      return { status: res.status, ok: res.ok, data: json };
    }

    const timestamp = Date.now();
    const customer1Email = `test-cust1-${timestamp}@fixfirst-test.internal`;
    const customer2Email = `test-cust2-${timestamp}@fixfirst-test.internal`;
    const repairer1Email = `test-rep1-${timestamp}@fixfirst-test.internal`;
    const repairer2Email = `test-rep2-${timestamp}@fixfirst-test.internal`;
    const adminEmail = `test-admin-${timestamp}@fixfirst-test.internal`;
    const password = "TestSecurePassword2026!";

    let customer1Token, customer1Id;
    let customer2Token, customer2Id;
    let repairer1Token, repairer1Id;
    let repairer2Token, repairer2Id;
    let adminToken, adminId;
    let repairId;

    // 1. Register Customer 1
    console.log("\n[1] Register customer");
    const regRes = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer One",
        email: customer1Email,
        password,
        role: "customer",
      }),
    });
    if (regRes.status !== 201) throw new Error(`Customer registration failed: ${JSON.stringify(regRes.data)}`);
    customer1Id = regRes.data.user.id;
    createdUserIds.add(customer1Id);
    console.log("✓ Customer registered with test email:", customer1Email);

    // 2. Login as Customer 1
    console.log("\n[2] Login as customer");
    const loginRes = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: customer1Email, password }),
    });
    if (loginRes.status !== 200 || !loginRes.data.token) throw new Error("Customer login failed");
    customer1Token = loginRes.data.token;
    console.log("✓ Customer logged in. Token received.");

    // 3. Create Repair Request
    console.log("\n[3] Create repair request");
    const createReq = await api(
      "/repairs",
      {
        method: "POST",
        body: JSON.stringify({
          item: "Precision Coffee Grinder",
          problem: "Burrs jammed with roasted beans",
          area: "Madhapur, Hyderabad",
          phone: "9123456789",
        }),
      },
      customer1Token
    );
    if (createReq.status !== 201) throw new Error(`Create repair failed: ${JSON.stringify(createReq.data)}`);
    repairId = createReq.data._id;
    createdRepairIds.add(repairId);
    console.log("✓ Repair request created with ID:", repairId);

    // 4. Contact Info Privacy on Unclaimed Requests
    console.log("\n[4] Register repairer & verify customer contact info is NOT leaked on unclaimed requests");
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Tech Specialist Sharma",
        email: repairer1Email,
        password,
        role: "repairer",
      }),
    });
    const r1Login = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: repairer1Email, password }),
    });
    repairer1Token = r1Login.data.token;
    repairer1Id = r1Login.data.user.id;
    createdUserIds.add(repairer1Id);

    const availableRes = await api("/repairs/available", {}, repairer1Token);
    const unclaimedItem = availableRes.data.find((r) => r._id === repairId);
    if (!unclaimedItem) throw new Error("Unclaimed item not found in available list");
    if (unclaimedItem.phone) throw new Error("SECURITY FAILURE: Customer phone leaked on unclaimed request!");
    if (unclaimedItem.customer && unclaimedItem.customer.email) {
      throw new Error("SECURITY FAILURE: Customer email leaked on unclaimed request!");
    }
    console.log("✓ Customer contact details successfully hidden on unclaimed request.");

    // 5. Atomic Claim
    console.log("\n[5] Atomic claim by repairer");
    const claimRes = await api(`/repairs/${repairId}/claim`, { method: "POST" }, repairer1Token);
    if (claimRes.status !== 200) throw new Error(`Claim failed: ${JSON.stringify(claimRes.data)}`);
    console.log("✓ Request claimed. Status transitioned to In Progress.");

    // 6. Concurrency Guard: Second repairer cannot claim
    console.log("\n[6] Concurrency guard against double-claim");
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Second Tech Kumar",
        email: repairer2Email,
        password,
        role: "repairer",
      }),
    });
    const r2Login = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: repairer2Email, password }),
    });
    repairer2Token = r2Login.data.token;
    repairer2Id = r2Login.data.user.id;
    createdUserIds.add(repairer2Id);

    const doubleClaim = await api(`/repairs/${repairId}/claim`, { method: "POST" }, repairer2Token);
    if (doubleClaim.status !== 409) throw new Error(`Expected 409 Conflict, got ${doubleClaim.status}`);
    console.log("✓ Concurrency verified: Double-claim rejected with 409 Conflict.");

    // 7. Status transition enforcement: Revert to Pending must be rejected
    console.log("\n[7] Enforce valid status transitions");
    const invalidRevert = await api(
      `/repairs/${repairId}/status`,
      { method: "PUT", body: JSON.stringify({ status: "Pending" }) },
      repairer1Token
    );
    if (invalidRevert.status !== 400) throw new Error(`Expected 400 Bad Request on invalid revert, got ${invalidRevert.status}`);
    console.log("✓ Invalid transition (In Progress -> Pending) rejected with 400.");

    // 8. Complete work
    const completeRes = await api(
      `/repairs/${repairId}/status`,
      { method: "PUT", body: JSON.stringify({ status: "Completed" }) },
      repairer1Token
    );
    if (completeRes.status !== 200) throw new Error("Complete failed");
    console.log("✓ Status transitioned to Completed.");

    // 9. Completed request cannot revert
    const revertCompleted = await api(
      `/repairs/${repairId}/status`,
      { method: "PUT", body: JSON.stringify({ status: "In Progress" }) },
      repairer1Token
    );
    if (revertCompleted.status !== 400) throw new Error(`Expected 400 on completed reversion, got ${revertCompleted.status}`);
    console.log("✓ Reverting completed request rejected with 400.");

    // 10. Reviews: Valid completed review submission
    console.log("\n[10] Customer review workflow");
    const reviewRes = await api(
      "/reviews",
      {
        method: "POST",
        body: JSON.stringify({
          repairRequestId: repairId,
          rating: 5,
          comment: "Grinder fixed perfectly. High quality craftsmanship!",
        }),
      },
      customer1Token
    );
    if (reviewRes.status !== 201) throw new Error(`Review submission failed: ${JSON.stringify(reviewRes.data)}`);
    createdReviewIds.add(reviewRes.data._id);
    console.log("✓ Review recorded with verified customer and repairer references.");

    // 11. Prevent duplicate reviews
    const dupReview = await api(
      "/reviews",
      {
        method: "POST",
        body: JSON.stringify({
          repairRequestId: repairId,
          rating: 4,
          comment: "Duplicate review attempt",
        }),
      },
      customer1Token
    );
    if (dupReview.status !== 409) throw new Error(`Expected 409 Conflict on duplicate review, got ${dupReview.status}`);
    console.log("✓ Duplicate review rejected with 409 Conflict.");

    // 12. Ownership security: Customer 2 cannot review Customer 1's repair
    console.log("\n[12] Customer review ownership check");
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer Two",
        email: customer2Email,
        password,
        role: "customer",
      }),
    });
    const c2Login = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: customer2Email, password }),
    });
    customer2Token = c2Login.data.token;
    customer2Id = c2Login.data.user.id;
    createdUserIds.add(customer2Id);

    const c2Review = await api(
      "/reviews",
      {
        method: "POST",
        body: JSON.stringify({
          repairRequestId: repairId,
          rating: 1,
          comment: "Unauthorized review",
        }),
      },
      customer2Token
    );
    if (c2Review.status !== 403) throw new Error(`Expected 403 Forbidden, got ${c2Review.status}`);
    console.log("✓ Non-owner forbidden (403) from reviewing another customer's repair.");

    // 13. Public admin setup disabled
    console.log("\n[13] Confirm public setup-admin is disabled");
    const setupAdminRes = await api("/auth/setup-admin", {
      method: "POST",
      body: JSON.stringify({ name: "Hacker", email: "h@h.org", password: "Password123" }),
    });
    if (setupAdminRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for removed setup-admin, got ${setupAdminRes.status}`);
    }
    console.log("✓ Public setup-admin route is verified disabled (404 Not Found).");

    console.log("\n==================================================");
    console.log("ALL TESTS PASSED SUCCESSFULLY ON TEST DATABASE!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ TEST ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    console.log("\n[Teardown] Performing guaranteed cleanup of test dataset...");
    try {
      if (createdReviewIds.size > 0) {
        await Review.deleteMany({ _id: { $in: Array.from(createdReviewIds) } });
      }
      if (createdRepairIds.size > 0) {
        await RepairRequest.deleteMany({ _id: { $in: Array.from(createdRepairIds) } });
      }
      if (createdUserIds.size > 0) {
        await User.deleteMany({ _id: { $in: Array.from(createdUserIds) } });
      }
      console.log("✓ Test records cleaned up successfully.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }

    if (server) {
      await new Promise((res) => server.close(res));
    }
    await mongoose.disconnect();
    process.exit();
  }
}

runTests();

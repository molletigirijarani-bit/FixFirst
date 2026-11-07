const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const RepairRequest = require("../models/RepairRequest");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const { authorize } = protect;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper to sanitize an unclaimed request so private customer contact info is not disclosed
function sanitizeUnclaimedRepair(repairDoc) {
  const obj = repairDoc.toObject ? repairDoc.toObject() : { ...repairDoc };
  // Never expose customer private phone or email on unclaimed requests
  delete obj.phone;
  if (obj.customer && typeof obj.customer === "object") {
    delete obj.customer.email;
    delete obj.customer.phone;
  }
  return obj;
}

// GET /api/repairs/stats - Aggregated stats for dashboards
router.get("/stats", protect, async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === "admin") {
      const [
        totalCustomers,
        totalRepairers,
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
      ] = await Promise.all([
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "repairer" }),
        RepairRequest.countDocuments(),
        RepairRequest.countDocuments({ status: "Pending" }),
        RepairRequest.countDocuments({ status: "In Progress" }),
        RepairRequest.countDocuments({ status: "Completed" }),
      ]);

      return res.json({
        totalCustomers,
        totalRepairers,
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
      });
    }

    if (role === "repairer") {
      const [available, assigned, inProgress, completed] = await Promise.all([
        RepairRequest.countDocuments({
          status: "Pending",
          assignedRepairer: null,
        }),
        RepairRequest.countDocuments({ assignedRepairer: id }),
        RepairRequest.countDocuments({
          assignedRepairer: id,
          status: "In Progress",
        }),
        RepairRequest.countDocuments({
          assignedRepairer: id,
          status: "Completed",
        }),
      ]);

      return res.json({
        available,
        assigned,
        inProgress,
        completed,
      });
    }

    if (role === "customer") {
      const [total, pending, inProgress, completed] = await Promise.all([
        RepairRequest.countDocuments({ customer: id }),
        RepairRequest.countDocuments({ customer: id, status: "Pending" }),
        RepairRequest.countDocuments({ customer: id, status: "In Progress" }),
        RepairRequest.countDocuments({ customer: id, status: "Completed" }),
      ]);

      return res.json({
        total,
        pending,
        inProgress,
        completed,
      });
    }

    res.status(403).json({ message: "Role unauthorized for statistics" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/repairs/my-repairs - Logged-in customer's own repair requests
router.get("/my-repairs", protect, authorize("customer"), async (req, res) => {
  try {
    const repairs = await RepairRequest.find({ customer: req.user.id })
      .populate("assignedRepairer", "name email")
      .sort({ createdAt: -1 });

    res.json(repairs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/repairs/available - Unclaimed requests for repairers
// PRIVACY: Excludes customer phone number and email address
router.get(
  "/available",
  protect,
  authorize("repairer", "admin"),
  async (req, res) => {
    try {
      const repairs = await RepairRequest.find({
        status: "Pending",
        assignedRepairer: null,
      })
        .select("-phone") // Never expose customer phone to general browsing
        .populate("customer", "name") // Expose only customer display name, NOT email or phone
        .sort({ createdAt: -1 });

      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/repairs/assigned - Requests assigned to the current repairer
// Full contact details are permitted because the job has been accepted
router.get(
  "/assigned",
  protect,
  authorize("repairer", "admin"),
  async (req, res) => {
    try {
      const filter =
        req.user.role === "repairer"
          ? { assignedRepairer: req.user.id }
          : { assignedRepairer: { $ne: null } };

      const repairs = await RepairRequest.find(filter)
        .populate("customer", "name email phone")
        .populate("assignedRepairer", "name email")
        .sort({ updatedAt: -1 });

      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/repairs - Create a new repair request (Customer only)
router.post("/", protect, authorize("customer"), async (req, res) => {
  try {
    const body = req.body || {};
    const item = typeof body.item === "string" ? body.item.trim() : "";
    const problem = typeof body.problem === "string" ? body.problem.trim() : "";
    const area = typeof body.area === "string" ? body.area.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!item || !problem || !area) {
      return res.status(400).json({
        message: "Please provide an item name, problem description, and area.",
        fields: {
          item: !item ? "Item name is required." : undefined,
          problem: !problem ? "Problem description is required." : undefined,
          area: !area ? "Area / locality is required." : undefined,
        },
      });
    }

    if (item.length > 120 || problem.length > 2000 || area.length > 160 || phone.length > 30) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length.",
      });
    }

    const customerUser = await User.findById(req.user.id);
    if (!customerUser) {
      return res.status(401).json({ message: "Customer account not found. Please log in again." });
    }

    // Only accept customer-entered fields; ownership and workflow fields come from the server.
    const repair = await RepairRequest.create({
      name: customerUser.name,
      phone,
      item,
      problem,
      area,
      status: "Pending",
      customer: customerUser._id,
      assignedRepairer: null,
    });

    return res.status(201).json({
      ...repair.toObject(),
      message: "Repair request created successfully.",
    });
  } catch (error) {
    console.error("Create repair request failed:", error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Unable to create repair request. Please try again." });
  }
});

// GET /api/repairs - Role-aware listing
router.get("/", protect, async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === "admin") {
      const { status, search } = req.query;
      const query = {};

      if (status && status !== "All") {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { item: { $regex: search, $options: "i" } },
          { problem: { $regex: search, $options: "i" } },
          { area: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ];
      }

      const repairs = await RepairRequest.find(query)
        .populate("customer", "name email")
        .populate("assignedRepairer", "name email")
        .sort({ createdAt: -1 });

      return res.json(repairs);
    }

    if (role === "customer") {
      // Customers ONLY see their own requests (exact ownership check)
      const repairs = await RepairRequest.find({ customer: id })
        .populate("assignedRepairer", "name email")
        .sort({ createdAt: -1 });

      return res.json(repairs);
    }

    if (role === "repairer") {
      // Repairer sees available unclaimed requests + requests assigned to them
      const rawRepairs = await RepairRequest.find({
        $or: [
          { status: "Pending", assignedRepairer: null },
          { assignedRepairer: id },
        ],
      })
        .populate("customer", "name email phone")
        .populate("assignedRepairer", "name email")
        .sort({ createdAt: -1 });

      // PRIVACY PROTECTION: Sanitize unclaimed requests so phone/email are not disclosed
      const sanitized = rawRepairs.map((r) => {
        const isAssignedToMe =
          r.assignedRepairer && r.assignedRepairer._id.toString() === id;

        if (isAssignedToMe) {
          return r;
        }
        return sanitizeUnclaimedRepair(r);
      });

      return res.json(sanitized);
    }

    res.status(403).json({ message: "Role unauthorized to view repairs" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/repairs/:id/claim - Atomically claim an unassigned request (Repairer only)
router.post(
  "/:id/claim",
  protect,
  authorize("repairer"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({ message: "Invalid repair request ID" });
      }

      const existing = await RepairRequest.findById(id);

      if (!existing) {
        return res.status(404).json({ message: "Repair request not found" });
      }

      if (existing.assignedRepairer) {
        if (existing.assignedRepairer.toString() === req.user.id) {
          return res.status(200).json({
            message: "You have already claimed this request",
            repair: existing,
          });
        }
        return res.status(409).json({
          message:
            "This repair request has already been claimed by another repairer",
        });
      }

      if (existing.status !== "Pending") {
        return res.status(400).json({
          message: `Cannot claim a request with status '${existing.status}'`,
        });
      }

      // Concurrency guard: atomic update prevents two repairers claiming concurrently
      const claimed = await RepairRequest.findOneAndUpdate(
        {
          _id: id,
          status: "Pending",
          assignedRepairer: null,
        },
        {
          assignedRepairer: req.user.id,
          status: "In Progress",
        },
        { returnDocument: "after" }
      )
        .populate("customer", "name email phone")
        .populate("assignedRepairer", "name email");

      if (!claimed) {
        return res.status(409).json({
          message:
            "This repair request was claimed by another repairer. Please select another request.",
        });
      }

      res.json({
        message: "Repair request claimed successfully!",
        repair: claimed,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/repairs/:id/status - Update status of assigned repair
// Enforces state transitions: Pending -> In Progress -> Completed
router.put(
  "/:id/status",
  protect,
  authorize("repairer", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidId(id)) {
        return res.status(400).json({ message: "Invalid repair request ID" });
      }

      const validStatuses = ["Pending", "In Progress", "Completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
        });
      }

      const repair = await RepairRequest.findById(id);

      if (!repair) {
        return res.status(404).json({ message: "Repair request not found" });
      }

      // REPAIRER PERMISSIONS & TRANSITION RULES
      if (req.user.role === "repairer") {
        if (
          !repair.assignedRepairer ||
          repair.assignedRepairer.toString() !== req.user.id
        ) {
          return res.status(403).json({
            message:
              "Forbidden: You can only update the status of requests assigned to you",
          });
        }

        // Rule: A completed request must NOT silently revert to Pending or In Progress
        if (repair.status === "Completed") {
          return res.status(400).json({
            message:
              "Invalid transition: Cannot modify the status of an already completed repair request",
          });
        }

        // Rule: A claimed in-progress request cannot be reverted to Pending by repairer
        if (repair.status === "In Progress" && status === "Pending") {
          return res.status(400).json({
            message:
              "Invalid transition: Repairers cannot revert an in-progress request back to Pending",
          });
        }
      }

      // ADMIN TRANSITIONS
      if (req.user.role === "admin") {
        // Admins can manage statuses; if reversing Completed, ensure valid status
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
        }
      }

      repair.status = status;
      await repair.save();

      const updated = await RepairRequest.findById(id)
        .populate("customer", "name email phone")
        .populate("assignedRepairer", "name email");

      res.json({
        message: `Status updated to ${status}`,
        repair: updated,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/repairs/:id - General update endpoint with strict field protection
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid repair request ID" });
    }

    const repair = await RepairRequest.findById(id);
    if (!repair) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    // Customers cannot update requests directly (status, assignments, etc.)
    if (req.user.role === "customer") {
      return res.status(403).json({
        message:
          "Customers are not authorized to update repair requests directly",
      });
    }

    // Repairers can only update status of their assigned requests
    if (req.user.role === "repairer") {
      if (
        !repair.assignedRepairer ||
        repair.assignedRepairer.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message:
            "Forbidden: You can only update requests assigned to you",
        });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({
          message: "Repairers may only update request status",
        });
      }

      // Enforce the same transition rules
      if (repair.status === "Completed") {
        return res.status(400).json({
          message:
            "Cannot modify the status of an already completed repair request",
        });
      }
      if (repair.status === "In Progress" && status === "Pending") {
        return res.status(400).json({
          message:
            "Repairers cannot revert an in-progress request back to Pending",
        });
      }

      repair.status = status;
      await repair.save();
      return res.json(repair);
    }

    // Admin updates: Only allow safe explicitly specified fields
    if (req.user.role === "admin") {
      const { status, item, problem, area } = req.body;

      if (status) {
        const validStatuses = ["Pending", "In Progress", "Completed"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
        }
        repair.status = status;
      }
      if (item) repair.item = String(item).trim();
      if (problem) repair.problem = String(problem).trim();
      if (area) repair.area = String(area).trim();

      await repair.save();
      return res.json(repair);
    }

    res.status(403).json({ message: "Unauthorized update action" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/repairs/:id - Get single repair request with ownership & privacy checks
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid repair request ID" });
    }

    const repair = await RepairRequest.findById(id)
      .populate("customer", "name email phone")
      .populate("assignedRepairer", "name email");

    if (!repair) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    // CUSTOMER CHECK: Reject if customer does not own this request OR if legacy request has no customer
    if (req.user.role === "customer") {
      if (!repair.customer || repair.customer._id.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Access denied: you do not own this repair request",
        });
      }
      return res.json(repair);
    }

    // REPAIRER CHECK:
    if (req.user.role === "repairer") {
      const isAssignedToMe =
        repair.assignedRepairer &&
        repair.assignedRepairer._id.toString() === req.user.id;

      if (isAssignedToMe) {
        // Permitted to see full details including customer contact info
        return res.json(repair);
      }

      const isUnclaimed =
        repair.status === "Pending" && !repair.assignedRepairer;

      if (isUnclaimed) {
        // Return limited information without private customer contact details
        return res.json(sanitizeUnclaimedRepair(repair));
      }

      // Assigned to another repairer -> Forbidden
      return res.status(403).json({
        message:
          "Access denied: this repair request is assigned to another professional",
      });
    }

    // ADMIN:
    if (req.user.role === "admin") {
      return res.json(repair);
    }

    res.status(403).json({ message: "Access denied" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/repairs/:id - Delete a repair request
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid repair request ID" });
    }

    const repair = await RepairRequest.findById(id);

    if (!repair) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    // REPAIRERS: Forbidden from deleting customer requests
    if (req.user.role === "repairer") {
      return res.status(403).json({
        message: "Repairers are not authorized to delete repair requests",
      });
    }

    // CUSTOMERS: Can only delete their OWN requests if still Pending and unassigned
    if (req.user.role === "customer") {
      // Reject if unowned or if legacy record has no customer reference
      if (!repair.customer || repair.customer.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Access denied: you can only delete your own repair requests",
        });
      }

      if (repair.status !== "Pending" || repair.assignedRepairer) {
        return res.status(400).json({
          message:
            "Cannot delete a repair request that is already assigned or in progress",
        });
      }
    }

    // Admin or valid customer owner can delete
    await RepairRequest.findByIdAndDelete(id);

    res.json({ message: "Repair request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

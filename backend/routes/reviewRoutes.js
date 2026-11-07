const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Review = require("../models/Review");
const RepairRequest = require("../models/RepairRequest");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const { authorize } = protect;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Demonstration reviews clearly marked as sample data
const demoReviews = [
  {
    id: "demo-1",
    providerId: "1",
    customerName: "Priya S. (Sample)",
    rating: 5,
    comment: "Fixed my ceiling fan within 2 hours. Very polite and prompt.",
    isDemo: true,
    createdAt: new Date("2026-03-10"),
  },
  {
    id: "demo-2",
    providerId: "2",
    customerName: "Karthik R. (Sample)",
    rating: 5,
    comment: "Saved money compared to buying a new microwave. Excellent service.",
    isDemo: true,
    createdAt: new Date("2026-03-15"),
  },
  {
    id: "demo-3",
    providerId: "3",
    customerName: "Ananya M. (Sample)",
    rating: 4,
    comment: "Quick gear tune-up for my commuter bicycle. Fair pricing.",
    isDemo: true,
    createdAt: new Date("2026-03-20"),
  },
];

// GET /api/reviews
router.get("/", async (req, res) => {
  try {
    const { providerId, repairRequestId } = req.query;
    const query = {};

    if (repairRequestId && isValidId(repairRequestId)) {
      query.repairRequest = repairRequestId;
    }
    if (providerId) {
      query.$or = [
        { providerId: String(providerId) },
        ...(isValidId(providerId) ? [{ repairer: providerId }] : []),
      ];
    }

    const dbReviews = await Review.find(query).sort({ createdAt: -1 });

    if (dbReviews.length > 0) {
      return res.json(dbReviews);
    }

    // Return filtered demonstration reviews when no database reviews exist yet
    const results = providerId
      ? demoReviews.filter((r) => r.providerId === String(providerId))
      : demoReviews;

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/reviews - Customer submitting review for completed repair
router.post("/", protect, authorize("customer"), async (req, res) => {
  try {
    const { repairRequestId, rating, comment } = req.body;

    // 1. Validate required repairRequestId
    if (!repairRequestId || !isValidId(repairRequestId)) {
      return res.status(400).json({
        message: "A valid repair request ID is required to submit a review",
      });
    }

    // 2. Validate rating
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // 3. Validate comment
    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        message: "A written review comment is required",
      });
    }

    // 4. Fetch the repair request and verify exact ownership
    const repair = await RepairRequest.findById(repairRequestId);
    if (!repair) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    // Reject reviews for requests with no verifiable customer ownership or non-matching owner
    if (!repair.customer || repair.customer.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Forbidden: You can only review your own repair requests",
      });
    }

    // Allow reviews only for completed repairs
    if (repair.status !== "Completed") {
      return res.status(400).json({
        message: "You can only submit a review for a completed repair",
      });
    }

    // Prevent duplicate reviews for the same repair
    const existing = await Review.findOne({
      repairRequest: repairRequestId,
      customer: req.user.id,
    });

    if (existing) {
      return res.status(409).json({
        message: "You have already submitted a review for this repair request",
      });
    }

    // Derive the reviewer's displayed name from the authenticated account (never trust browser customerName)
    const authenticatedUser = await User.findById(req.user.id);
    const verifiedCustomerName = authenticatedUser ? authenticatedUser.name : "Customer";

    // Trust only the authentic assigned repairer from the verified database record
    const verifiedRepairerId = repair.assignedRepairer || null;
    const verifiedProviderId = verifiedRepairerId ? verifiedRepairerId.toString() : null;

    const review = await Review.create({
      repairRequest: repairRequestId,
      customer: req.user.id,
      customerName: verifiedCustomerName,
      repairer: verifiedRepairerId,
      providerId: verifiedProviderId,
      rating: numRating,
      comment: comment.trim(),
      isDemo: false,
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A review has already been submitted for this repair request",
      });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

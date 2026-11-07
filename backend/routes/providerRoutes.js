const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Sample listings clearly labelled as demonstration data
const demoProviders = [
  {
    id: "demo-1",
    name: "Ravi Electronics (Demo)",
    category: "Electronics",
    area: "Madhapur, Hyderabad",
    price: "₹200–₹800 (Sample Range)",
    rating: 4.8,
    reviewCount: 12,
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
    reviewCount: 9,
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
    reviewCount: 15,
    icon: "🚲",
    isDemo: true,
  },
];

// GET /api/providers
router.get("/", async (req, res) => {
  try {
    const { category, area, search } = req.query;

    let results = [];

    // Include registered repairers with ONLY profile-supported information
    try {
      const realRepairers = await User.find({ role: "repairer" }).select(
        "name createdAt"
      );

      const registeredProviders = realRepairers.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        category: "Community Repair Professional",
        area: "FixFirst Registered Member",
        price: "Contact for quote upon diagnosis",
        rating: null, // No invented ratings
        reviewCount: 0,
        icon: "🛠️",
        isDemo: false,
      }));

      // Registered repairers shown first, followed by clearly labelled sample listings
      results = [...registeredProviders, ...demoProviders];
    } catch {
      results = [...demoProviders];
    }

    if (category && category !== "All") {
      results = results.filter(
        (p) =>
          p.category &&
          p.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (area) {
      results = results.filter(
        (p) => p.area && p.area.toLowerCase().includes(area.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.area && p.area.toLowerCase().includes(q))
      );
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

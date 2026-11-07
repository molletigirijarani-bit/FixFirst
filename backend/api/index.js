// Vercel serverless entry point. The Express app connects to MongoDB
// through middleware before database-backed routes are handled.
module.exports = require("../server");

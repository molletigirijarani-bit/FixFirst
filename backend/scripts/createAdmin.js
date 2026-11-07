const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createAdmin() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const nonFlagArgs = args.filter((a) => !a.startsWith("--"));

  const allowPromote = flags.has("--promote") || process.env.ADMIN_ALLOW_PROMOTE === "true";

  const name = nonFlagArgs[0] || process.env.ADMIN_NAME;
  const email = (nonFlagArgs[1] || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = nonFlagArgs[2] || process.env.ADMIN_PASSWORD;

  if (!process.env.MONGO_URI) {
    console.error("Error: MONGO_URI is not configured in the server environment or .env file.");
    process.exit(1);
  }

  // Explicit validation of required credentials - NO hardcoded defaults
  if (!name || !email || !password) {
    console.error("==================================================");
    console.error("Error: Administrator credentials missing.");
    console.error("==================================================");
    console.error("An explicit name, email, and password (minimum 8 characters) are required.");
    console.error("");
    console.error("Usage via command-line arguments:");
    console.error('  node scripts/createAdmin.js "<Full Name>" "<Email>" "<Password>" [--promote]');
    console.error("");
    console.error("Usage via environment variables:");
    console.error("  ADMIN_NAME='...' ADMIN_EMAIL='...' ADMIN_PASSWORD='...' node scripts/createAdmin.js");
    console.error("");
    console.error("Note: Pass '--promote' only if you intend to promote an existing customer or repairer account.");
    process.exit(1);
  }

  if (typeof password !== "string" || password.length < 8) {
    console.error("Error: Administrator password must be at least 8 characters long.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!allowPromote) {
        console.error("==================================================");
        console.error(`Safety Guard: An account with email '${email}' already exists with role '${existingUser.role}'.`);
        console.error("To prevent accidental account modification or privilege escalation,");
        console.error("pass the '--promote' flag if you explicitly intend to promote this user.");
        console.error("==================================================");
        process.exit(1);
      }

      // Explicit promotion requested
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.role = "admin";
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      await existingUser.save();

      console.log(`✓ Existing account '${email}' was explicitly promoted to administrator.`);
      console.log(`Name:  ${existingUser.name}`);
      console.log(`Role:  ${existingUser.role}`);
    } else {
      // Create new administrator account
      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await User.create({
        name: name.trim(),
        email,
        password: hashedPassword,
        role: "admin",
      });

      console.log(`✓ New administrator account created successfully.`);
      console.log(`Name:  ${newAdmin.name}`);
      console.log(`Email: ${newAdmin.email}`);
      console.log(`Role:  ${newAdmin.role}`);
    }
  } catch (error) {
    console.error("Failed to provision administrator:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();

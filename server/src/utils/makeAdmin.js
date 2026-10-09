/**
 * Safe initial-admin bootstrap (Phase 25).
 * Run explicitly with env vars — never exposed as a public endpoint:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass123 node src/utils/makeAdmin.js
 *
 * If the user exists, they are promoted to admin (preserving password).
 * Otherwise a new admin user is created.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !email.includes("@")) {
    console.error("Set ADMIN_EMAIL to bootstrap an admin.");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const User = require("../models/User");

  let user = await User.findOne({ email });
  if (user) {
    user.role = "admin";
    user.isSuspended = false;
    await user.save();
    console.log("Promoted to admin: " + email);
  } else {
    if (!password || password.length < 8) {
      console.error("Set ADMIN_PASSWORD (min 8 chars) to create the admin user.");
      process.exit(1);
    }
    const hashed = await bcrypt.hash(password, 12);
    user = await User.create({
      name: email.split("@")[0] || "Admin",
      email,
      password: hashed,
      role: "admin",
    });
    console.log("Created admin: " + email);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});

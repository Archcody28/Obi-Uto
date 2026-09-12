const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Password validation
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > 128) {
    return "Password must not exceed 128 characters.";
  }
  return null;
}

// Sanitize user object for API responses (remove sensitive fields)
function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    subscription: user.subscription,
    role: user.role,
    referralCode: user.referralCode,
    profiles: user.profiles || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        message: "A valid email is required.",
      });
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    user.referralCode =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    await user.save();

    return res.status(201).json({
      message: "User created successfully",
      user: sanitizeUser(user),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// CURRENT USER
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

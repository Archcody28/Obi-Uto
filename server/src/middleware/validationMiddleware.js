const mongoose = require("mongoose");

// Validate MongoDB ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Sanitize string input - prevent NoSQL injection
function sanitizeString(str) {
  if (typeof str !== "string") return str;
  // Remove MongoDB operators
  return str.replace(/^\$/, "").trim();
}

// Validate ObjectId param
function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    if (id && !isValidObjectId(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName} format.`,
      });
    }
    next();
  };
}

// Validate required fields
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(
      (field) => !req.body[field] || (typeof req.body[field] === "string" && req.body[field].trim() === "")
    );
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    next();
  };
}

// Validate positive number
function validatePositiveNumber(fieldName) {
  return (req, res, next) => {
    const value = req.body[fieldName];
    if (value !== undefined) {
      const num = Number(value);
      if (isNaN(num) || !isFinite(num) || num <= 0) {
        return res.status(400).json({
          message: `${fieldName} must be a positive number.`,
        });
      }
      // Sensible upper bound to prevent abuse
      if (num > 1000000000) {
        return res.status(400).json({
          message: `${fieldName} exceeds maximum allowed value.`,
        });
      }
    }
    next();
  };
}

// Sanitize chat message
function sanitizeMessage(req, res, next) {
  if (req.body.message && typeof req.body.message === "string") {
    // Limit message length
    if (req.body.message.length > 2000) {
      return res.status(400).json({
        message: "Message exceeds maximum length of 2000 characters.",
      });
    }
  }
  next();
}

// Sanitize search query
function sanitizeSearch(req, res, next) {
  if (req.query.q && typeof req.query.q === "string") {
    // Remove MongoDB operators from search
    req.query.q = req.query.q.replace(/[\${}]/g, "").trim();
    if (req.query.q.length > 200) {
      req.query.q = req.query.q.substring(0, 200);
    }
  }
  next();
}

module.exports = {
  isValidObjectId,
  sanitizeString,
  validateObjectId,
  requireFields,
  validatePositiveNumber,
  sanitizeMessage,
  sanitizeSearch,
};
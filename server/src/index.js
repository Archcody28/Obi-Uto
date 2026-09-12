require("dotenv").config();

// Validate required environment variables before starting
const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
];

const missingVars = requiredEnvVars.filter(
  (v) => !process.env[v] || process.env[v].trim() === ""
);

if (missingVars.length > 0) {
  console.error(
    "FATAL: Missing required environment variables: " +
      missingVars.join(", ")
  );
  process.exit(1);
}

// Warn about recommended but optional variables
if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn(
    "WARNING: PAYSTACK_SECRET_KEY not set. Payment features will not work."
  );
}

require("./jobs/subscriptionJob");
require("./jobs/payoutJob");
require("./jobs/trendingJob");
require("./jobs/recommendationBatchJob");
require("./jobs/notificationJob");
const mediaServer =
  require("./streaming/mediaServer");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

// Rate limiting middleware
const {
  authLimiter,
  paymentLimiter,
  apiLimiter,
} = require("./middleware/rateLimitMiddleware");

const authRoutes = require("./routes/authRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const homeRoutes = require("./routes/homeRoutes");
const historyRoutes = require("./routes/historyRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const followRoutes = require("./routes/followRoutes");const app = express();
const watchRoutes = require("./routes/watchRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const creatorContentRoutes = require("./routes/creatorContentRoutes");
const engagementRoutes = require("./routes/engagementRoutes");
const walletRoutes = require("./routes/walletRoutes");
const subscriptionPlanRoutes = require("./routes/subscriptionRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const creatorStudioRoutes = require("./routes/creatorStudioRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const creatorUploadRoutes = require("./routes/creatorUploadRoutes");
const liveRoutes = require("./routes/liveRoutes");
const liveChatRoutes = require("./routes/liveChatRoutes");
const donationRoutes = require("./routes/donationRoutes");
const seedGifts = require("./utils/seedGifts");
const coinRoutes = require("./routes/coinRoutes");
const giftRoutes = require("./routes/giftRoutes");
const userCoinWalletRoutes = require("./routes/userCoinWalletRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const referralRoutes = require("./routes/referralRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiRecommendationRoutes = require("./routes/aiRecommendationRoutes");
const creatorAnalyticsRoutes = require("./routes/creatorAnalyticsRoutes");
const businessRoutes = require("./routes/businessRoutes");
const kpiRoutes = require("./routes/kpiRoutes");
const recommendationV2Routes = require("./routes/recommendationV2Routes");
const liveStreamRoutes = require("./routes/liveStreamRoutes");
const path = require("path");
seedGifts();
connectDB();
mediaServer.run();

// CORS configuration - environment driven allowlist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In development, allow localhost
    if (process.env.NODE_ENV !== "production") {
      if (
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1") ||
        origin.startsWith("http://192.168.")
      ) {
        return callback(null, true);
      }
    }

    // Check allowlist
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production with no allowlist configured, deny
    if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
      return callback(new Error("CORS not allowed"));
    }

    // Development fallback
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // API-only, no browser CSP needed
    crossOriginEmbedderPolicy: false, // Allow media embeds
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin media
  })
);
// Skip express.json() for webhook route (needs raw body for signature verification)
app.use((req, res, next) => {
  if (
    req.path === "/api/payments/webhook" ||
    req.path === "/webhook"
  ) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Apply rate limiting to sensitive routes
app.use("/api/auth", authLimiter);
app.use("/api/payments", paymentLimiter);
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/studio", creatorStudioRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/subscription-plans", subscriptionRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/engagement", engagementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/watch",watchRoutes);
app.use("/api/creators", creatorRoutes);
app.use("/api/creators", creatorContentRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/creator", creatorUploadRoutes);
app.use("/api/live-streams", liveStreamRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/live-chat", liveChatRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/coins", coinRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/gifts", giftRoutes);
app.use("/api/coin-wallet", userCoinWalletRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/leaderboards", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRecommendationRoutes);
app.use("/api/creator-analytics", creatorAnalyticsRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/kpi", kpiRoutes);
app.use("/api/recommendations-v2", recommendationV2Routes);
app.get("/health", (req, res) => {
  const databaseStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const readyState =
    mongoose.connection.readyState;

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      readyState,
      state:
        databaseStates[readyState] ||
        "unknown",
    },
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Media Streaming API Running",
  });
});
app.use(
  "/media",
  express.static(
    path.join(
      __dirname,
      "../media"
    )
  )
);
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message:
      err.message ||
      "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

const http =
  require("http");

const {
  initializeSocket,
} = require("./socket");

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on ${PORT}`
    );
  }
);

// Graceful shutdown
function shutdown(signal) {
  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  server.close(() => {
    console.log("HTTP server closed");

    mongoose.connection.close(
      false,
      () => {
        console.log(
          "MongoDB connection closed"
        );
        process.exit(0);
      }
    );

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error(
        "Forced shutdown after timeout"
      );
      process.exit(1);
    }, 10000);
  });
}

process.on("SIGTERM", () =>
  shutdown("SIGTERM")
);

process.on("SIGINT", () =>
  shutdown("SIGINT")
);

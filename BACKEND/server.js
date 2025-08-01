require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");

require("./utils/passport");

const evaluationRoutes = require("./routes/EvaluationRoute");
const marksRoutes = require("./routes/MarksRoute");
const authRoutes = require("./routes/authRoutes");
const pptRoutes = require("./routes/pptRoutes");

const app = express();

// ✅ Parse JSON
app.use(express.json());

// ✅ CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());

// ✅ Sessions
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Routes
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/data", marksRoutes);
app.use("/api/auth", authRoutes); // ✅ login and signup
app.use("/api/ppt", pptRoutes);

// ✅ Unknown Route Handling
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

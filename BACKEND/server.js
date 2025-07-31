require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");

require("./utils/passport");

const evaluationRoutes = require("./routes/EvaluationRoute.js");
const marksRoutes = require("./routes/MarksRoute.js");
const authRoutes = require("./routes/authRoutes.js");
const pptRoutes = require("./routes/pptRoutes.js");

const app = express();


app.use(express.json());
app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  session({
    secret: "yourSecretKeyHere",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, 
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.use("/api/evaluations", evaluationRoutes);
app.use("/api/data", marksRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ppt", pptRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

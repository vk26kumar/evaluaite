process.env.NODE_ENV = "test";
process.env.JWT_SECRET = require("./credentials").randomSecret();
process.env.CLIENT_URL = "http://localhost:5173";
process.env.GEMINI_API_KEY = "";
process.env.GEMINI_API = "";
process.env.MONGO_URI = "";

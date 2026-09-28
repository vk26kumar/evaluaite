// Required first by every test file: a predictable environment with no real services.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-production-checks";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.GEMINI_API_KEY = "";
process.env.GEMINI_API = "";
process.env.MONGO_URI = "";

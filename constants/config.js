const corsOptions = {
  origin: [
    "*",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "http://44.199.75.133:4000",
    "http://44.199.75.133"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const CHAT_TOKEN = process.env.JWT_SECRET;

module.exports = { corsOptions, CHAT_TOKEN };
const mongoose = require("mongoose");
require("dotenv").config();
const uri = process.env.MONGO_URI;
// const uri = 'mongodb://localhost:27017/habits';


const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Connection to MongoDB failed:", error);
  }
};

module.exports = {connectDB}
// connectDB()
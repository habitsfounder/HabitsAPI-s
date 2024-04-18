const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Please provide user email."],
      unique: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      default: "Admin",
    },
    activeToken: {
      type: String,
    },
    resetToken: {
      type: String,
    },
    device_id: {
      type: String,
    },
    status: {
      type: String,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;

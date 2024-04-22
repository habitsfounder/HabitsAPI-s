const jwt = require("jsonwebtoken");
const User = require("../Model/User");
const Admin = require("../Model/Admin");
const {ErrorHandler} = require("../Utils/utility");
const {getSockets} = require("../Utils/helper")
exports.generateToken = (payload) => {
  console.log(payload);
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};
exports.generateTokenForPwd = (payload, expiresIn = "5m") => {
  console.log(payload);
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};
exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    // Handle invalid/expired tokens here
    console.log(error);
    return null;
  }
};
exports.isAuthJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = authHeader;
  }

  if (!token) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Please login to access this resource",
      });
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findOne({ _id: decodedData?.id });

    if (!req.user) {
      req.user = await Admin.findOne({ id: decodedData?.id });
      if(!req.user){
        return res
        .status(401)
        .json({ success: false, message: "user not found" });
      }
    }
    if (req.user.activeToken && req.user.activeToken === token) {
      next();
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Token expired, please login again" });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Token expired, please login again" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      console.error("Other error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
};
// auth role
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        res
          .status(403)
          .json({
            success: false,
            message: `Role: ${req.user.role} is not allowed  to access this resource`,
          })
      );
    }
    next();
  };
};

exports.socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    
    const authHeader = socket.request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // return next(new ErrorHandler("Please provide a valid authorization token", 401));
      return res.status(401).json("Please provide a valid authorization token");
    }

    const token = authHeader.split(" ")[1]; // Extract token from the Authorization header

    if (!token) {
      return next(new ErrorHandler("Please provide a valid authorization token", 401));
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById({ _id: decodedData?.id });

    if (!user)
      return next(new ErrorHandler("Please login to access this route", 401));

    socket.user = user;

    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};

exports.emitEvent = (req, event, users, data) => {
  // console.log("Emiting Event" ,event);
  const io = req.app.get("io");
  const usersSocket = getSockets(users);
  console.log(usersSocket);
  io.to(usersSocket).emit(event, data);
};
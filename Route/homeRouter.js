const express = require("express");
const router = express.Router();
const HomeDitailsController = require("../Controller/homeController");
const { isAuthJWT, authorizeRoles } = require("../Utils/jwt")


router.get("/AllHomeDitails",isAuthJWT, HomeDitailsController.getAllHomeDitails);


module.exports = router;
const express = require("express");
const router = express.Router();
const HomeDitailsController = require("../Controller/homeController");

router.get("/AllHomeDitails/:userId", HomeDitailsController.getAllHomeDitails);


module.exports = router;
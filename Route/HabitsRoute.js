const express = require("express");
const router = express.Router();
const habitController = require("../Controller/HabitsController");

router.post("/createHabit", habitController.createHabit);
router.get("/getAllHabits", habitController.getAllHabits);
router.get("/getHabitById/:id", habitController.getHabitById);
router.put("/updateHabit/:id", habitController.updateHabit);
router.delete("/deleteHabit/:id", habitController.deleteHabit);

module.exports = router;

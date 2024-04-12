const Habit = require("../Model/Habits");



// exports.createHabit = async (req, res, next) => {
//   try {
//     const newHabit = await Habit.create(req.body);
//     res.status(201).json({ success: true, data: newHabit });
//   } catch (error) {
//     next(error);
//   }
// };

exports.createHabit = async (req, res, next) => {
  try {
    const { habit_name, details } = req.body;
    
    // Create a new habit object
    const newHabit = new Habit({
      habit_name,
      details
    });

    // Save the new habit to the database
    await newHabit.save();

    res.status(201).json({ success: true, data: newHabit });
  } catch (error) {
    next(error);
  }
};



// exports.getAllHabits = async (req, res) => {
//   const page = parseInt(req.query.page, 10) || 1;
//   const limit = parseInt(req.query.limit, 10) || 10;
//   const skip = (page - 1) * limit;

//   const searchQuery = {};
//   if (req.query.search) {
//     searchQuery.habit = { $regex: req.query.search, $options: "i" };
//   }

//   try {
//     const totalHabits = await Habit.countDocuments(searchQuery);

//     const totalPages = Math.ceil(totalHabits / limit);

//     const habits = await Habit.find(searchQuery)
//       .skip(skip)
//       .limit(limit);

//     return res.status(200).json({
//       success: true,
//       count: habits.length,
//       page,
//       totalPages,
//       data: habits,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Server error occurred while retrieving habits.",
//       error: error.message,
//     });
//   }
// };


// Retrieve habits and their details:

exports.getAllHabits = async (req, res) => {
const habits = await Habit.find().populate('details');
if (!habits) {
  return res.status(404).json({ success: false, message: "Habit not found" });
}
res.status(200).json({ success: true, data: habits });
console.log(habits);
}

exports.getHabitById = async (req, res, next) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found" });
    }

    res.status(200).json({ success: true, data: habit });
  } catch (error) {
    next(error);
  }
};


exports.updateHabit = async (req, res, next) => {
  try {
    const updatedHabit = await Habit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedHabit) {
      return res.status(404).json({ success: false, message: "Habit not found" });
    }

    res.status(200).json({ success: true, data: updatedHabit });
  } catch (error) {
    next(error);
  }
};



exports.deleteHabit = async (req, res, next) => {
  try {
    const deletedHabit = await Habit.findByIdAndDelete(req.params.id);

    if (!deletedHabit) {
      return res.status(404).json({ success: false, message: "Habit not found" });
    }

    res.status(200).json({ success: true, message: "Habit deleted successfully" });
  } catch (error) {
    next(error);
  }
};
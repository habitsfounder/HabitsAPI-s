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
// const habits = await Habit.find().populate('details');
// if (!habits) {
//   return res.status(404).json({ success: false, message: "Habit not found" });
// }
// res.status(200).json({ success: true, data: habits });
// console.log(habits);
// }


exports.getAllHabits = async (req, res) => {
  try {
    const habits = await Habit.find().populate('details');

    if (habits.length === 0) {
      return res.status(404).json({ success: false, message: "No habits found" });
    }

    // Modify each habit object to include the logo field
    const habitsWithLogo = habits.map(habit => {
      // Extracting logo from the first detail object (assuming logo is same for all details)
      const logo = habit.details.length > 0 ? habit.details[0].logo : null;
      return {
        _id: habit._id,
        habit_name: habit.habit_name,
        habit_logo: logo, // Adding logo to the habit object
        details: habit.details,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        __v: habit.__v
      };
    });

    res.status(200).json({ success: true, data: habitsWithLogo });
    console.log(habitsWithLogo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getHabitById = async (req, res, next) => {
  // try {
  //   const habit = await Habit.findById(req.params.id);

  //   if (!habit) {
  //     return res.status(404).json({ success: false, message: "Habit not found" });
  //   }

  //   res.status(200).json({ success: true, data: habit });
  // } catch (error) {
  //   next(error);
  // }

  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }

    // Extracting logo from the first detail object (assuming logo is same for all details)
    const logo = habit.details.length > 0 ? habit.details[0].logo : null;

    // Constructing the response object
    const responseData = {
      success: true,
      data: {
        _id: habit._id,
        habit_name: habit.habit_name,
        habit_logo: logo, // Adding logo to the response object
        details: habit.details,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        __v: habit.__v
      }
    };

    res.json(responseData);
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
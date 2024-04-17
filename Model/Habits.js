

// const mongoose = require('mongoose');

// const habitDetailSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   logo: {
//     type: String, // You might adjust the type according to your requirements
//     // required: true
//   },
//   units: {
//     type: String,
//     required: true
//   }
// });

// const habitSchema = new mongoose.Schema({
//   habit_name: {
//     type: String,
//     required: true
//   },
//   details: [habitDetailSchema]
// }, {
//   timestamps: true
// });

// const Habit = mongoose.model('Habit', habitSchema);
// module.exports = Habit;


const mongoose = require('mongoose');

// Define schema for habit details
const habitDetailSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  logo: {
    type: String, // Adjust type according to your requirements
    // required: true // Assuming logo is required
  },
  units: {
    type: String,
    required: true
  }
});

// Define schema for habits
const habitSchema = new mongoose.Schema({
  habit_name: {
    type: String,
    required: true
  },
  details: [habitDetailSchema] // Embed habit details as an array of objects
},


{
  timestamps: true
});

// Create a Mongoose model
const Habit = mongoose.model('Habit', habitSchema);

module.exports = Habit;

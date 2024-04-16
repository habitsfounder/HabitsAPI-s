
const uploadOnS3 = require("../Utils/awsS3");
const { emitEvent } = require("../Utils/jwt");
const Chat = require("../Model/Chat");
const { ALERT, REFETCH_CHATS, NEW_ATTACHMENT, NEW_MESSAGE_ALERT } = require("../constants/events");
const { getOtherMember } = require("../Utils/helper");
const User = require("../Model/User");
const Message = require("../Model/Message");
const Verification = require("../Model/VerificationMethod");
const Notification = require("../Model/notification");
const Request = require("../Model/Request");
const Habit = require("../Model/Habits");


// exports.getAllHomeDitails = async (req, res) => {
//     const { userId } = req.params;

//     try {
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found.",
//             });
//         } else {
//             const getGroups = await Chat.find({
//                 activityEndDate: { $gt: new Date() }, // Ensuring activityEndDate is greater than today
//                 $or: [{ creator: userId }, { members: userId }]
//             });

//             let all_habits = {}; // Initialize an empty object to store all habits

//             // Iterate through each group
//             getGroups.forEach(group => {
//                 // Iterate through habits of each group
//                 group.habits.forEach(habit => {
//                     if (!all_habits[habit.habit]) {
//                         all_habits[habit.habit] = habit; // Store the habit directly in the object
//                     }
//                 });
//             });

//             // Fetch habit details from the habits table and add them to the all_habits object
//             const habitsData = [
//                 {
//                     "_id": "661cea363d6577ce37deb0ce",
//                     "habit_name": "Reading",
//                     "habit_logo": "https://habits-attachments.s3.amazonaws.com/2024-4-15/1st.png",
//                     "details": [
//                         {
//                             "name": "Timer",
//                             "logo": "https://habits-attachments.s3.amazonaws.com/2024-4-15/1st.png",
//                             "units": "Hours",
//                             "_id": "661cea363d6577ce37deb0cf"
//                         },
//                         // Add other details here...
//                     ]
//                 },
//                 // Add other habits data here...
//             ];

//             // Iterate through habitsData to add habit details to the all_habits object
//             habitsData.forEach(habitData => {
//                 const habitId = habitData._id;
//                 if (all_habits[habitId]) {
//                     all_habits[habitId].details = habitData.details;
//                 }
//             });

//             return res.status(200).json({
//                 success: true,
//                 data: getGroups,
//                 all_habits: all_habits // Add all_habits object directly to the response
//             });
//         }
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Server error occurred while retrieving the user.",
//             error: error.message,
//         });
//     }
// }

exports.getAllHomeDitails = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        } else {
            const getGroups = await Chat.find({
                activityEndDate: { $gt: new Date() }, // Ensuring activityEndDate is greater than today
                $or: [{ creator: userId }, { members: userId }]
            });

            let all_habits = {}; // Initialize an empty object to store all habits

            // Iterate through each group
            getGroups.forEach(group => {
                // Iterate through habits of each group
                group.habits.forEach(habit => {
                    if (!all_habits[habit.habit]) {
                        all_habits[habit.habit] = habit; // Store the habit directly in the object
                    }
                });
            });

            return res.status(200).json({
                success: true,
                data: getGroups,
                all_habits: all_habits // Add all_habits object directly to the response
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error occurred while retrieving the user.",
            error: error.message,
        });
    }
}






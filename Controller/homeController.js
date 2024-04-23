
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


const ActivityLog = require("../Model/ActivityLogs");


// exports.getAllHomeDitails = async (req, res) => {
    
//     const page = parseInt(req.query.page, 10) || 1;
//     const limit = parseInt(req.query.limit, 10) || 10;
//     const skip = (page - 1) * limit;
  
//     const searchQuery = {};
//     if (req.query.search) {
//       searchQuery.habit = { $regex: req.query.search, $options: "i" };
//     }
    
//     try {

//         const totalActivityLogs = await ActivityLog.countDocuments(searchQuery);
//         const totalPages = Math.ceil(totalActivityLogs / limit);
    
//         const activityLogs = await ActivityLog.find(searchQuery)
//             .populate('user_id') 
//             .populate('chat_id')
//             .populate('habit_id')  
//             .skip(skip)
//             .limit(limit);
    
//         console.log("activityLogs", activityLogs);


//  let all_habits = {}; // Initialize an empty object to store all habits

//      activityLogs.forEach(activityLog => {
//             // Check if chat_id exists and if it has a habit property
//             if (activityLog.chat_id || activityLog.chat_id.habits.habit) {
//                 console.log("33");
//                 // Retrieve the habit from the chat_id object
//                 const habits = activityLog.chat_id.habits.habit; // Assuming habit is an array, get the first element
//                 // Store the habit directly in the object
//                 if (!all_habits[habits]) {
//                     console.log("1");
//                     // all_habits[habit] = activityLog.chat_id;
//                 all_habits = activityLog.chat_id.habits;
// console.log("all_habits",all_habits);
//                 all_habits.forEach(async habitId => {
//                     console.log("habitId", habitId.habit);
//                     // Fetch the habit details from the database using habitId
//                     const habitDetails = await Habit.fin({_id:habitId});
//                     // Check if the habitDetails exist
//                     console.log("habitDetails", habitDetails);
//                     if (habitDetails) {
//                         // Check if the habit is already in all_habits
//                         if (!all_habits[habitId]) {
//                             // If not, add the habit to all_habits with habitId as key
//                             all_habits[habitId] = {
//                                 _id: habitDetails._id,
//                                 habit_name: habitDetails.name,
//                                 habit_logo: habitDetails.logo,
//                                 details: []
//                             };
//                         }
//                         // Push details of the activity log to the habit's details array
//                         all_habits[habitId].details.push({
//                             name: activityLog.activity_done,
//                             logo: activityLog.user_id.avatar.url,
//                             units: activityLog.points_earned,
//                             _id: activityLog._id
//                         });
//                     }
//                 });
//                 }
//             }
//         });
    
//         console.log("activityLogs", activityLogs);

//         const activeGroups = await Chat.find({ members: req.user.id });
//         // Calculate max_progress for today
//         const today = new Date();
//         const maxProgressPromises = activeGroups.map(async (group) => {
//           const maxPoints = parseInt(group.max_points);
//           const daysChallengeWillGo = Math.ceil((group.activityEndDate - group.activityStartDate) / (1000 * 60 * 60 * 24));
//           const maxProgress = maxPoints / daysChallengeWillGo;
//           return maxProgress;
//         });
//         const maxProgressValues = await Promise.all(maxProgressPromises);
//         const maxProgress = maxProgressValues.reduce((acc, val) => acc + val, 0);
//         // const maxProgress = maxProgressValues.reduce((acc, val) => acc + parseInt(val), 0);
//         // console.log("maxProgress",maxProgress);
    
//         // Get today's activity logs for the user
//         const todayActivityLogs = await ActivityLog.find({
//           user_id: req.user.id,
//           createdAt: { $gte: today.setHours(0, 0, 0, 0), $lt: today.setHours(23, 59, 59, 999) }
//         });
    
//         // Calculate done_progress for today
//         const doneProgress = todayActivityLogs.reduce((acc, log) => acc + parseInt(log.points_earned), 0);

//     const otherUsersActivity = await Chat.find({ members: req.user.id });

//     // Get other users' activity logs in the groups
//     const otherUsersActivityLogs = await ActivityLog.find({
//       user_id: { $ne: req.user.id },
//       chat_id: { $in: otherUsersActivity.map(group => group._id) }
//     });
  
//         return res.status(200).json({
//             success: true,
//             count: activityLogs.length,
//             page,
//             totalPages,
//             data: [{ activityLogs: activityLogs }, { all_habits: all_habits },{ progressInfo:[{doneProgress:doneProgress || 0, maxProgress:maxProgress || 0}],otherUsersActivityLogs:otherUsersActivityLogs}],
//         });
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Server error occurred while retrieving the user.",
//             error: error.message,
//         });
//     }
    
// }


exports.getAllHomeDitails = async (req, res) => {
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
  
    const searchQuery = {};
    if (req.query.search) {
      searchQuery.habit = { $regex: req.query.search, $options: "i" };
    }
    
    try {

        const totalActivityLogs = await ActivityLog.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalActivityLogs / limit);
    
        const activityLogs = await ActivityLog.find(searchQuery)
            .populate('user_id') 
            .populate('chat_id')
            .populate('habit_id')  
            .skip(skip)
            .limit(limit);
    
        // console.log("activityLogs", activityLogs);


 let all_habits = {}; // Initialize an empty object to store all habits

     activityLogs.forEach(activityLog => {
            // Check if chat_id exists and if it has a habit property
            if (activityLog.chat_id) {
                console.log("33");
                // Retrieve the habit from the chat_id object
                const habits = activityLog.chat_id.habit; // Assuming habit is an array, get the first element
                // Store the habit directly in the object
                if (!all_habits[habits]) {
                    // all_habits[habit] = activityLog.chat_id;
                all_habits = activityLog.chat_id.habits;

                console.log("All_habits" ,  all_habits)

                all_habits.forEach(async habitId => {
                    // console.log("habitId", habitId.habit);
                    // Fetch the habit details from the database using habitId
                    const habitDetails = await Habit.findById(habitId);
                    // Check if the habitDetails exist
                    // console.log("habitDetails", habitDetails);
                    if (habitDetails) {
                        // Check if the habit is already in all_habits
                        if (!all_habits[habitId]) {
                            // If not, add the habit to all_habits with habitId as key
                            all_habits[habitId] = {
                                _id: habitDetails._id,
                                habit_name: habitDetails.name,
                                habit_logo: habitDetails.logo,
                                details: []
                            };
                        }
                        // Push details of the activity log to the habit's details array
                        all_habits[habitId].details.push({
                            name: activityLog.activity_done,
                            logo: activityLog.user_id.avatar.url,
                            units: activityLog.points_earned,
                            _id: activityLog._id
                        });
                    }
                });
                }
            }
        });
    
        const activeGroups = await Chat.find({ members: req.user.id });
        // Calculate max_progress for today
        const today = new Date();
        const maxProgressPromises = activeGroups.map(async (group) => {
          const maxPoints = parseInt(group.max_points);
          const daysChallengeWillGo = Math.ceil((group.activityEndDate - group.activityStartDate) / (1000 * 60 * 60 * 24));
          const maxProgress = maxPoints / daysChallengeWillGo;
          return maxProgress;
        });
        const maxProgressValues = await Promise.all(maxProgressPromises);
        const maxProgress = maxProgressValues.reduce((acc, val) => acc + val, 0);
        // const maxProgress = maxProgressValues.reduce((acc, val) => acc + parseInt(val), 0);
        // console.log("maxProgress",maxProgress);
    
        // Get today's activity logs for the user
        const todayActivityLogs = await ActivityLog.find({
          user_id: req.user.id,
          createdAt: { $gte: today.setHours(0, 0, 0, 0), $lt: today.setHours(23, 59, 59, 999) }
        });
    
        // Calculate done_progress for today
        const doneProgress = todayActivityLogs.reduce((acc, log) => acc + parseInt(log.points_earned), 0);

    const otherUsersActivity = await Chat.find({ members: req.user.id });

    // Get other users' activity logs in the groups
    const otherUsersActivityLogs = await ActivityLog.find({
      user_id: { $ne: req.user.id },
      chat_id: { $in: otherUsersActivity.map(group => group._id) }
    });
  
        return res.status(200).json({
            success: true,
            count: activityLogs.length,
            page,
            totalPages,
            data: [{ activityLogs: activityLogs }, { all_habits: all_habits },{ progressInfo:[{doneProgress:doneProgress || 0, maxProgress:maxProgress || 0}],otherUsersActivityLogs:otherUsersActivityLogs}],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error occurred while retrieving the user.",
            error: error.message,
        });
    }
    
}




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


        let get_all_habits = {}; // Initialize an empty object to store all habits

        activityLogs.forEach(activityLog => {
            // Check if chat_id exists and if it has a habit property
            if (activityLog.chat_id) {
                console.log("33");
                // Retrieve the habit from the chat_id object
                const habits = activityLog.chat_id.habit; // Assuming habit is an array, get the first element
                // Store the habit directly in the object
                if (!get_all_habits[habits]) {
                    // get_all_habits[habit] = activityLog.chat_id;
                    get_all_habits = activityLog.chat_id.habits;

                    console.log("get_all_habits", get_all_habits)

                    get_all_habits.forEach(async habitId => {
                        // console.log("habitId", habitId.habit);
                        // Fetch the habit details from the database using habitId
                        const habitDetails = await Habit.findById(habitId);
                        // Check if the habitDetails exist
                        // console.log("habitDetails", habitDetails);
                        if (habitDetails) {
                            // Check if the habit is already in get_all_habits
                            if (!get_all_habits[habitId]) {
                                // If not, add the habit to get_all_habits with habitId as key
                                get_all_habits[habitId] = {
                                    _id: habitDetails._id,
                                    habit_name: habitDetails.name,
                                    habit_logo: habitDetails.logo,
                                    details: []
                                };
                            }
                            // Push details of the activity log to the habit's details array
                            get_all_habits[habitId].details.push({
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
        // const otherUsersActivityLogs = await ActivityLog.find({
        //   user_id: { $ne: req.user.id },
        //   chat_id: { $in: otherUsersActivity.map(group => group._id) }
        // });

        const otherUsersActivityLogs = await ActivityLog.find({
            user_id: { $ne: req.user.id },
            chat_id: { $in: otherUsersActivity.map(group => group._id) }
        })
            .populate('user_id', 'name avatar') // Populate user details
            .populate('chat_id', 'name members') // Populate chat details
            .populate('habit_id'); // Populate habit details


            const all_habits = Object.values(get_all_habits).sort((a, b) => {
                const nameA = a.habit_name.toUpperCase();
                const nameB = b.habit_name.toUpperCase();
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
            
            console.log("All habils in sorted_habitls", all_habits);
            
            // Extracting habit IDs from all_habits
            const habitIds = all_habits.map(habit => habit.habit);
            
            console.log("habitIds is", habitIds);
            
    // Map over all_habits and find the ones whose IDs are in habitIds
    const all_habits_with_details = habitIds.map(id => all_habits.find(habit => habit.habit.toString() === id.toString()));
    
    console.log("Filtered all_habits:", all_habits_with_details);
    
    
            
    
    const habitDetailsPromises = all_habits_with_details.map(async (habit) => {
        try {
    
            console.log("hanidfdf",habit)
            // Fetch the habit details from the database using habit ID
            const habitDetails = await Habit.findOne({_id:habit.habit});
            console.log("Hbil",habitDetails)
            return habitDetails;
        } catch (error) {
            console.error("Error fetching habit details:", error);
            return null; // Handle error gracefully
        }
    });
    
    console.log("habitDetailsPromises find by Habit Model" ,habitDetailsPromises )
    
    // Wait for all promises to resolve
    const habitDetailsResults = await Promise.all(habitDetailsPromises);
    
    console.log("Habit Model",habitDetailsResults )
    
    // Constructing a new object with habit details
    const all_habits_details = all_habits_with_details.map((habit, index) => {
        const habitDetails = habitDetailsResults[index]; // Get the corresponding habit details
        return {
            _id: habit._id,
            habit_name: habitDetails ? habitDetails.habit_name : habit.habit_name, // Use habitDetails.habit_name if available, otherwise use habit.habit_name
            details: habitDetails ? habitDetails.details.map(detail => ({ // Map habit details
                name: detail.name,
                logo: detail.logo,
                units: detail.units,
                _id: detail._id
            })) : [] // If habitDetails not found, return an empty array
        };
    });
    
    






        return res.status(200).json({
            success: true,
            count: activityLogs.length,
            page,
            totalPages,
            data: [{ activityLogs: activityLogs },{all_habits: all_habits_details } , { progressInfo: [{ doneProgress: doneProgress || 0, maxProgress: maxProgress || 0 }], otherUsersActivityLogs: otherUsersActivityLogs },{ get_all_habits: get_all_habits }],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error occurred while retrieving the user.",
            error: error.message,
        });
    }

}



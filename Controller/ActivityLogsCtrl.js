const ActivityLog = require("../Model/ActivityLogs");
const Chat = require("../Model/Chat");
const User = require("../Model/User");
const Habit = require("../Model/Habits")
// Create a new activity log
exports.createActivityLog = async (req, res, next) => {
    try {
        const user_id  = req.user;
    
        const activityLogData = { ...req.body, user_id };
    
        const newActivityLog = await ActivityLog.create(activityLogData);
    
        res.status(201).json({ success: true, data: newActivityLog });
      } catch (error) {
        next(error);
      }
};

// Get all activity logs with pagination and search
exports.getAllActivityLogs = async (req, res, next) => {
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

    return res.status(200).json({
      success: true,
      count: activityLogs.length,
      page,
      totalPages,
      data: activityLogs,
    });
  } catch (error) {
    next(error);
  }
};

// Get activity log by ID
exports.getActivityLogById = async (req, res, next) => {
  try {
    const user_id = req.user;
    const activityLog = await ActivityLog.find({user_id: user_id})
      .populate('user_id')
      .populate('chat_id')
      .populate('habit_id');

    if (!activityLog) {
      return res.status(404).json({ success: false, message: "Activity log not found" });
    }

    res.status(200).json({ success: true, data: activityLog });
  } catch (error) {
    next(error);
  }
};

// Update activity log by ID
exports.updateActivityLog = async (req, res, next) => {
  try {
    const updatedActivityLog = await ActivityLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedActivityLog) {
      return res.status(404).json({ success: false, message: "Activity log not found" });
    }

    res.status(200).json({ success: true, data: updatedActivityLog });
  } catch (error) {
    next(error);
  }
  // try {
  //   const { user_id } = req.user; // Assuming user_id is present in req.user

  //   const updatedActivityLog = await ActivityLog.findByIdAndUpdate(
  //     req.params.id,
  //     { ...req.body, user_id }, // Include user_id obtained from req.user
  //     { new: true }
  //   );

  //   if (!updatedActivityLog) {
  //     return res.status(404).json({ success: false, message: "Activity log not found" });
  //   }

  //   res.status(200).json({ success: true, data: updatedActivityLog });
  // } catch (error) {
  //   next(error);
  // }
};

// Delete activity log by ID
exports.deleteActivityLog = async (req, res, next) => {
  try {
    const deletedActivityLog = await ActivityLog.findByIdAndDelete(req.params.id);

    if (!deletedActivityLog) {
      return res.status(404).json({ success: false, message: "Activity log not found" });
    }

    res.status(200).json({ success: true, message: "Activity log deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getGroupPoints = async (req, res) => {
  const userId  = req.user.id;
  const { groupId } = req.params;

  try {
    const group = await Chat.findOne({ _id: groupId, members: userId });
    if (!group) {
      return res.status(403).json({ error: 'User does not have access to this group.' });
    }

    // Fetch activity logs for the group
    const activityLogs = await ActivityLog.find({ chat_id: groupId }).populate('user_id').populate('chat_id');

    // Sort activity logs by points in descending order
    activityLogs.sort((a, b) => b.points_earned - a.points_earned);

    // Extract relevant information and return
    const groupPoints = activityLogs.map(log => ({
      user: log.user_id,
      chat_id: log.chat_id,
      points: log.points_earned,
      max_points: group.max_points, // Assuming max_points is a property of the group
      last_activity: log.createdAt,
    }));

    return res.json(groupPoints);
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// exports.getGroupPoints = async (req, res) => {
//   const userId = req.body.id;
//   const { groupId } = req.params;

//   try {
//     const group = await Chat.findOne({ _id: groupId, members: userId });
//     if (!group) {
//       return res.status(403).json({ error: 'User does not have access to this group.' });
//     }

//     // Fetch activity logs for the group
//     const activityLogs = await ActivityLog.find({ chat_id: groupId }).populate('user_id').populate('chat_id');

//     // Sort activity logs by points in descending order
//     activityLogs.sort((a, b) => b.points_earned - a.points_earned);

//     // Initialize variables to calculate totals
//     let totalPoints = 0;
//     let maxPoints = group.max_points;
//     let lastActivity = null;

//     // Extract relevant information
//     const responseData = {
//       success: true,
//       data: {
//         members: []
//       }
//     };

//     // Loop through each member in the group
//     for (const memberId of group.members) {
//       const member = await User.findById(memberId);
//       if (member) {
//         const memberData = {
//           user: member,
//           points: 0,
//           max_points: maxPoints,
//           last_activity: null
//         };

//         // Calculate total points, maximum points, and last activity for each member
//         activityLogs.forEach(log => {
//           if (log.user_id._id.toString() === memberId.toString()) {
//             memberData.points += log.points_earned;
//             if (log.createdAt > memberData.last_activity || !memberData.last_activity) {
//               memberData.last_activity = log.createdAt;
//             }
//           }
//         });

//         // Update total points and last activity for all members
//         totalPoints += memberData.points;
//         if (memberData.last_activity && (!lastActivity || memberData.last_activity > lastActivity)) {
//           lastActivity = memberData.last_activity;
//         }

//         // Push member data to responseData
//         responseData.data.members.push(memberData);
//       }
//     }

//     // Set total points and last activity in responseData
//     responseData.data.points = totalPoints;
//     responseData.data.max_points = maxPoints;
//     responseData.data.last_activity = lastActivity;

//     return res.json(responseData);
//   } catch (error) {
//     console.error('Error:', error.message);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };





exports.progressInfo = async (req,res) => {
  try {
    // Get user's active groups
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

    // Get today's activity logs for the user
    const todayActivityLogs = await ActivityLog.find({
      user_id: req.user.id,
      createdAt: { $gte: today.setHours(0, 0, 0, 0), $lt: today.setHours(23, 59, 59, 999) }
    });

    // Calculate done_progress for today
    const doneProgress = todayActivityLogs.reduce((acc, log) => acc + parseInt(log.points_earned), 0);

    res.json({ success: true, data: { doneProgress, maxProgress } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
exports.habitsInProgress = async (req,res) => {
  try {
    // Get user's active groups
    const activeGroups = await Chat.find({ members: req.user.id });

    // Get habits in progress from all active groups
    const habitsInProgress = [];
    for (const group of activeGroups) {
      const habits = await Habit.find({ _id: { $in: group.habits } });
      habitsInProgress.push(...habits);
    }

    res.json({ success: true, data: habitsInProgress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

exports.otherUsersActivityLogs = async (req,res) => {
  try {
    // Get user's active groups
    const activeGroups = await Chat.find({ members: req.user.id });

    // Get other users' activity logs in the groups
    const otherUsersActivityLogs = await ActivityLog.find({
      user_id: { $ne: req.user.id },
      chat_id: { $in: activeGroups.map(group => group._id) }
    });

    res.json({ success: true, data: otherUsersActivityLogs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
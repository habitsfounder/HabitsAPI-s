const ActivityLog = require("../Model/ActivityLogs");
const Chat = require("../Model/Chat");
const User = require("../Model/User")
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
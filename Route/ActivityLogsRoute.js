const express = require('express');
const router = express.Router();
const activityLogController = require('../Controller/ActivityLogsCtrl');
const { isAuthJWT, authorizeRoles } = require("../Utils/jwt")
// Create a new activity log
router.post('/createLogs',isAuthJWT, activityLogController.createActivityLog);

// Get all activity logs with pagination and search
router.get('/getAllLogs',isAuthJWT, activityLogController.getAllActivityLogs);

// Get activity log by ID
router.get('/getUserLog',isAuthJWT, activityLogController.getActivityLogById);

router.get('/getGroupPoints/:groupId',isAuthJWT, activityLogController.getGroupPoints);

// Update activity log by ID
router.put('/updateLog/:id',isAuthJWT, activityLogController.updateActivityLog);

// Delete activity log by ID
router.delete('/deleteLog/:id',isAuthJWT, activityLogController.deleteActivityLog);

module.exports = router;

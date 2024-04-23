const express = require("express")

const { isAuthJWT, authorizeRoles } = require("../Utils/jwt")
const { addUser, loginUser, logoutUser, forgotPwd,join_channel, resetPassword, deleteUser, updateUserPassword, updateUser, getUserById, getAllUsersWithPagination,getMyProfile, sendFriendRequest, acceptFriendRequest, getMyNotification, getMyFriends,acceptRequest,getmyNotifications} = require("../Controller/UserAuth")
const { singleAvatar } = require('../Utils/multer');
const router = express.Router()

router.route("/add").post(singleAvatar,addUser)
router.route("/login").post(loginUser)
router.route("/logout").get(isAuthJWT, authorizeRoles("User"), logoutUser)
router.route("/forgotPassword").post(forgotPwd)
router.route("/resetPassword").post(resetPassword)
router.route("/deletuser/:id").delete(isAuthJWT,deleteUser)
router.route("/updatePassword").put(isAuthJWT, authorizeRoles("User"),updateUserPassword)
router.route("/update/:id").put(isAuthJWT,updateUser)
router.route("/getusers").get(isAuthJWT, getAllUsersWithPagination)
router.route("/getuser/:id").get(getUserById)
router.route("/me").get(isAuthJWT,getMyProfile)
router.route("/sendRequest").put(isAuthJWT,sendFriendRequest)
router.route("/acceptRequest").put(isAuthJWT,acceptFriendRequest)
router.route("/notifications").get(isAuthJWT,getMyNotification)
router.route("/friends/:chatId").get(isAuthJWT,getMyFriends)
router.route("/GroupRequest_Accept").put(isAuthJWT,acceptRequest)
router.route("/rtc/:role/:tokentype/:uid").post(join_channel)
router.route("/getmyNotifications").get(isAuthJWT, getmyNotifications)




// router.route("/login").get(adminLogin)
// router.route("/updatePass").post(isAuthJWT,authorizeRoles("Admin"),updatePassword)
// router.route("/logout").get(isAuthJWT, authorizeRoles("Admin"), logout)
// router.route("/forgotPassword").post(forgotPwd)
// router.route("/resetPassword").post(resetPassword)
module.exports = router;
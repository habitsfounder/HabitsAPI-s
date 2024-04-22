const express = require("express");
const multer = require('multer');
const {
  uploadFile,
  newGroupChat,
  getMyChat,
  updateGroupChat,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
  get_user_contact_list
} = require("../Controller/Chat");
const { isAuthJWT, authorizeRoles } = require("../Utils/jwt");
const { attachmentsMulter } = require("../Utils/multer");
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.route("/uploadFile").post(isAuthJWT, upload.single('file'), uploadFile);

router.route("/new").post(isAuthJWT, newGroupChat);
router.route("/updateGroup/:groupId").put(isAuthJWT, updateGroupChat);
router.route("/my").get(isAuthJWT, getMyChat);
router.route("/my/groups").get(isAuthJWT, getMyGroups);
router.route("/addMembers").put(isAuthJWT, addMembers);
router.route("/removeMember").put(isAuthJWT, removeMember);
router.route("/leave/:chatId").delete(isAuthJWT, leaveGroup);
router.route("/addAttachments").post(isAuthJWT, attachmentsMulter, sendAttachments);
router.route("/message/:id").get(isAuthJWT, getMessages);

router.route("/get_user_contact_list").post(isAuthJWT,get_user_contact_list);



router.route("/:id") //chatId
  .get(isAuthJWT, getChatDetails)
  .put(isAuthJWT, renameGroup)
  .delete(isAuthJWT, deleteChat);

  
module.exports = router;

const uploadOnS3 = require("../Utils/awsS3");
// const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { generateToken, verifyToken } = require("../Utils/jwt");
const User = require("../Model/User");
const Request = require("../Model/Request");
const Chat = require("../Model/Chat")
const sendEmail = require("../Utils/SendEmail");
const { ALERT, REFETCH_CHATS, NEW_ATTACHMENT, NEW_MESSAGE_ALERT, NEW_REQUEST } = require("../constants/events");
const { emitEvent } = require("../Utils/jwt");
const { getOtherMember } = require("../Utils/helper");
const { v4: uuidv4 } = require('uuid');
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');
const server_key="AAAAE-KZEkM:APA91bEDP72perWe7LqgDFtBBs6DOoIYkNHyskJX9k5fOFQPR4fGD3gOF5FZqc1lLbQ0DkkdJuBUrmRTYtmvoi39nsWwBbzjm_PQ1GI4TujTOTF0C3iqvZEMkZ01BnQS-Z3LdBPbQRfr"
var FCM = require('fcm-node');
var fcm = new FCM(server_key);


const HttpStatus = {
  OK: 200,
  INVALID: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  SERVER_ERROR: 500,
  NOT_FOUND: 404,
};
const StatusMessage = {
  INVALID_CREDENTIALS: "Invalid credentials.",
  INVALID_EMAIL_PASSWORD: "Please provide email and password.",
  USER_NOT_FOUND: "User not found.",
  SERVER_ERROR: "Server error.",
  MISSING_DATA: "Please provide all necessary user details.",
  DUPLICATE_DATA: "Data already exists.",
  DUPLICATE_EMAIL: "Email already exists.",
  DUPLICATE_CONTACT: "Contact number already exists.",
  USER_DELETED: "Deleted successfully.",
  UNAUTHORIZED_ACCESS: "Unauthorized access.",
  USER_UPDATED: "User updated successfully.",
  MISSING_PAGE_PARAMS: "Please provide page number and limit.",
  SAVED_SUCC: "Saved Successfully!",
  NOT_FOUND: "Data not found.",
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Invalid request" });
    }

    let fileName = req.file.originalname;

    let url = await uploadOnS3(req.file.buffer, fileName);

    return res.status(200).json({ status: true, url: url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.addUser = async (req, res ,next) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(401).json({success: false, error: "User with this email already exists." });
  }

  const userData = {
    email,
    provider_ID: req.body.provider_ID,
    name: req.body.name,
    contact: req.body.contact,
    provider: req.body.provider,
    avatar: req.body.avatar
  };

  if (password) {
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    userData.password = password;
  }

  try {
    const newUser = await User.create(userData);
    // console.log("newUser",newUser);
    // console.log("newUser",newUser.id);
    // console.log("newUser",newUser._id);


    // sendToken(newUser, 201, res);
    const token = generateToken({ id: newUser._id });

    const user = {
      success: true,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        contact: newUser.contact,
        provider: newUser.provider,
        avatar: newUser.avatar
      },
      token: token,
    };

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  let updateData = req.body;

  if (updateData.email) {
    console.log("Email update request detected and ignored.");
    delete updateData.email;
    delete updateData.password;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, message: updatedUser });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error occurred while updating the user.",
      error: error.message,
    });
  }
};

exports.updateUserPassword = async (req, res) => {
  const id = req.user._id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Please provide both old and new password.",
    });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    // Handle possible errors
    return res.status(500).json({
      success: false,
      message: "Server error occurred while updating the password.",
      error: error.message,
    });
  }
};

exports.forgotPwd = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ success: false, message: StatusMessage.INVALID_EMAIL_PASSWORD });
  }
  let user = await User.findOne({ email });
  if (!user) {
    return res
      .status(HttpStatus.UNAUTHORIZED)
      .json({ success: false, message: StatusMessage.USER_NOT_FOUND });
  }
  const token = generateToken({ email: user.email });
  user.resetToken = token;
  await user.save();
  const mailOptions = {
    from: "@gmail.com",
    to: user.email,
    subject: "Reset Password Link",
    text: `<h2>Hello! ${user.name} </h2>
        <h3>Please follow the link to reset your password: <a href=http//:localhost:3000/${token}>Link</a></h3>
        <h3>Thanks and regards</h3>
        `,
  };

  try {
    const info = await sendEmail(mailOptions);
    console.log("Email sent:", info);
    return res
      .status(200)
      .json({ success: true, message: "Reset link sent to registered mail." });
  } catch (error) {
    console.log("Error sending email:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send email" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }
    const tokenUser = await verifyToken(token);
    const { newPassword } = req.body;

    if (!newPassword) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: StatusMessage.MISSING_DATA });
    }
    const user = await User.findOne({ email: tokenUser.email });
    if (!user) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: StatusMessage.USER_NOT_FOUND });
    }

    if (user.resetToken !== token) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: StatusMessage.USER_NOT_FOUND });
    }
    // Verify the current password

    // Hash the new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = "";
    await user.save();

    // Optionally, send an email to the user acknowledging the password change

    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(HttpStatus.SERVER_ERROR)
      .json({ success: false, message: StatusMessage.SERVER_ERROR });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error occurred while deleting the user.",
      error: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error occurred while retrieving the user.",
      error: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  // const { email, password } = req.body;

  // try {
  //   if (!email) {
  //     return res.status(401).json({ success: false, error: "Email not found" });
  //   }

  //   const findUser = await User.findOne({ email }).select("+password");

  //   if (!findUser) {
  //     return res.status(401).json({ success: false, error: "User not found" });
  //   }

  //   if (findUser.password) {
  //     // If password is not provided for a local user
  //     if (!password) {
  //       return res.status(401).json({ success: false, error: "Password is required" });
  //     }

  //     // Check if the provided password matches the stored password
  //     if (!(await findUser.matchPasswords(password))) {
  //       return res.status(401).json({ success: false, error: "Invalid credentials" });
  //     }
  //   } else {
  //     if (!findUser.provider) {
  //       return res.status(401).json({ success: false, error: "Invalid user" });
  //     }
  //   }

  //   const token = generateToken({ id: findUser._id });
    
  //   await User.findByIdAndUpdate(
  //     { _id: findUser._id?.toString() },
  //     { activeToken: token },
  //     { new: true }
  //   );

  //   const user = {
  //     _id: findUser._id,
  //     name: findUser.name,
  //     email: findUser.email,
  //     contact: findUser.contact,
  //     provider: findUser.provider,
  //     activeToken: findUser.activeToken
  //   };

  //   return res.status(200).json({ success: true, user, token });
  // } catch (error) {
  //   console.error("Error:", error);
  //   res.status(500).json({ success: false, error: "Internal server error" });
  // }
    const { email, password, provider_ID,device_id } = req.body;
    
    if (!email || (!password && !provider_ID)) {
      return res.status(400).json({ success: false, error: "Please provide email and password/provider ID" });
    }
  
    try {
      const userQuery = User.findOne({ email }).select("+password");
      // const populateOptions = ["wishlist", "preference"];
      // populateOptions.forEach(option => userQuery.populate(option));
      const findUser = await userQuery;
  
      if (!findUser) {
        return res.status(401).json({ success: false, error: "Invalid credentials or user is blocked" });
      }
  
      const isValidLogin = password ? await findUser.matchPasswords(password) : findUser.provider_ID === provider_ID;
      if (!isValidLogin) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
  
      const token = generateToken({ id: findUser.id });
      await User.findByIdAndUpdate(findUser._id, { activeToken: token, lastLogin: Date.now() });

      const updatedUser = await User.updateOne(
        { email: email }, // Filter criteria
        { $set: { device_id: device_id, status: "1" } } // Update fields
    );
  
      res.status(200).json({
        success: true,
        user: {
          findUser,
          token
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  
};

exports.logoutUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }
    const email = req.user.email;
    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Invalid session or token, please login again",
      });
    
    
    }

    const userData = await User.findOne({ email });
    if (userData.activeToken && userData.activeToken === token) {
      const user = await User.findOneAndUpdate(
        { email: email, activeToken: token },
        { $unset: { activeToken: "", status: "2" } },
        { new: true }
      );
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid session or token, please login again",
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `${userData.email} is Logout Successfully`,
      });
    } else {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Token expired, please login again" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      console.error("Other error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
};

exports.getAllUsersWithPagination = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const searchQuery = {};
  if (req.query.search) {
    searchQuery.$or = [
      { name: { $regex: req.query.search, $options: "i" } }, 
      { email: { $regex: req.query.search, $options: "i" } },
      { contact: { $regex: req.query.search, $options: "i" } },
    ];
  }

  try {
    const totalUsers = await User.countDocuments(searchQuery);

    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(searchQuery).skip(skip).limit(limit);

    return res.status(200).json({
      success: true,
      count: users.length,
      page,
      totalPages,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error occurred while retrieving users.",
      error: error.message,
    });
  }
};

exports.getMyProfile = async (req, res) => {
  const id  = req.user;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error occurred while retrieving the user.",
      error: error.message,
    });
  }
};

exports.sendFriendRequest = async (req, res) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      {sender: req.user._id, receiver: userId},
      {sender: userId, receiver: req.user._id}
    ]
  });

  if(request) {
    res.status(400).json({
      success: false,
      error: "Request already sent",
    });
  }
  await Request.create({
    sender: req.user._id,
    receiver: userId
  });

  emitEvent(req,NEW_REQUEST, [userId]);
  
  return res.status(200).json({
    success: true,
    error: "Friend Request Sent",
  });
};



exports.acceptFriendRequest = async (req, res) => {
  const { requestId, accept } = req.body;
  
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if(!request) {
    res.status(400).json({
      success: false,
      error: "Request not found",
    });
  }

  if(request.receiver._id.toString() !== req.user._id.toString()){
    return res.status(401).json({
      success: false,
      error: "You are not authorized to accept this request",
    });
  }

  if(!accept){
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      error: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`
    }),
    request.deleteOne()
  ]);

  emitEvent(req,REFETCH_CHATS, members);
  
  return res.status(200).json({
    success: true,
    error: "Friend Request Accepted",
    senderId: request.sender._id
  });
};

exports.getMyNotification = async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests
  });
}

exports.getMyFriends = async (req, res) => {
  const chatId = req.params.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({members}) => {
    const otherUser = getOtherMember(members, req.user);

    return{
      _id : otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url
    }
  });

  if(chatId){

    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends
    });

  } else {
    return res.status(200).json({
      success: true,
      friends
    })
  }
}

exports.acceptRequest = async (req, res) => {
  try {
    const { requestId, status } = req.body;

    // Find the request by its ID and populate sender and receiver details
    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "name");

    // Check if the request exists
    if (!request) {
      return res.status(400).json({
        success: false,
        error: "Request not found",
      });
    }
     const senderId = request.sender
     const receiverId = request.receiver
     const chat_id = request.chat_id

     console.log("senderId",senderId);
     console.log("receiverId",receiverId);
     console.log("chat_id",chat_id);

  const chat = await Chat.findById(chat_id);

  if (!chat) {
    return res.status(400).json({
      success: false,
      error: "group not found",
    });
  }

  const user = await User.findById(receiverId);
  if (!user) {
    return res.status(400).json({
      success: false,
      error: "user not found",
    });
  }

   console.log("chat.name",chat.name);
   console.log("user.name",user.name);
 const user_name = user.name
    // If the status is 'rejected', delete the request and send response
    if (status === 'rejected') {

      var message = {
        "URL": "https://fcm.googleapis.com/fcm/send",
        "Header": {
        "Content-Type": "application/json",
        "Authorization": "key=<Server_key>"
         },
        "BODY": {
        // to: manager.device_id,
        to: '',
        collapse_key: 'green',
        notification: {
          "title": ` ${user_name} reject your Request to Join a New Habit Group`,
          "body": chat.name,     
          "mutable_content": false,       
          "sound": "Tri-tone",   
          },
          data: {
          "dl": "reject_group",
          "group_id": chat_id
          },
        }
      };
  
      fcm.send(message, async function (err, response) {
        console.log("1", message);
        if (err) {
          console.log("Something Has Gone Wrong !");
        } else {
          console.log("Successfully Sent With Resposne :", response);
          var body = message.notification.body;
          console.log("notification body for chat request<sent to gruop members>",body);
          const add_notification = await Notification.create(
            {
              sender_id: receiverId,
              receiver_id: senderId,
              chat_id: chat_id,
              message: message.notification.body,
              status: 1,
            })
         console.log("add_notification",add_notification);
  
        }
  
        //  console.log("2");
      })

      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "group Request Rejected",
      });
    }

  //   Update the status of the request to 'accepted'
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      { status: 'accepted' }, // Updated status object
      { new: true }
    );
    console.log("updatedRequest", updatedRequest);

    var message = {
      "URL": "https://fcm.googleapis.com/fcm/send",
      "Header": {
      "Content-Type": "application/json",
      "Authorization": "key=<Server_key>"
       },
      "BODY": {
      // to: manager.device_id,
      to: '',
      collapse_key: 'green',
      notification: {
        "title": ` ${user_name} accepte your Request to Join a New Habit Group`,
        "body": chat.name,     
        "mutable_content": false,       
        "sound": "Tri-tone",   
        },
        data: {
        "dl": "accept_group",
        "group_id": chat_id
        },
      }
    };

    fcm.send(message, async function (err, response) {
      console.log("1", message);
      if (err) {
        console.log("Something Has Gone Wrong !");
      } else {
        console.log("Successfully Sent With Resposne :", response);
        var body = message.notification.body;
        console.log("notification body for chat request<sent to gruop members>",body);
        const add_notification = await Notification.create(
          {
            sender_id: receiverId,
            receiver_id: senderId,
            chat_id: chat_id,
            message: message.notification.body,
            status: 1,
          })
       console.log("add_notification",add_notification);

      }

      //  console.log("2");
    })


    return res.status(200).json({
      success: true,
      message: "group Request Accepted",
      // senderId: request.sender._id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
};

exports.join_channel = async (req, res ,next) => {

  const APP_ID ='68d1d07cba51485088375f0aa5d8552c';
const APP_CERTIFICATE ='150084ca18b2419e8f4ec45b9f4ef94e';
console.log("1233333");
// set response header
res.header('Access-Control-Allow-Origin', '*');

const generatedchannelName = uuidv4();
// get channel name
// const channelName = req.params.channel;
// if (!channelName) {
//   return resp.status(400).json({ 'error': 'channel is required' });
// }

 // get uid
 let uid = req.params.uid;
 if(!uid || uid === '') {
   return res.status(400).json({ 'error': 'uid is required' });
 }

// get role
let role;
if (req.params.role === 'publisher') {
  role = RtcRole.PUBLISHER;
} else if (req.params.role === 'subscriber') {
  role = RtcRole.SUBSCRIBER
} else {
  return res.status(400).json({ 'error': 'role is incorrect' });
}


// get the expire time
let expireTime = req.query.expiry;
if (!expireTime || expireTime === '') {
  expireTime = 60 * 60 ;
} else {
  expireTime = parseInt(expireTime, 10);
}
// calculate privilege expire time
const currentTime = Math.floor(Date.now() / 1000);
const privilegeExpireTime = currentTime + expireTime;
console.log(role);

// build the token
let token;

if (req.params.tokentype === 'userAccount') {
  token = RtcTokenBuilder.buildTokenWithAccount(APP_ID, APP_CERTIFICATE,generatedchannelName, uid, role, privilegeExpireTime);
} else if (req.params.tokentype === 'uid') {
  token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE,generatedchannelName, uid, role, privilegeExpireTime);
} else {
  return res.status(400).json({ 'error': 'token type is invalid' });
}

// return the token
return res.json({ 'rtcToken': token,'generatedchannelName':generatedchannelName
});
}


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
const { io,to } = require("../index");
const ActivityLog = require("../Model/ActivityLogs");

// const server_key="AAAAE-KZEkM:APA91bEDP72perWe7LqgDFtBBs6DOoIYkNHyskJX9k5fOFQPR4fGD3gOF5FZqc1lLbQ0DkkdJuBUrmRTYtmvoi39nsWwBbzjm_PQ1GI4TujTOTF0C3iqvZEMkZ01BnQS-Z3LdBPbQRfr"
// var FCM = require('fcm-node');
// var fcm = new FCM(server_key);

const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.REGION,
});

const s3 = new AWS.S3();
function uploadFilee(file, filename) {
  var date = new Date();
  var parentFolder = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

  const params = {
    Bucket: process.env.BUCKET,
    Key: parentFolder + '/' + filename,
    Body: file,
  };

  return new Promise(function (resolve, reject) {
    s3.upload(params, function (err, data) {
      if (err) {
        console.log('Error =>' + err);
        reject(err);
      }
      if (data != null) {
        console.log('Image', 'uploadOnS3' + data.Location);
        resolve({ // Resolve with an object containing public_id and url
          public_id: data.Key,
          url: data.Location
        });
      }
    });
  });
}

exports.uploadFile = async (req, res, next) => {
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

exports.newGroupChat = async (req, res, next) => {
  const { name, members, habits, habit_verification_method, groupImage, groupDescription, activityStartDate, activityEndDate, monetaryPotAmount, max_points } = req.body;
  try {
    if (members.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Group Chat must have at least 3 members",
      });
    }

    const allMembers = [...members, req.user];

    const new_data = await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
      habits,
      habit_verification_method,
      groupImage,
      groupDescription,
      activityStartDate,
      activityEndDate,
      monetaryPotAmount,
      max_points
    });

    const create_user =  await Request.create({
        sender: req.user, // Assuming sender is the creator of the group
        receiver: req.user,
        chat_id: new_data._id,
        status:'accepted'
      });
console.log("create_user",create_user);

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} Group`);
    emitEvent(req, REFETCH_CHATS, members);

    console.log("new_data", new_data);

    const allMembers2 = [...members];
    // Save each member as a separate request in the request table
    const requests = allMembers2.map(async memberId => {
      await Request.create({
        sender: req.user, // Assuming sender is the creator of the group
        receiver: memberId,
        chat_id: new_data._id
      });

          // const users_device_id = await User.findById({_id:memberId})

          // console.log("users_device_id",users_device_id.device_id);

//       var message = {

//         "URL": "https://fcm.googleapis.com/fcm/send",
//         "Header": {
//         "Content-Type": "application/json",
//         "Authorization": "key=<Server_key>"
//          },
//         "BODY": {
//         // to: manager.device_id,
        // token: users_device_id.device_id,
//         collapse_key: 'green',
//         notification: {
//           "title": "Requested You to Join a New Habit Group",
//           "body": `${name}`,     
//           "mutable_content": false,       
//           "sound": "Tri-tone",   
//           },
//           data: {
//           "dl": "join_group",
//           "group_id": new_data._id
//           },
//         }
//       };
  

// //    // Send the notification
// admin.messaging().send(message)
// .then(async (response) => {
//   console.log('Successfully sent message:', response);
//           // console.log("Successfully Sent With Resposne :", response);
//           var body = message.notification.body;
//           console.log("notification body for chat request<sent to gruop members>",body);
          const add_notification = await Notification.create(
            {
              sender_id: req.user,
              receiver_id: memberId,
              chat_id: new_data._id,
              message: "Requested You to Join a New Habit Group",
              status: 1,
            })
         console.log("add_notification",add_notification);
// })

// .catch((error) => {
//   console.log("Something Has Gone Wrong !");
//   console.log('Error sending message:', error);
// });

    });

    // Wait for all requests to be created
    await Promise.all(requests);

    // Emit event for new request
    // emitEvent(req, NEW_REQUEST, members);

    return res.status(201).json({
      success: true,
      message: "Group Created",
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateGroupChat = async (req, res, next) => {
  const { groupId } = req.params;
  const { name, members, habit, habit_verification_method, groupImage, groupDescription, activityStartDate, activityEndDate, monetaryPotAmount, money_transferred, max_points, winner_user } = req.body;
  try {
    const updatedFields = {
      name,
      habit,
      habit_verification_method,
      groupImage,
      groupDescription,
      activityStartDate,
      activityEndDate,
      monetaryPotAmount,
      money_transferred,
      max_points,
      winner_user
    };

    const updatedGroup = await Chat.findByIdAndUpdate(groupId, updatedFields, { new: true });

    if (!updatedGroup) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Group Updated",
      group: updatedGroup,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

exports.getMyChat = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate("members", "name avatar");

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {

      const otherMember = getOtherMember(members, req.user)

      return {
        _id,
        groupChat,
        avatar: groupChat ? members.slice(0, 3).map(({ avatar }) => avatar.url) : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {

          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id)
          }
          return prev;
        }, []),
      };
      // members.filter(i => i._id.toString() !== req.user.toString()).map(i=>i._id)
    })

    return res.status(200).json({
      success: true,
      chats: transformedChats
    })
  } catch (error) {
    console.log(error);
  }
};

// when not work on verification 
// exports.getMyGroups = async (req, res, next) => {

//   try {
//     let query = {};
//     const { searchQuery } = req.query;

//     if (searchQuery) {
//       const userId = req.user;
//       query = {
//         $or: [
//           { members: userId }, // Search groups where the user is a member
//           { creator: userId } // Search groups created by the user
//         ],
//         $and: [
//           { groupChat: true }, // Must be a group chat
//           {
//             $or: [
//               { name: { $regex: new RegExp(searchQuery, "i") } },
//               { groupDescription: { $regex: new RegExp(searchQuery, "i") } }
//             ]
//           }
//         ]
//       };
//     } else {
//       query = {
//         members: req.user,
//         groupChat: true,
//         creator: req.user
//       };
//     }
//     console.log("req.user ", req.user);

//     const acceptedMembers = await Request.find({
//       status: 'accepted',
//       $or: [{ receiver: req.user }, { sender: req.user }]
//     });


//     const acceptedMemberIds = acceptedMembers.flatMap(request => [request.sender, request.receiver]);

//     // Include only groups where all accepted members exist


//     console.log("acceptedMemberIds", acceptedMemberIds);

//     if (Array.isArray(acceptedMemberIds) && acceptedMemberIds.length === 0) {
//       console.log("11111");


//       const chats = await Chat.find(query)
//         .populate({
//           path: "members",
//           // select: "name avatar",
//         })
//         .populate({
//           path: "habits",
          
//           populate: {
//             path: "habit verification",
//             models: {
//               path: "Habit",
//               model: "Habit",
//             },
//             models: {
//               path: "Verification",
//               model: "Verification",
//             },
//           },
//         })
//         .populate("winner_user");

//       const currentDate = new Date();
//       const groups = chats.map(({ members, _id, groupChat, name, habits, groupImage, groupDescription, activityStartDate, activityEndDate, monetaryPotAmount, mooney_transferred, max_points, winner_user }) => {
//         const endDate = new Date(activityEndDate);
//         const daysLeft = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)); // Calculate the difference in days

//         return {
//           _id,
//           groupChat,
//           name,
//           habits,
//           members,
//           // habit_verification_method,
//           groupImage,
//           groupDescription,
//           activityStartDate,
//           activityEndDate,
//           monetaryPotAmount,
//           mooney_transferred,
//           daysLeft,
//           max_points,
//           winner_user,
//           active_memberIds: acceptedMemberIds

//         };
//       });

//       return res.status(200).json({
//         success: true,
//         groups
//       });

//     } else {
//       query = {
//         ...query,
//         members: {
//           $in: acceptedMemberIds
//         }
//       };
//       // console.log("11111111111111111111111111111111");
//       const chats = await Chat.find(query)
//         .populate({
//           path: "members",
//           // select: "name avatar",
//         })
//         .populate({
//           path: "habits",
//           populate: {
//             path: "habit verification",
//             models: {
//               path: "Habit",
//               model: "Habit",
//             },
//             models: {
//               path: "Habit",
//               model: "Habit",
//             },
//           },
//         })
//         .populate("winner_user");

//         // console.log("11111111111111111111111111111111",chats[0].habits);

//       const currentDate = new Date();
//       const groups = chats.map(({ members, _id, groupChat, name, habits, groupImage, groupDescription, activityStartDate, activityEndDate, monetaryPotAmount, mooney_transferred, max_points, winner_user }) => {
//         const endDate = new Date(activityEndDate);
//         const daysLeft = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)); // Calculate the difference in days
       
//         console.log("habits",habits);

//         // const habitId = "6622546edae07673952f10fa";
//         // const verificationId = "6622546edae07673952f10fb";
        
//         const updatedHabits = habits.map(habit => {
//           // Check if habit ID and verification ID match the condition
//           // if (habitId && verificationId) {
//             // Push the verification object into the verification field of the habit
//             habit.verification = {
//               "_id": habit.id,
//               "name": "Timer",
//               "logo": "https://habits-attachments.s3.amazonaws.com/2024-4-19/1st.png",
//               "units": "Hours"
//             };
//           // }
//           return habit;
//         }); 

//         return {
//           _id,
//           groupChat,
//           name,
//           habits:updatedHabits,
//           members,
//           // habit_verification_method,
//           groupImage,
//           groupDescription,
//           activityStartDate,
//           activityEndDate,
//           monetaryPotAmount,
//           mooney_transferred,
//           daysLeft,
//           max_points,
//           winner_user,
//           active_memberIds: acceptedMemberIds
//           // avatar: members.slice(0, 3).map(({ avatar }) => avatar.url)
//         };
//       });
//       // console.log("v",groups);    
//       return res.status(200).json({
//         success: true,
//         groups
//       });

//     }

//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       error: "Internal Server Error"
//     });
//   }
// };


// right
exports.getMyGroups = async (req, res, next) => {
  try {
    let lastWinnerId
    let query = {};
    const { searchQuery } = req.query;

    if (searchQuery) {
      const userId = req.user;
      query = {
        $or: [
          { members: userId }, // Search groups where the user is a member
          { creator: userId } // Search groups created by the user
        ],
        $and: [
          { groupChat: true }, // Must be a group chat
          {
            $or: [
              { name: { $regex: new RegExp(searchQuery, "i") } },
              { groupDescription: { $regex: new RegExp(searchQuery, "i") } }
            ]
          }
        ]
      };
    } else {
      query = {
        members: req.user,
        groupChat: true,
        creator: req.user
      };
    }

    const acceptedMembers = await Request.find({
      status: 'accepted',
      $or: [{ receiver: req.user }, { sender: req.user }]
    });

    console.log("acceptedMembers========================",acceptedMembers);
    const acceptedMemberIds = acceptedMembers.flatMap(request => [request.receiver]);
    console.log("acceptedMemberIds==============",acceptedMemberIds);

    let chats;
    if (Array.isArray(acceptedMemberIds) && acceptedMemberIds.length === 0) {
      chats = await Chat.find(query)
        .populate({
          path: "members",
        })
        .populate({
          path: "habits",
          populate: [
            { path: "habit", model: "Habit" },
            { path: "verification" } // Populate the verification field
          ],
        })
        .populate("winner_user");
    } else {
      query = {
        ...query,
        members: { $in: acceptedMemberIds }
      };
      chats = await Chat.find(query)
        .populate({
          path: "members",
          select: "-password -email"
        })
        .populate({
          path: "habits",
          populate: [
            { path: "habit", model: "Habit" }
          ],
        })
        .populate("winner_user");
    }

    const currentDate = new Date();
    const groups = chats.map(({ members, _id, groupChat, name, habits, groupImage, groupDescription, activityStartDate, activityEndDate, monetaryPotAmount, mooney_transferred, max_points, winner_user }) => {
      const endDate = new Date(activityEndDate);
             const daysLeft = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)); // Calculate the difference in days


      return {
        _id,
        groupChat,
        name,
        habits: habits.map(habit => {
          if (habit.verification) {
            const verificationDetails = habit.habit.details.filter(detail => detail._id.toString() === habit.verification.toString());
            if (verificationDetails.length > 0) {
              return {
                ...habit.toObject(),
                verificationDetails 
              };
            } 
          }
          return habit.toObject(); 
        }),
        members,
        groupImage,
        groupDescription,
        activityStartDate,
        activityEndDate,
        monetaryPotAmount,
        mooney_transferred,
        daysLeft,
        max_points,
        winner_user,
        active_memberIds: acceptedMemberIds,
      };
    });

    groups.forEach(async ({ members, _id, activityEndDate, winner_user }) => {
      const today = new Date();
      console.log("_id", _id);
      if (activityEndDate < today) { // Compare dates properly
        console.log("members", members);
    
          console.log("1")
          const group = await Chat.findOne({ _id: _id, members: members }).populate('members').lean();
          console.log("group",group);

  
          // if (!group) {
          //   return res.status(403).json({ error: 'User does not have access to this group.' });
          // }
    
          // Fetch activity logs for the group
          const activityLogs = await ActivityLog.find({ chat_id: _id }).populate('user_id').populate('chat_id');
    
         console.log("activityLogs",activityLogs);

          if (activityLogs.length > 0) {
            // Group members by their IDs
            const membersById = {};
            console.log("44444");
            group.members.forEach(member => {
              console.log("member",member);
              membersById[member._id.toString()] = member;
            });
    
            // Initialize points earned for each user
            const userPointsMap = {};
    
            // Calculate sum of points earned for each user
            activityLogs.forEach(log => {
              const userId = log.user_id._id.toString();
    console.log("userId",userId);
              // Initialize newBalance for each user
              let newBalance = parseFloat(userPointsMap[userId]) || 0;
    
              // Update newBalance with points earned from current log
              newBalance += parseFloat(log.points_earned);
    
              // Update points earned for the user
              userPointsMap[userId] = newBalance;
              console.log("newBalance",newBalance);
            });
    
            // Update members array with points and last activity done
            Object.keys(membersById).forEach(memberId => {
              const member = membersById[memberId];
              member.points_earned = userPointsMap[memberId] || '0';
              const correspondingLog = activityLogs.find(log => log.user_id._id.toString() === memberId);
              member.activity_done = correspondingLog ? correspondingLog.activity_done : '';
            });
    
            // Convert the object of members back to an array
            const groupedMembers = Object.values(membersById);
            groupedMembers.sort((a, b) => parseFloat(b.points_earned) - parseFloat(a.points_earned));
    console.log("groupedMembers",groupedMembers[0]._id);
    // console.log("group",group.winner_user);
    const last_id = groupedMembers[0]._id
    
//     if (groupedMembers.length > 0) {

//       const updatedActivityLog = await Chat.findByIdAndUpdate(
//         _id,
//         { $addToSet: { winner_user: last_id } }, // Use $addToSet to add the new winner_user if it doesn't already exist
//         { new: true }
//       );
//      group.winner_user.push(last_id);
// // console.log("updateduser",updateduser);
      
//     }



 lastWinnerId = groupedMembers.length > 0 ? groupedMembers[0]._id : null;

if (lastWinnerId && !group.winner_user.includes(lastWinnerId)) {
  await Chat.findByIdAndUpdate(
    group._id,
    { $addToSet: { winner_user: lastWinnerId } },
    { new: true }
  );
  // groups.winner_user.push(lastWinnerId);
}
    // console.log("winner_user",updatedActivityLog);
  // return res.status(200).json({
  //     success: true,
  //     groups:group,
      
  //   });
            // return res.json({ status: true, message: "Data fetched successfully", groups: groups, max_points: group.max_points });
    
          } 
      }
    });
    
  // groups.winner_user.push(lastWinnerId);
    
    return res.status(200).json({
      success: true,
      groups,
      
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
};




exports.addMembers = async (req, res, next) => {
  const { chatId, members } = req.body;

  if (!members || members.length < 1) {
    return res.status(404).json({ success: false, error: "Please provide members" });
  }
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  if (!chat.groupChat) {
    return res.status(400).json({ success: false, error: "This is not a group chat" });
  }

  if (chat.creator.toString() !== req.user._id.toString()) {
    // console.log(chat.creator.toString());
    // console.log(req.user._id.toString());
    return res.status(403).json({ success: false, error: "You are not allowed to add members" });
  }

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allNewMembersPromise)

  const uniqueMembers = allNewMembers.filter((i) => !chat.members.includes(i._id.toString())).map((i) => i._id)

  // chat.members.push(...allNewMembers.map((i)=> i._id));
  chat.members.push(...uniqueMembers);

  if (chat.members.length > 100) {
    return res.status(400).json({ success: false, error: "Group members limit reached" });
  }

  await chat.save();

  const allUsersName = allNewMembers.map((i) => i.name).join(",");

  emitEvent(req, ALERT, chat.members, `${allUsersName} has been added in the group`)

  emitEvent(req, REFETCH_CHATS, chat.members)

  return res.status(200).json({
    success: true,
    message: "Members added successfully"
  });
};

exports.removeMember = async (req, res, next) => {
  const { chatId, userId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId), User.findById(userId, "name")
  ]);

  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  if (!chat.groupChat) {
    return res.status(400).json({ success: false, error: "This is not a group chat" });
  }

  if (chat.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, error: "You are not allowed to remove members" });
  }

  if (chat.members.length <= 3) {
    return res.status(400).json({ success: false, error: "Group must have at least 3 members" });
  }
  chat.members = chat.members.filter((member) => member.toString() !== userId.toString());

  await chat.save();

  emitEvent(req, ALERT, chat.members, `${userThatWillBeRemoved.name} has been removed from group`)
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Member removed successfully"
  })
};

exports.leaveGroup = async (req, res, next) => {
  const chatId = req.params.chatId;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  if (!chat.groupChat) {
    return res.status(400).json({ success: false, error: "This is not a group chat" });
  }

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  )

  if (remainingMembers.length < 3) {
    return res.status(400).json({ success: false, error: "Group must have at least 3 members" });
  }

  if (chat.creator.toString() === req.user.toString()) {
    // const newCreator = remainingMembers[0]
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([User.findById(req.user, "name"), chat.save()]);
  await chat.save();

  emitEvent(req, ALERT, chat.members, `User ${user.name} has Left the group`)
  // emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Member removed successfully"
  })
};

exports.sendAttachments = async (req, res, next) => {
  const { chatId } = req.body;

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name")
  ]);

  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  const files = req.files || []

  if (files.length < 1) {
    return res.status(400).json({ success: false, error: "Please provide attachments" });
  }

  const attachments = [];
  // Upload each file and collect their URLs
  for (const file of files) {
    const url = await uploadFilee(file.buffer, file.originalname);
    attachments.push(url);
  }

  const messageForDB = { content: "", attachments, sender: me._id, chat: chatId };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    }
  }

  const message = await Message.create(messageForDB)

  emitEvent(req, NEW_ATTACHMENT, chat.members, {
    message: messageForRealTime,
    chatId
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId })

  return res.status(200).json({
    success: true,
    message
  })
};

exports.getChatDetails = async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id).populate("members", "name avatar").lean();

    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url
    }))

    return res.status(200).json({
      success: true,
      chat
    })
  } else {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    return res.status(200).json({
      success: true,
      chat
    })
  }
};

exports.renameGroup = async (req, res, next) => {
  const chatId = req.params.id;

  const { name } = req.body;

  const chat = await Chat.findById(chatId)

  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  if (!chat.groupChat) {
    return res.status(400).json({ success: false, error: "This is not a group chat" });
  }

  if (chat.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, error: "You are not allowed to rename group" });
  }

  chat.name = name;

  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Group renamed successfully"
  });
};

exports.deleteChat = async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId)

  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  const members = chat.members;

  if (chat.groupChat && chat.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, error: "You are not allowed to delete the group" });
  }

  if (!chat.groupChat && !chat.members.includes(req.user._id.toString())) {
    return res.status(403).json({ success: false, error: "You are not allowed to delete the chat" });
  }

  // Delete all the messages as well as attachments or any file 

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id))
  );

  await Promise.all([
    // Delete Files From aws s3
    // deleteFilesFroms3(public_ids),
    // chat.deleteOne(),
    Message.deleteMany({ chat: chatId })
  ])

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully"
  });
};


exports.getMessages = async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;

  const limit = 20;
  const skip = (page - 1) * limit;

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name avatar")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / limit) || 0;

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
};


// exports.getMessages = async (req, res, next) => {
//   const chatId = req.params.id;
//   const { page = 1 } = req.query;

//   const limit = 20;
//   const skip = (page - 1) * limit;

//   try {
//     // Check if io is defined on the request app
//     if (!req.app.io) {
//       throw new Error('Socket.IO is not initialized');
//     }

//     const [messages, totalMessagesCount] = await Promise.all([
//       Message.find({ chat: chatId })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate("sender", "name avatar")
//         .lean(),
//       Message.countDocuments({ chat: chatId }),
//     ]);

//     const totalPages = Math.ceil(totalMessagesCount / limit) || 0;

//     // Emit messages to the chat room if io is defined
//     req.app.io.to(chatId).emit("chat-messages", messages.reverse());

//     return res.status(200).json({
//       success: true,
//       messages,
//       totalPages,
//     });
//   } catch (error) {
//     console.error("Error:", error.message);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };



exports.get_user_contact_list = async (req, res, next) => {

  const arr = req.body.numbers; 

  try {
    const getuser1 = await User.find(); 
  
    const matchedUsers = getuser1.filter(user => arr.includes(parseInt(user.contact)));
    
    if (matchedUsers.length>0) {
     return res.status(200).json({
          success: true,
          messages:"get data successfully",
          members: matchedUsers
        });
    }else{
      return res.status(200).json({
        success: true,
        messages:"no match data",
      });
    }

    console.log(matchedUsers);
  } catch (error) {
    // Handle any errors that occur during fetching users
    console.error("Error fetching users:", error);
  }

  //   try {
  //     let query = {};
  //     const { searchQuery } = req.query;
  
  //     if (searchQuery) {
  //       const userId = req.user;
  //       console.log("22",userId);
  //       query = {
  //         $or: [
  //           { members: userId }, // Search groups where the user is a member
  //           { creator: userId } // Search groups created by the user
  //         ],
  //         $and: [
  //           { groupChat: true }, // Must be a group chat
  //           {
  //             $or: [
  //               { name: { $regex: new RegExp(searchQuery, "i") } },
  //               { groupDescription: { $regex: new RegExp(searchQuery, "i") } }
  //             ]
  //           }
  //         ]
  //       };
  //     } else {
  //       query = {
  //         members: req.user,
  //         groupChat: true,
  //         creator: req.user
  //       };
  //     }
  //     // console.log("22",userId);
  
  //     // const acceptedMembers = await Request.find({
  //     //   status: 'accepted',
  //     //   $or: [{ receiver: req.user }, { sender: req.user }]
  //     // });
  // // console.log("acceptedMembers",acceptedMembers);
  //     const acceptedMemberIds = acceptedMembers.flatMap(request => [request.sender, request.receiver]);
  //     console.log("22",acceptedMemberIds);
  
  //     if (Array.isArray(acceptedMemberIds) && acceptedMemberIds.length === 0) {
  //       const chats = await Chat.find(query)
  //         .populate({
  //           path: "members",
  //           // select: "name avatar",
  //         });
  
  //       const memberArrays = chats.map(({ members }) => members);
  
  //       const membersArray = [].concat.apply([], memberArrays); // Flatten the array of arrays
  
  //       return res.status(200).json({
  //         success: true,
  //         members: membersArray
  //       });
  
  //     } else {
  //       query = {
  //         ...query,
  //         members: {
  //           $in: acceptedMemberIds
  //         }
  //       };
  
  //       const chats = await Chat.find(query)
  //         .populate({
  //           path: "members",
  //           // select: "name avatar",
  //         });
  //         console.log("chats",chats);
  
  //       const memberArrays = chats.map(({ members }) => members);
  
  //       const membersArray = [].concat.apply([], memberArrays); // Flatten the array of arrays
  
  //       return res.status(200).json({
  //         success: true,
  //         members: membersArray
  //       });
  
  //     }
  
  //   } catch (error) {
  //     console.log(error);
  //     return res.status(500).json({
  //       success: false,
  //       error: "Internal Server Error"
  //     });
  //   }
 
 
};



// exports.add_message = async (req, res, next) => {
// // router.post('/add-message', authMiddleware, async (req, res) => {
//   try {
//     const { group_id, data } = req.body;

//     // Validate the request body
//     if (!group_id || !data) {
//       return res.status(400).json({ error: "Group ID and data are required." });
//     }

//     // Create a new message
//     const newMessage = new Message({
//       chat:group_id,
//       sender:req.user,
//       content:data.message,
//       type:data.type,
//       activity_verification:data.activity_verification,
//       date:data.date
//     });

//     // Save the message to the database
//     await newMessage.save();

//     return res.json({ status: true, message: "Message added successfully." });
//   } catch (error) {
//     console.error('Error:', error.message);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };






exports.add_message = async (req, res, next) => {
  try {
    const { group_id, data } = req.body;

    // Validate the request body
    if (!group_id || !data) {
      return res.status(400).json({ error: "Group ID and data are required." });
    }
// console.log("111111");
    // Create a new message
    const newMessage = new Message({
      chat: group_id,
      sender: req.user,
      content: data.message,
      type: data.type,
      activity_verification: data.activity_verification,
      date: data.date,
      meta_data:data.meta_data
    });

    // console.log("111116666666661");

    // Save the message to the database
   const add_data =  await newMessage.save();
// console.log("add_data",add_data);
    // Emit the new message to the chat room
    const io = req.app.get("io");
  const newmsg = io.to(group_id).emit("NEW_MESSAGE", newMessage);
    // console.log("io",io);
    console.log("newMessage",newmsg);


    return res.json({ status: true, message: "Message added successfully." });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadOnS3 = require("../Utils/awsS3");
const { emitEvent } = require("../Utils/jwt");
const Chat = require("../Model/Chat");
const { ALERT, REFETCH_CHATS, NEW_ATTACHMENT, NEW_MESSAGE_ALERT } = require("../constants/events");
const { getOtherMember } = require("../Utils/helper");
const User = require("../Model/User");
const Message = require("../Model/Message");

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
  const { name, members, habit, habit_verification_method, groupImage, groupDescription, activityStartDate, activityEndDate,monetaryPotAmount } = req.body;
  try {
    if (members.length < 2) {
      return res.status(400).json({
          success: false,
          error: "Group Chat must have at least 3 members",
        });
    }

    const allMembers = [...members, req.user];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
      habit,
      habit_verification_method,
      groupImage,
      groupDescription,
      activityStartDate,
      activityEndDate,
      monetaryPotAmount,
    });

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} Group`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
      success: true,
      message: "Group Created",
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getMyChat = async (req, res ,next) => {
  try {
      const chats = await Chat.find({members: req.user}).populate("members" ,"name avatar");

      const transformedChats = chats.map(({_id, name,members,groupChat}) => {

        const otherMember = getOtherMember(members, req.user)

        return {
            _id,
            groupChat, 
            avatar: groupChat?members.slice(0,3).map(({avatar}) => avatar.url): [otherMember.avatar.url],
            name: groupChat ? name : otherMember.name,
            members: members.reduce((prev, curr)=> {
              
              if(curr._id.toString() !== req.user.toString()){
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

exports.getMyGroups = async (req, res, next) => {
  try {
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

    const chats = await Chat.find(query).populate("members", "name avatar");

    const currentDate = new Date();
    const groups = chats.map(({ members, _id, groupChat, name, habit, habit_verification_method,groupImage, groupDescription, activityStartDate, activityEndDate, monetaryPotAmount }) => {
      const endDate = new Date(activityEndDate);
      const daysLeft = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)); // Calculate the difference in days

      return {
        _id,
        groupChat,
        name,
        habit,
        habit_verification_method,
        groupImage,
        groupDescription,
        activityStartDate,
        activityEndDate,
        monetaryPotAmount,
        daysLeft,
        avatar: members.slice(0, 3).map(({ avatar }) => avatar.url)
      };
    });

    return res.status(200).json({
      success: true,
      groups
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
  const { chatId, members} = req.body;

  if(!members || members.length < 1) {
    return res.status(404).json({success: false, error: "Please provide members" });
  }
  const chat = await Chat.findById(chatId);

  if(!chat){
    return res.status(404).json({success: false, error: "Chat not found" });
  }

  if(!chat.groupChat){
    return res.status(400).json({success: false, error: "This is not a group chat" });
  }

  if(chat.creator.toString() !== req.user._id.toString()){
    // console.log(chat.creator.toString());
    // console.log(req.user._id.toString());
    return res.status(403).json({success: false, error: "You are not allowed to add members" });
  }

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allNewMembersPromise)

  const uniqueMembers = allNewMembers.filter((i) => !chat.members.includes(i._id.toString())).map((i) => i._id)

  // chat.members.push(...allNewMembers.map((i)=> i._id));
  chat.members.push(...uniqueMembers);

  if(chat.members.length > 100){
    return res.status(400).json({success: false, error: "Group members limit reached" });
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
  const {chatId, userId} = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId), User.findById(userId, "name")
  ]);

  if(!chat){
    return res.status(404).json({success: false, error: "Chat not found" });
  }

  if(!chat.groupChat){
    return res.status(400).json({success: false, error: "This is not a group chat" });
  }

  if(chat.creator.toString() !== req.user._id.toString()){
    return res.status(403).json({success: false, error: "You are not allowed to remove members" });
  }

  if(chat.members.length <= 3) {
    return res.status(400).json({success: false, error: "Group must have at least 3 members" });
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

  if(!chat){
    return res.status(404).json({success: false, error: "Chat not found" });
  }

  if(!chat.groupChat){
    return res.status(400).json({success: false, error: "This is not a group chat" });
  }

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  )

  if(remainingMembers.length < 3){
    return res.status(400).json({success: false, error: "Group must have at least 3 members" });
  }

  if(chat.creator.toString() === req.user.toString()){
    // const newCreator = remainingMembers[0]
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([User.findById(req.user, "name"),chat.save()]);
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

  if(!chat){
    return res.status(404).json({success: false, error: "Chat not found" });
  }

  const files = req.files || []

  if(files.length < 1){
    return res.status(400).json({success: false, error: "Please provide attachments" });
  }

  const attachments = [];
  // Upload each file and collect their URLs
  for (const file of files) {
    const url = await uploadFilee(file.buffer, file.originalname);
    attachments.push(url);
  }

  const messageForDB = { content:"", attachments, sender: me._id, chat: chatId};

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

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {chatId})
 
  return res.status(200).json({
    success: true,
    message
  })
};

exports.getChatDetails = async (req, res, next) => {
  if(req.query.populate === "true"){
    const chat = await Chat.findById(req.params.id).populate("members", "name avatar").lean();

    if(!chat){
      return res.status(404).json({success: false, error: "Chat not found" });
    }

    chat.members = chat.members.map(({_id, name, avatar}) => ({
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

    if(!chat){
      return res.status(404).json({success: false, error: "Chat not found" });
    }

    return res.status(200).json({
      success: true,
      chat
    })
  }
};

exports.renameGroup = async(req, res, next) => {
  const chatId = req.params.id;

  const {name} = req.body;

  const chat = await Chat.findById(chatId)

    if(!chat){
      return res.status(404).json({success: false, error: "Chat not found" });
    }

    if(!chat.groupChat){
      return res.status(400).json({success: false, error: "This is not a group chat" });
    }

    if(chat.creator.toString() !== req.user._id.toString()){
      return res.status(403).json({success: false, error: "You are not allowed to rename group" });
    }

    chat.name = name;

    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
      success: true,
      message: "Group renamed successfully"
    });
};

exports.deleteChat = async(req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId)

    if(!chat){
      return res.status(404).json({success: false, error: "Chat not found" });
    }

    const members = chat.members;

    if(chat.groupChat && chat.creator.toString() !== req.user._id.toString()){
      return res.status(403).json({success: false, error: "You are not allowed to delete the group" });
    }

    if(!chat.groupChat && !chat.members.includes(req.user._id.toString())){
      return res.status(403).json({success: false, error: "You are not allowed to delete the chat" });
    }

// Delete all the messages as well as attachments or any file 

    const messagesWithAttachments = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = [];

    messagesWithAttachments.forEach(({attachments}) =>
      attachments.forEach(({public_id}) => public_ids.push(public_id))
    );

    await Promise.all([
      // Delete Files From aws s3
      // deleteFilesFroms3(public_ids),
      // chat.deleteOne(),
      Message.deleteMany({chat: chatId})
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
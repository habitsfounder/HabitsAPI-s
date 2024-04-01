const cors = require("cors");
const bodyParser = require("body-parser");
const express = require("express");
// const path = require("path");
const cookieParser = require("cookie-parser")
const { Server } = require("socket.io");
const { createServer } = require("http");
const { getSockets } = require("./Utils/helper.js");
const { v4: uuid } = require('uuid');
const Message  = require("./Model/Message");
const { corsOptions } = require("./constants/config.js");
const { socketAuthenticator } = require("./Utils/jwt.js");
const {connectDB} = require("./Utils/db")
const {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} = require("./constants/events.js");

const app = express();
require("dotenv").config();

connectDB();

const userSocketIDs = new Map();
const onlineUsers = new Set();

const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "500kb", extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Routes
app.use("/api/adminauth", require("./Route/AdminRoute"));
app.use("/api/userauth", require("./Route/UserRoute"));
app.use("/api/chat", require("./Route/ChatRouter"));
app.use("/api/habit", require("./Route/HabitsRoute"));
app.use("/api/methods", require("./Route/VerificationMethodRoute"));

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  console.log("A User Connecteddd", socket.id);
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

// if (process.env.NODE_ENV === "dev") {
//   //replaced "production" with "dev"
//   app.use(express.static("../client/build"));

//   app.get("*", (req, res) => {
//     res.sendFile(
//       path.resolve(__dirname, "..", "client", "build", "index.html")
//     );
//   });
// } else {
//   app.get("/", (req, res) => {
//     res.send("API is running..");
//   });
// }
// // set-up-passport
// app.use(passport.initialize());
// app.use(passport.session());

// // Google OAuth
// passport.use(
//   new OAuth2Strategy({
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL:"/auth/google/callback",
//       scope:["profile","email"]
//   },
//   async(accessToken,refreshToken,profile,done)=>{

//       try {
//           let user = await User.findOne({email: profile.emails[0].value});

//           if (!user) {
//             user = new User({
//               provider_ID: profile.id,
//               firstname: profile.name.givenName,
//               lastname: profile.name.familyName,
//               //   image: profile.photos[0].value,
//               email: profile.emails[0].value,
//               provider: profile.provider,
//             });

//             await user.save();
//           }

//           return done(null,user)
//       } catch (error) {
//           return done(error,null)
//       }
//   }
//   )
// );
// // Facebook OAuth
// passport.use(
//   new FacebookStrategy(
//     {
//       clientID: process.env.FACEBOOK_CLIENT_ID,
//       clientSecret: process.env.FACEBOOK_SECRET_KEY,
//       callbackURL: "/auth/facebook/callback",
//     },
//     async function (accessToken, refreshToken, profile, cb) {
//       const user = await User.findOne({
//         provider_ID: profile.id,
//       });
//       if (!user) {
//         console.log('Adding new facebook user to DB..');
//         const user = new User({
//           // accountId: profile.id,
//           provider_ID: profile.id,
//           firstname: profile.displayName,
//           provider: profile.provider,
//         });
//         await user.save();
//         // console.log(user);
//         return cb(null, profile);
//       } else {
//         console.log('Facebook User already exist in DB..');
//         // console.log(profile);
//         return cb(null, profile);
//       }
//     }
//   )
// );

// passport.serializeUser((user,done)=>{
//   done(null,user);
// })

// passport.deserializeUser((user,done)=>{
//   done(null,user);
// });

// // Initial Google oauth Login
// app.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}));

// // Initial Facebook oauth Login
// app.get('/auth/facebook', passport.authenticate('facebook',{scope:['public_profile', 'email']}));

// // Google Authenticate Callback
// app.get("/auth/google/callback", passport.authenticate("google",{
//   successRedirect:"http://localhost:3000/admin/admin-dashboard",
//   failureRedirect:"http://localhost:3000/login"
// }));

// // Facebook Authenticate Callback
// app.get("/auth/facebook/callback", passport.authenticate("facebook",{
//     successRedirect: 'http://localhost:3000/admin/admin-dashboard',
//     failureRedirect: 'http://localhost:3000/login'
// }));

// app.get("/login/sucess", async (req, res) => {
//   if (req.user) {
//     res.status(200).json({ message: "user Login", user: req.user });
//   } else {
//     res.status(400).json({ message: "Not Authorized" });
//   }
// });

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});

module.exports = { userSocketIDs };
const { userSocketIDs } = require("../index");

const getOtherMember = (members, userId) =>
  members.find((member) => member._id.toString() !== userId.toString());

// const getSockets = (users = []) => {
//   console.log(userSocketIDs);
//   console.log(users);
//   const sockets = users.map((user) => userSocketIDs.get(user.toString()));
//   return sockets;
// };
const getSockets = (userSocketIDs, users = []) => {
  console.log(userSocketIDs);
  console.log(users);
  const sockets = users.map((user) => userSocketIDs.get(user.toString()));
  return sockets;
};

const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

module.exports = { getOtherMember, getSockets, getBase64 };

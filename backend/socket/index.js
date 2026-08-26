const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const User = require("../models/User");
const Message = require("../models/Message");
const Group = require("../models/Group");

/**
 * Parse JWT from Socket.io handshake (cookie or auth token)
 */
const getUserFromSocket = async (socket) => {
  try {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.cookie) {
      const parsed = cookie.parse(socket.handshake.headers.cookie);
      token = parsed.token;
    }

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return User.findById(decoded.id).select("-password");
  } catch {
    return null;
  }
};

/**
 * Initialize Socket.io event handlers for real-time chat
 */
const initSocket = (io) => {
  // Authenticate every connection
  io.use(async (socket, next) => {
    const user = await getUserFromSocket(socket);
    if (!user) {
      return next(new Error("Unauthorized"));
    }
    socket.user = user;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket connected: ${socket.user.username} (${userId})`);

    // Join personal room (for DMs + notifications)
    socket.join(userId);

    // Join all group rooms the user belongs to
    const groups = await Group.find({ members: userId }).select("_id");
    groups.forEach((g) => socket.join(`group_${g._id}`));

    socket.emit("connected", { userId });

    /**
     * Join a specific chat room (optional — personal/group rooms already cover most cases)
     */
    socket.on("join_chat", ({ chatId, type }) => {
      if (type === "group") {
        socket.join(`group_${chatId}`);
      }
    });

    /**
     * Send a message in real time
     * Payload: { content, receiverId?, groupId? }
     */
    socket.on("send_message", async (payload, callback) => {
      try {
        const { content, receiverId, groupId } = payload || {};

        if (!content || !String(content).trim()) {
          callback?.({ error: "Empty message" });
          return;
        }

        if (!receiverId && !groupId) {
          callback?.({ error: "Missing receiver or group" });
          return;
        }

        if (groupId) {
          const group = await Group.findById(groupId);
          if (!group || !group.members.some((m) => m.toString() === userId)) {
            callback?.({ error: "Not a group member" });
            return;
          }
        }

        let message = await Message.create({
          senderId: userId,
          receiverId: groupId ? null : receiverId,
          groupId: groupId || null,
          content: String(content).trim(),
          status: "sent",
        });

        message = await message.populate("senderId", "name username avatar");

        if (groupId) {
          io.to(`group_${groupId}`).emit("receive_message", { message });
        } else {
          io.to(receiverId).emit("receive_message", { message });
          // Also emit to sender (other tabs / confirmation)
          io.to(userId).emit("receive_message", { message });
        }

        callback?.({ success: true, message });
      } catch (error) {
        console.error("Socket send_message error:", error);
        callback?.({ error: "Failed to send message" });
      }
    });

    /**
     * Typing indicator
     */
    socket.on("typing", ({ chatId, type, isTyping }) => {
      if (type === "group") {
        socket.to(`group_${chatId}`).emit("typing", {
          chatId,
          userId,
          username: socket.user.username,
          isTyping,
        });
      } else {
        socket.to(chatId).emit("typing", {
          chatId: userId,
          userId,
          username: socket.user.username,
          isTyping,
        });
      }
    });

    /**
     * Soft-delete a message for the current user
     */
    socket.on("delete_message", async ({ messageId }, callback) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          callback?.({ error: "Not found" });
          return;
        }

        if (!message.deletedFor.some((id) => id.toString() === userId)) {
          message.deletedFor.push(userId);
          await message.save();
        }

        socket.emit("message_deleted", { messageId, deletedFor: userId });
        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: "Failed to delete" });
      }
    });

    /**
     * Join a newly created/added group room
     */
    socket.on("join_group", ({ groupId }) => {
      if (groupId) socket.join(`group_${groupId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.user.username}`);
    });
  });
};

module.exports = { initSocket };

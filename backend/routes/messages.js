const express = require("express");
const Message = require("../models/Message");
const Group = require("../models/Group");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/messages/:chatId
 * chatId can be another user's ID (DM) or a group ID.
 * Pass ?type=group for group chats, otherwise treated as DM.
 */
router.get("/:chatId", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const isGroup = req.query.type === "group";

    let filter;

    if (isGroup) {
      const group = await Group.findById(chatId);
      if (!group) {
        return res.status(404).json({ message: "Group not found." });
      }
      const isMember = group.members.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ message: "Not a group member." });
      }
      filter = { groupId: chatId };
    } else {
      filter = {
        groupId: null,
        $or: [
          { senderId: req.user._id, receiverId: chatId },
          { senderId: chatId, receiverId: req.user._id },
        ],
      };
    }

    // Exclude messages the current user soft-deleted for themselves
    filter.deletedFor = { $ne: req.user._id };

    const messages = await Message.find(filter)
      .populate("senderId", "name username avatar")
      .sort({ createdAt: 1 })
      .limit(500);

    res.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages." });
  }
});

/**
 * POST /api/messages/send
 * Body: { content, receiverId?, groupId? }
 */
router.post("/send", protect, async (req, res) => {
  try {
    const { content, receiverId, groupId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required." });
    }

    if (!receiverId && !groupId) {
      return res.status(400).json({ message: "receiverId or groupId is required." });
    }

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found." });
      }
      const isMember = group.members.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ message: "Not a group member." });
      }
    }

    let message = await Message.create({
      senderId: req.user._id,
      receiverId: groupId ? null : receiverId,
      groupId: groupId || null,
      content: content.trim(),
      status: "sent",
    });

    message = await message.populate("senderId", "name username avatar");

    // Real-time emit
    const io = req.app.get("io");
    if (io) {
      if (groupId) {
        io.to(`group_${groupId}`).emit("receive_message", { message });
      } else {
        io.to(receiverId).emit("receive_message", { message });
        io.to(req.user._id.toString()).emit("receive_message", { message });
      }
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
});

/**
 * PATCH /api/messages/:id/delete
 * Soft delete — "Delete for me"
 * Adds userId to deletedFor array; does NOT remove the MongoDB document.
 */
router.patch("/:id/delete", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    const alreadyHidden = message.deletedFor.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!alreadyHidden) {
      message.deletedFor.push(req.user._id);
      // Also flip isDeleted if the sender deletes their own message (optional UX)
      // Keep isDeleted for "deleted for everyone" style — here we only do "for me"
      await message.save();
    }

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("message_deleted", {
        messageId: message._id,
        deletedFor: req.user._id,
      });
    }

    res.json({ message: "Message deleted for you.", messageId: message._id });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Failed to delete message." });
  }
});

module.exports = router;

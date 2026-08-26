const express = require("express");
const Contact = require("../models/Contact");
const User = require("../models/User");
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/contacts/add
 * Create a bidirectional contact link between current user and contactId
 */
router.post("/add", protect, async (req, res) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ message: "contactId is required." });
    }

    if (contactId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot add yourself." });
    }

    const otherUser = await User.findById(contactId);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if already connected (either direction)
    const existing = await Contact.findOne({
      $or: [
        { userId: req.user._id, contactId },
        { userId: contactId, contactId: req.user._id },
      ],
    });

    if (existing) {
      return res.status(400).json({ message: "Already in your contacts." });
    }

    // Create both directions so each appears in the other's list
    await Contact.insertMany([
      { userId: req.user._id, contactId },
      { userId: contactId, contactId: req.user._id },
    ]);

    res.status(201).json({
      message: "Contact added successfully.",
      contact: {
        _id: otherUser._id,
        name: otherUser.name,
        username: otherUser.username,
        email: otherUser.email,
        avatar: otherUser.avatar,
      },
    });
  } catch (error) {
    // Duplicate key error from unique index
    if (error.code === 11000) {
      return res.status(400).json({ message: "Already in your contacts." });
    }
    console.error("Add contact error:", error);
    res.status(500).json({ message: "Failed to add contact." });
  }
});

/**
 * GET /api/contacts
 * Return contacts with last message preview for the chat list
 */
router.get("/", protect, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id })
      .populate("contactId", "name username email avatar")
      .sort({ updatedAt: -1 });

    const chatList = await Promise.all(
      contacts.map(async (c) => {
        const other = c.contactId;
        if (!other) return null;

        // Last message between the two users (excluding ones deleted for current user)
        const lastMessage = await Message.findOne({
          groupId: null,
          deletedFor: { $ne: req.user._id },
          $or: [
            { senderId: req.user._id, receiverId: other._id },
            { senderId: other._id, receiverId: req.user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          _id: other._id,
          name: other.name,
          username: other.username,
          email: other.email,
          avatar: other.avatar,
          type: "dm",
          lastMessage: lastMessage
            ? {
                content: lastMessage.isDeleted
                  ? "This message was deleted"
                  : lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                isDeleted: lastMessage.isDeleted,
              }
            : null,
        };
      })
    );

    res.json({ contacts: chatList.filter(Boolean) });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ message: "Failed to fetch contacts." });
  }
});

module.exports = router;

const express = require("express");
const User = require("../models/User");
const Contact = require("../models/Contact");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/users/search?query=
 * Case-insensitive partial match on name or username
 */
router.get("/search", protect, async (req, res) => {
  try {
    const q = (req.query.query || "").trim();

    if (!q) {
      return res.json({ users: [] });
    }

    // Find existing contact IDs so we can mark them in the UI
    const myContacts = await Contact.find({ userId: req.user._id }).select("contactId");
    const contactIds = myContacts.map((c) => c.contactId.toString());

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ],
    })
      .select("name username email avatar")
      .limit(20);

    const results = users.map((u) => ({
      ...u.toObject(),
      isContact: contactIds.includes(u._id.toString()),
    }));

    res.json({ users: results });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Failed to search users." });
  }
});

module.exports = router;

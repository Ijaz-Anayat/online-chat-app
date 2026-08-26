const express = require("express");
const Group = require("../models/Group");
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/groups/create
 * Create a group with name, optional image, and member IDs
 */
router.post("/create", protect, async (req, res) => {
  try {
    const { name, image, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required." });
    }

    const uniqueMembers = [
      ...new Set([req.user._id.toString(), ...(memberIds || []).map(String)]),
    ];

    const group = await Group.create({
      name: name.trim(),
      image: image || "",
      members: uniqueMembers,
      admin: req.user._id,
    });

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    res.status(201).json({ message: "Group created.", group: populated });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Failed to create group." });
  }
});

/**
 * GET /api/groups
 * List groups the current user belongs to (with last message preview)
 */
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar")
      .sort({ updatedAt: -1 });

    const list = await Promise.all(
      groups.map(async (g) => {
        const lastMessage = await Message.findOne({
          groupId: g._id,
          deletedFor: { $ne: req.user._id },
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          _id: g._id,
          name: g.name,
          image: g.image,
          members: g.members,
          admin: g.admin,
          type: "group",
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

    res.json({ groups: list });
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ message: "Failed to fetch groups." });
  }
});

/**
 * GET /api/groups/:id
 * Group info page data
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group." });
    }

    res.json({ group });
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ message: "Failed to fetch group." });
  }
});

/**
 * PATCH /api/groups/:id
 * Admin-only: update group name / image
 */
router.patch("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the admin can edit the group." });
    }

    const { name, image } = req.body;

    if (name !== undefined) {
      const trimmed = String(name || "").trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Group name is required." });
      }
      if (trimmed.length > 60) {
        return res.status(400).json({ message: "Group name is too long (max 60)." });
      }
      group.name = trimmed;
    }

    if (image !== undefined) {
      group.image = String(image || "").trim();
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group._id}`).emit("group_updated", { group: populated });
    }

    res.json({ message: "Group updated.", group: populated });
  } catch (error) {
    console.error("Update group error:", error);
    res.status(500).json({ message: "Failed to update group." });
  }
});

/**
 * POST /api/groups/:id/add-member
 * Admin-only: add a member
 */
router.post("/:id/add-member", protect, async (req, res) => {
  try {
    const { memberId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the admin can add members." });
    }

    if (!memberId) {
      return res.status(400).json({ message: "memberId is required." });
    }

    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (group.members.some((m) => m.toString() === memberId)) {
      return res.status(400).json({ message: "User is already a member." });
    }

    group.members.push(memberId);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    // Notify via Socket.io if available
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group._id}`).emit("group_updated", { group: populated });
      io.to(memberId).emit("added_to_group", { group: populated });
    }

    res.json({ message: "Member added.", group: populated });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({ message: "Failed to add member." });
  }
});

/**
 * POST /api/groups/:id/remove-member
 * Admin-only: remove a member
 */
router.post("/:id/remove-member", protect, async (req, res) => {
  try {
    const { memberId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the admin can remove members." });
    }

    if (memberId === group.admin.toString()) {
      return res.status(400).json({ message: "Admin cannot be removed. Transfer admin first or leave." });
    }

    group.members = group.members.filter((m) => m.toString() !== memberId);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group._id}`).emit("group_updated", { group: populated });
      io.to(memberId).emit("removed_from_group", { groupId: group._id });
    }

    res.json({ message: "Member removed.", group: populated });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ message: "Failed to remove member." });
  }
});

/**
 * POST /api/groups/:id/leave
 * Leave a group (if admin leaves, promote next member or delete if empty)
 */
router.post("/:id/leave", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(400).json({ message: "You are not a member." });
    }

    group.members = group.members.filter(
      (m) => m.toString() !== req.user._id.toString()
    );

    // If admin left and members remain, promote the first remaining member
    if (
      group.admin.toString() === req.user._id.toString() &&
      group.members.length > 0
    ) {
      group.admin = group.members[0];
    }

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
      const io = req.app.get("io");
      if (io) {
        io.to(`group_${group._id}`).emit("group_deleted", { groupId: group._id });
      }
      return res.json({ message: "You left and the group was deleted (no members left)." });
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group._id}`).emit("group_updated", { group: populated });
      io.to(`group_${group._id}`).emit("member_left", {
        groupId: group._id,
        userId: req.user._id,
      });
    }

    res.json({ message: "You left the group.", group: populated });
  } catch (error) {
    console.error("Leave group error:", error);
    res.status(500).json({ message: "Failed to leave group." });
  }
});

module.exports = router;

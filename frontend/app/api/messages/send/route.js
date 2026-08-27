import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import Group from "@/lib/models/Group";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";
import {
  ensureChaudhryBot,
  ensureChaudhryContact,
  generateChaudhryReply,
  getRecentChatContext,
  getRecentGroupContext,
  isChaudhryMention,
  pickGroupRoastTargets,
} from "@/lib/chaudhry";

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { content, receiverId, groupId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ message: "Message content is required." }, { status: 400 });
    }
    if (!receiverId && !groupId) {
      return NextResponse.json({ message: "receiverId or groupId is required." }, { status: 400 });
    }

    let group = null;
    if (groupId) {
      group = await Group.findById(groupId);
      if (!group) return NextResponse.json({ message: "Group not found." }, { status: 404 });
      const isMember = group.members.some((m) => m.toString() === auth.user._id.toString());
      if (!isMember) return NextResponse.json({ message: "Not a group member." }, { status: 403 });
    }

    let message = await Message.create({
      senderId: auth.user._id,
      receiverId: groupId ? null : receiverId,
      groupId: groupId || null,
      content: content.trim(),
      status: "sent",
      readBy: [auth.user._id],
    });

    message = await message.populate("senderId", "name username avatar isBot");

    const preview =
      content.trim().length > 80 ? `${content.trim().slice(0, 80)}…` : content.trim();
    const senderName = message.senderId?.name || "Someone";

    const bot = await ensureChaudhryBot();
    const botId = bot._id.toString();

    let recipientIds = [];
    if (groupId && group) {
      recipientIds = group.members
        .map((m) => m.toString())
        .filter((id) => id !== auth.user._id.toString() && id !== botId);
    } else if (receiverId) {
      recipientIds = [receiverId].filter((id) => id !== botId);
    }

    if (recipientIds.length) {
      sendPushToUsers(recipientIds, {
        title: groupId ? `${senderName} in ${group.name}` : senderName,
        body: preview,
        url: "/chat",
        tag: groupId ? `group-${groupId}` : `dm-${auth.user._id}`,
      }).catch((err) => console.error("Push notify error:", err));
    }

    let botMessage = null;

    // DM to Chaudhry
    if (!groupId && receiverId && String(receiverId) === botId) {
      await ensureChaudhryContact(auth.user._id);
      const history = await getRecentChatContext(auth.user._id, bot._id, 8);
      const replyText = await generateChaudhryReply(content.trim(), auth.user.name, {
        history,
      });
      botMessage = await Message.create({
        senderId: bot._id,
        receiverId: auth.user._id,
        groupId: null,
        content: replyText,
        status: "sent",
        readBy: [bot._id],
      });
      botMessage = await botMessage.populate("senderId", "name username avatar isBot");

      sendPushToUsers([auth.user._id.toString()], {
        title: "Chaudhry AI",
        body: replyText.length > 80 ? `${replyText.slice(0, 80)}…` : replyText,
        url: "/chat",
        tag: `dm-${botId}`,
      }).catch(() => {});
    }

    // Group: @ai / @chaudhry when bot is a member
    if (
      groupId &&
      group &&
      isChaudhryMention(content) &&
      group.members.some((m) => m.toString() === botId)
    ) {
      const memberDocs = await User.find({ _id: { $in: group.members } })
        .select("name username isBot")
        .lean();

      const { roastTarget, sidekick } = pickGroupRoastTargets(memberDocs, {
        botId,
        senderId: auth.user._id,
      });

      const history = await getRecentGroupContext(groupId, bot._id, 8);
      const replyText = await generateChaudhryReply(content.trim(), auth.user.name, {
        history,
        groupMode: true,
        groupName: group.name,
        memberNames: memberDocs
          .filter((m) => !m.isBot && m.username !== "chaudhry_ai")
          .map((m) => m.name),
        randomMemberName: roastTarget?.name || null,
        roastTargetName: roastTarget?.name || null,
        sidekickName: sidekick?.name || null,
      });

      botMessage = await Message.create({
        senderId: bot._id,
        receiverId: null,
        groupId,
        content: replyText,
        status: "sent",
        readBy: [bot._id],
      });
      botMessage = await botMessage.populate("senderId", "name username avatar isBot");

      const groupNotify = group.members
        .map((m) => m.toString())
        .filter((id) => id !== botId);
      sendPushToUsers(groupNotify, {
        title: `Chaudhry AI in ${group.name}`,
        body: replyText.length > 80 ? `${replyText.slice(0, 80)}…` : replyText,
        url: "/chat",
        tag: `group-${groupId}`,
      }).catch(() => {});
    }

    return NextResponse.json({ message, botMessage }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ message: "Failed to send message." }, { status: 500 });
  }
}

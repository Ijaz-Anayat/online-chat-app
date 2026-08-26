import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/messages/read
 * Body: { chatId, type: "dm" | "group" }
 * Marks all unread messages in that chat as read for the current user.
 */
export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { chatId, type } = await request.json();

    if (!chatId) {
      return NextResponse.json({ message: "chatId is required." }, { status: 400 });
    }

    const userId = auth.user._id;
    let filter;

    if (type === "group") {
      const group = await Group.findById(chatId);
      if (!group) {
        return NextResponse.json({ message: "Group not found." }, { status: 404 });
      }
      const isMember = group.members.some((m) => m.toString() === userId.toString());
      if (!isMember) {
        return NextResponse.json({ message: "Not a group member." }, { status: 403 });
      }
      filter = {
        groupId: chatId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
        deletedFor: { $ne: userId },
      };
    } else {
      filter = {
        groupId: null,
        senderId: chatId,
        receiverId: userId,
        readBy: { $ne: userId },
        deletedFor: { $ne: userId },
      };
    }

    const result = await Message.updateMany(filter, {
      $addToSet: { readBy: userId },
      $set: { status: "read" },
    });

    return NextResponse.json({
      message: "Messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ message: "Failed to mark messages as read." }, { status: 500 });
  }
}

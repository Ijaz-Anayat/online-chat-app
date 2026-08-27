import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/messages/clear
 * Soft-clear entire chat for the current user only.
 * Adds userId to deletedFor on every message — documents stay in MongoDB.
 * Body: { chatId, type: "dm" | "group" }
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
      if (group.admin.toString() !== userId.toString()) {
        return NextResponse.json({ message: "Only the group admin can clear this chat." }, { status: 403 });
      }
      filter = {
        groupId: chatId,
        deletedFor: { $ne: userId },
      };
    } else {
      filter = {
        groupId: null,
        deletedFor: { $ne: userId },
        $or: [
          { senderId: userId, receiverId: chatId },
          { senderId: chatId, receiverId: userId },
        ],
      };
    }

    const result = await Message.updateMany(filter, {
      $addToSet: { deletedFor: userId },
      $set: { isDeleted: true },
    });

    return NextResponse.json({
      message: "Chat cleared for you.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Clear chat error:", error);
    return NextResponse.json({ message: "Failed to clear chat." }, { status: 500 });
  }
}

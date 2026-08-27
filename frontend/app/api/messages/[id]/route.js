import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

/** GET /api/messages/:id — id is chatId (user or group) */
export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const chatId = params.id;
    const isGroup = request.nextUrl.searchParams.get("type") === "group";

    let filter;

    if (isGroup) {
      const group = await Group.findById(chatId);
      if (!group) return NextResponse.json({ message: "Group not found." }, { status: 404 });
      const isMember = group.members.some((m) => m.toString() === auth.user._id.toString());
      if (!isMember) return NextResponse.json({ message: "Not a group member." }, { status: 403 });
      filter = { groupId: chatId };
    } else {
      filter = {
        groupId: null,
        $or: [
          { senderId: auth.user._id, receiverId: chatId },
          { senderId: chatId, receiverId: auth.user._id },
        ],
      };
    }

    filter.deletedFor = { $ne: auth.user._id };

    const messages = await Message.find(filter)
      .populate("senderId", "name username avatar isBot")
      .sort({ createdAt: 1 })
      .limit(500);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ message: "Failed to fetch messages." }, { status: 500 });
  }
}

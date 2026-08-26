import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

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

    if (groupId) {
      const group = await Group.findById(groupId);
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
      readBy: [auth.user._id], // sender has already "seen" their own message
    });

    message = await message.populate("senderId", "name username avatar");

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ message: "Failed to send message." }, { status: 500 });
  }
}

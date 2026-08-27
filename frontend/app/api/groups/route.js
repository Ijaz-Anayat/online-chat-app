import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import Message from "@/lib/models/Message";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const userId = auth.user._id;
    const groups = await Group.find({ members: userId })
      .populate("members", "name username email avatar isBot")
      .populate("admin", "name username email avatar isBot")
      .sort({ updatedAt: -1 });

    const list = await Promise.all(
      groups.map(async (g) => {
        const lastMessage = await Message.findOne({
          groupId: g._id,
          deletedFor: { $ne: userId },
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          groupId: g._id,
          senderId: { $ne: userId },
          deletedFor: { $ne: userId },
          readBy: { $ne: userId },
        });

        return {
          _id: g._id,
          name: g.name,
          image: g.image,
          members: g.members,
          admin: g.admin,
          type: "group",
          unreadCount,
          lastMessage: lastMessage
            ? {
                content: lastMessage.isDeleted ? "This message was deleted" : lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                isDeleted: lastMessage.isDeleted,
                status: lastMessage.status,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ groups: list });
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json({ message: "Failed to fetch groups." }, { status: 500 });
  }
}

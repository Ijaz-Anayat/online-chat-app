import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";
import Message from "@/lib/models/Message";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const userId = auth.user._id;
    const contacts = await Contact.find({ userId })
      .populate("contactId", "name username email avatar")
      .sort({ updatedAt: -1 });

    const chatList = await Promise.all(
      contacts.map(async (c) => {
        const other = c.contactId;
        if (!other) return null;

        const lastMessage = await Message.findOne({
          groupId: null,
          deletedFor: { $ne: userId },
          $or: [
            { senderId: userId, receiverId: other._id },
            { senderId: other._id, receiverId: userId },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        // Unread = messages from the other user that I have not read
        const unreadCount = await Message.countDocuments({
          groupId: null,
          senderId: other._id,
          receiverId: userId,
          deletedFor: { $ne: userId },
          readBy: { $ne: userId },
        });

        return {
          _id: other._id,
          name: other.name,
          username: other.username,
          email: other.email,
          avatar: other.avatar,
          type: "dm",
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

    return NextResponse.json({ contacts: chatList.filter(Boolean) });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json({ message: "Failed to fetch contacts." }, { status: 500 });
  }
}

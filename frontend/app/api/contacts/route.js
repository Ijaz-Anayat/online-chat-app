import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";
import Message from "@/lib/models/Message";
import { requireAuth } from "@/lib/auth";
import { ensureChaudhryContact } from "@/lib/chaudhry";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const userId = auth.user._id;

    // Always keep Chaudhry AI in the user's chat list
    await ensureChaudhryContact(userId);

    const contacts = await Contact.find({ userId })
      .populate("contactId", "name username email avatar isBot")
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
          isBot: Boolean(other.isBot),
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

    const list = chatList.filter(Boolean);
    list.sort((a, b) => {
      if (a.isBot && !b.isBot && !a.lastMessage) return -1;
      if (b.isBot && !a.isBot && !b.lastMessage) return 1;
      const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({ contacts: list });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json({ message: "Failed to fetch contacts." }, { status: 500 });
  }
}

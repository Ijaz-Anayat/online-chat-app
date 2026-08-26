import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/models/Message";
import { requireAuth } from "@/lib/auth";

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const message = await Message.findById(params.id);

    if (!message) {
      return NextResponse.json({ message: "Message not found." }, { status: 404 });
    }

    const alreadyHidden = message.deletedFor.some(
      (id) => id.toString() === auth.user._id.toString()
    );

    if (!alreadyHidden) {
      message.deletedFor.push(auth.user._id);
      await message.save();
    }

    return NextResponse.json({ message: "Message deleted for you.", messageId: message._id });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ message: "Failed to delete message." }, { status: 500 });
  }
}

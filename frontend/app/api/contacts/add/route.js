import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { contactId } = await request.json();

    if (!contactId) {
      return NextResponse.json({ message: "contactId is required." }, { status: 400 });
    }
    if (contactId === auth.user._id.toString()) {
      return NextResponse.json({ message: "You cannot add yourself." }, { status: 400 });
    }

    const otherUser = await User.findById(contactId);
    if (!otherUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const existing = await Contact.findOne({
      $or: [
        { userId: auth.user._id, contactId },
        { userId: contactId, contactId: auth.user._id },
      ],
    });
    if (existing) {
      return NextResponse.json({ message: "Already in your contacts." }, { status: 400 });
    }

    await Contact.insertMany([
      { userId: auth.user._id, contactId },
      { userId: contactId, contactId: auth.user._id },
    ]);

    return NextResponse.json(
      {
        message: "Contact added successfully.",
        contact: {
          _id: otherUser._id,
          name: otherUser.name,
          username: otherUser.username,
          email: otherUser.email,
          avatar: otherUser.avatar,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ message: "Already in your contacts." }, { status: 400 });
    }
    console.error("Add contact error:", error);
    return NextResponse.json({ message: "Failed to add contact." }, { status: 500 });
  }
}

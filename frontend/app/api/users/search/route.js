import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Contact from "@/lib/models/Contact";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const q = (request.nextUrl.searchParams.get("query") || "").trim();
    if (!q) return NextResponse.json({ users: [] });

    const myContacts = await Contact.find({ userId: auth.user._id }).select("contactId");
    const contactIds = myContacts.map((c) => c.contactId.toString());

    const users = await User.find({
      _id: { $ne: auth.user._id },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ],
    })
      .select("name username email avatar")
      .limit(20);

    return NextResponse.json({
      users: users.map((u) => ({
        ...u.toObject(),
        isContact: contactIds.includes(u._id.toString()),
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ message: "Failed to search users." }, { status: 500 });
  }
}

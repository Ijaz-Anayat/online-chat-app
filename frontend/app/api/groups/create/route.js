import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { name, image, memberIds } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Group name is required." }, { status: 400 });
    }

    const uniqueMembers = [
      ...new Set([auth.user._id.toString(), ...(memberIds || []).map(String)]),
    ];

    const group = await Group.create({
      name: name.trim(),
      image: image || "",
      members: uniqueMembers,
      admin: auth.user._id,
    });

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar isBot")
      .populate("admin", "name username email avatar isBot");

    return NextResponse.json({ message: "Group created.", group: populated }, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ message: "Failed to create group." }, { status: 500 });
  }
}

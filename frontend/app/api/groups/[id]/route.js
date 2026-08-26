import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const group = await Group.findById(params.id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    if (!group) {
      return NextResponse.json({ message: "Group not found." }, { status: 404 });
    }

    const isMember = group.members.some(
      (m) => m._id.toString() === auth.user._id.toString()
    );
    if (!isMember) {
      return NextResponse.json({ message: "You are not a member of this group." }, { status: 403 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Get group error:", error);
    return NextResponse.json({ message: "Failed to fetch group." }, { status: 500 });
  }
}

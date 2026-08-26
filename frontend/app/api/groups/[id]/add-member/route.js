import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { memberId } = await request.json();
    const group = await Group.findById(params.id);

    if (!group) return NextResponse.json({ message: "Group not found." }, { status: 404 });
    if (group.admin.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ message: "Only the admin can add members." }, { status: 403 });
    }
    if (!memberId) {
      return NextResponse.json({ message: "memberId is required." }, { status: 400 });
    }

    const user = await User.findById(memberId);
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
    if (group.members.some((m) => m.toString() === memberId)) {
      return NextResponse.json({ message: "User is already a member." }, { status: 400 });
    }

    group.members.push(memberId);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    return NextResponse.json({ message: "Member added.", group: populated });
  } catch (error) {
    console.error("Add member error:", error);
    return NextResponse.json({ message: "Failed to add member." }, { status: 500 });
  }
}

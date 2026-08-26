import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const group = await Group.findById(params.id);

    if (!group) return NextResponse.json({ message: "Group not found." }, { status: 404 });

    const isMember = group.members.some((m) => m.toString() === auth.user._id.toString());
    if (!isMember) {
      return NextResponse.json({ message: "You are not a member." }, { status: 400 });
    }

    group.members = group.members.filter((m) => m.toString() !== auth.user._id.toString());

    if (group.admin.toString() === auth.user._id.toString() && group.members.length > 0) {
      group.admin = group.members[0];
    }

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
      return NextResponse.json({ message: "You left and the group was deleted (no members left)." });
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar")
      .populate("admin", "name username email avatar");

    return NextResponse.json({ message: "You left the group.", group: populated });
  } catch (error) {
    console.error("Leave group error:", error);
    return NextResponse.json({ message: "Failed to leave group." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
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
      return NextResponse.json({ message: "Only the admin can remove members." }, { status: 403 });
    }
    if (memberId === group.admin.toString()) {
      return NextResponse.json(
        { message: "Admin cannot be removed. Transfer admin first or leave." },
        { status: 400 }
      );
    }

    group.members = group.members.filter((m) => m.toString() !== memberId);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar isBot")
      .populate("admin", "name username email avatar isBot");

    return NextResponse.json({ message: "Member removed.", group: populated });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ message: "Failed to remove member." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";
import { CHAUDHRY } from "@/lib/chaudhry";

const MEMBER_FIELDS = "name username email avatar isBot";

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
      const remaining = await User.find({ _id: { $in: group.members } })
        .select("username isBot")
        .lean();
      const human =
        remaining.find((u) => !u.isBot && u.username !== CHAUDHRY.username) || remaining[0];
      group.admin = human?._id || group.members[0];
    }

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
      return NextResponse.json({ message: "You left and the group was deleted (no members left)." });
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", MEMBER_FIELDS)
      .populate("admin", MEMBER_FIELDS);

    return NextResponse.json({ message: "You left the group.", group: populated });
  } catch (error) {
    console.error("Leave group error:", error);
    return NextResponse.json({ message: "Failed to leave group." }, { status: 500 });
  }
}

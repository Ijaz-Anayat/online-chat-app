import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import { requireAuth } from "@/lib/auth";
import { ensureChaudhryBot } from "@/lib/chaudhry";

const MEMBER_FIELDS = "name username email avatar isBot";

/**
 * Admin-only: add Chaudhry AI bot to this group.
 */
export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const group = await Group.findById(params.id);

    if (!group) return NextResponse.json({ message: "Group not found." }, { status: 404 });
    if (group.admin.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ message: "Only the admin can add Chaudhry AI." }, { status: 403 });
    }

    const bot = await ensureChaudhryBot();
    const botId = bot._id.toString();

    if (group.members.some((m) => m.toString() === botId)) {
      const populated = await Group.findById(group._id)
        .populate("members", MEMBER_FIELDS)
        .populate("admin", MEMBER_FIELDS);
      return NextResponse.json({
        message: "Chaudhry AI is already in this group.",
        group: populated,
        alreadyMember: true,
      });
    }

    group.members.push(bot._id);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", MEMBER_FIELDS)
      .populate("admin", MEMBER_FIELDS);

    return NextResponse.json({
      message: "Chaudhry AI added. Tag @ai in chat to talk.",
      group: populated,
    });
  } catch (error) {
    console.error("Add Chaudhry error:", error);
    return NextResponse.json({ message: "Failed to add Chaudhry AI." }, { status: 500 });
  }
}

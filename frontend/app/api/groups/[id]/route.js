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
      .populate("members", "name username email avatar isBot")
      .populate("admin", "name username email avatar isBot");

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

/**
 * PATCH /api/groups/:id
 * Admin-only: update group name (and optional image)
 */
export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const group = await Group.findById(params.id);

    if (!group) {
      return NextResponse.json({ message: "Group not found." }, { status: 404 });
    }

    if (group.admin.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ message: "Only the admin can edit the group." }, { status: 403 });
    }

    const { name, image } = await request.json();

    if (name !== undefined) {
      const trimmed = String(name || "").trim();
      if (!trimmed) {
        return NextResponse.json({ message: "Group name is required." }, { status: 400 });
      }
      if (trimmed.length > 60) {
        return NextResponse.json({ message: "Group name is too long (max 60)." }, { status: 400 });
      }
      group.name = trimmed;
    }

    if (image !== undefined) {
      group.image = String(image || "").trim();
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate("members", "name username email avatar isBot")
      .populate("admin", "name username email avatar isBot");

    return NextResponse.json({ message: "Group updated.", group: populated });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ message: "Failed to update group." }, { status: 500 });
  }
}

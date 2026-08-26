import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/lib/models/PushSubscription";
import { requireAuth } from "@/lib/auth";

/** Remove push subscription */
export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { endpoint } = await request.json();

    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: auth.user._id });
    } else {
      await PushSubscription.deleteMany({ userId: auth.user._id });
    }

    return NextResponse.json({ message: "Unsubscribed." });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ message: "Failed to unsubscribe." }, { status: 500 });
  }
}

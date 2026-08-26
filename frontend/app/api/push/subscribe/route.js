import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/lib/models/PushSubscription";
import { requireAuth } from "@/lib/auth";

/** Save browser push subscription for the logged-in user */
export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { endpoint, keys } = body.subscription || body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ message: "Invalid subscription." }, { status: 400 });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: auth.user._id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: request.headers.get("user-agent") || "",
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Subscribed to notifications." });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ message: "Failed to subscribe." }, { status: 500 });
  }
}

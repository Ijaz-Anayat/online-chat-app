import { NextResponse } from "next/server";

/** Public VAPID key for browser PushManager.subscribe() */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  if (!publicKey) {
    return NextResponse.json(
      { message: "Push notifications are not configured." },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}

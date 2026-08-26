import { NextResponse } from "next/server";
import { requireAuth, publicUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return NextResponse.json({ user: publicUser(auth.user) });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieOptions } from "@/lib/auth";

export async function POST() {
  cookies().set("token", "", { ...getCookieOptions(), maxAge: 0 });
  return NextResponse.json({ message: "Logged out successfully." });
}

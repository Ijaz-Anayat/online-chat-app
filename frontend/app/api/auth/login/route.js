import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { signToken, getCookieOptions, publicUser } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectDB();
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json({ message: "Login and password are required." }, { status: 400 });
    }

    const user = await User.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login.toLowerCase() }],
    }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
    }

    cookies().set("token", signToken(user._id), getCookieOptions());

    return NextResponse.json({ message: "Logged in successfully.", user: publicUser(user) });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Server error during login." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { signToken, getCookieOptions, publicUser } from "@/lib/auth";
import { ensureChaudhryContact } from "@/lib/chaudhry";

export async function POST(request) {
  try {
    await connectDB();
    const { name, username, email, password } = await request.json();

    if (!name || !username || !email || !password) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? "Email" : "Username";
      return NextResponse.json({ message: `${field} is already taken.` }, { status: 400 });
    }

    const user = await User.create({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
    });

    try {
      await ensureChaudhryContact(user._id);
    } catch (err) {
      console.error("Failed to add Chaudhry contact:", err);
    }

    cookies().set("token", signToken(user._id), getCookieOptions());

    return NextResponse.json(
      { message: "Account created successfully.", user: publicUser(user) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ message: "Server error during signup." }, { status: 500 });
  }
}

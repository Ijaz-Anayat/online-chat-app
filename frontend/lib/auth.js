import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import User from "./models/User";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret";

export function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** Read authenticated user from httpOnly JWT cookie */
export async function getAuthUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await connectDB();
    const user = await User.findById(decoded.id).select("-password");
    return user;
  } catch {
    return null;
  }
}

/** Return 401 JSON if not logged in */
export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { error: Response.json({ message: "Not authenticated. Please log in." }, { status: 401 }) };
  }
  return { user };
}

export function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
  };
}

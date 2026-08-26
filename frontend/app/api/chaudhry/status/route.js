import { NextResponse } from "next/server";
import { getChaudhryProvider } from "@/lib/chaudhry";

export async function GET() {
  const provider = getChaudhryProvider();
  return NextResponse.json({
    provider,
    smart: provider !== "local",
    hint:
      provider === "local"
        ? "Add GROQ_API_KEY or GEMINI_API_KEY for real AI replies."
        : `Using ${provider} for Chaudhry replies.`,
  });
}

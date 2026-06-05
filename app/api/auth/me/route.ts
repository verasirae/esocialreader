import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ user: null });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in logout:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

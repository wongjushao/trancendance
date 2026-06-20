import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") ?? "";

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid request body.",
      });
    }

    const upstreamResponse = await fetch("https://org-service:5003/users/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
    });

    const upstreamData = await upstreamResponse.json().catch(() => null);

    if (upstreamResponse.ok) {
      return NextResponse.json(upstreamData ?? { success: true });
    }

    const message =
      (upstreamData && (upstreamData.error || upstreamData.message)) ||
      "Failed to enroll student.";

    return NextResponse.json({ success: false, error: message });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Failed to enroll student. Please try again.",
    });
  }
}

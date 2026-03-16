import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=no_code", request.url));
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      "https://www.strava.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID || "",
          client_secret: process.env.STRAVA_CLIENT_SECRET || "",
          code,
          grant_type: "authorization_code",
        }),
      }
    );

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL("/dashboard?error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // In production: store tokens securely (encrypted in DB, associated with user wallet)
    // For hackathon demo: redirect with success flag
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("fitness", "strava");
    redirectUrl.searchParams.set("connected", "true");

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?error=auth_failed", request.url)
    );
  }
}

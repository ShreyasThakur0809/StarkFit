import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=no_code", request.url));
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google-fit/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL("/dashboard?error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // In production: store tokens securely (encrypted in DB, associated with user wallet)
    // For hackathon demo: redirect with success flag
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("fitness", "google_fit");
    redirectUrl.searchParams.set("connected", "true");

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?error=auth_failed", request.url)
    );
  }
}

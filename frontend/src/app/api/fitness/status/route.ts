import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const googleToken = request.cookies.get("google_fit_token")?.value;
  const stravaToken = request.cookies.get("strava_token")?.value;

  return NextResponse.json({
    google_fit: !!googleToken,
    strava: !!stravaToken,
    connected: !!googleToken || !!stravaToken,
    source: googleToken ? "google_fit" : stravaToken ? "strava" : null,
  });
}

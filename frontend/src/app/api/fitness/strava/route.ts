import { NextRequest, NextResponse } from "next/server";

// Strava API integration for step/activity data
const STRAVA_API = "https://www.strava.com/api/v3";

// Strava doesn't directly track steps, but we can estimate from walking/running activities
// Average: ~1,300 steps per km walked, ~1,400 steps per km run
const STEPS_PER_KM_WALK = 1300;
const STEPS_PER_KM_RUN = 1400;

export async function POST(request: NextRequest) {
  try {
    const { accessToken, date } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 }
      );
    }

    // Fetch activities for the given date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const response = await fetch(
      `${STRAVA_API}/athlete/activities?after=${Math.floor(startDate.getTime() / 1000)}&before=${Math.floor(endDate.getTime() / 1000)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Strava data" },
        { status: response.status }
      );
    }

    const activities = await response.json();
    let estimatedSteps = 0;

    for (const activity of activities) {
      const distanceKm = (activity.distance || 0) / 1000;
      const type = activity.type?.toLowerCase();

      if (type === "walk" || type === "hike") {
        estimatedSteps += Math.round(distanceKm * STEPS_PER_KM_WALK);
      } else if (type === "run" || type === "trail_run") {
        estimatedSteps += Math.round(distanceKm * STEPS_PER_KM_RUN);
      }
    }

    return NextResponse.json({
      steps: estimatedSteps,
      date,
      source: "strava",
      activitiesCount: activities.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

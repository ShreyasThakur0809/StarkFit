import { NextRequest, NextResponse } from "next/server";

// Google Fit OAuth callback and step data fetcher
// In production: exchange auth code for tokens, then fetch step data

const GOOGLE_FIT_API = "https://www.googleapis.com/fitness/v1/users/me";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, date } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 }
      );
    }

    // Fetch step count from Google Fit
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);

    const response = await fetch(
      `${GOOGLE_FIT_API}/dataset:aggregate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.step_count.delta",
              dataSourceId:
                "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
            },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google Fit data" },
        { status: response.status }
      );
    }

    const data = await response.json();
    let steps = 0;

    if (data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal) {
      steps = data.bucket[0].dataset[0].point[0].value[0].intVal;
    }

    return NextResponse.json({ steps, date, source: "google_fit" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { RpcProvider, Account } from "starknet";

const STARKFIT_CONTRACT =
  process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC ||
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/5sF0mkfo834fgZ0BVRo1ubDqYLuCRcSm";

export async function POST(request: NextRequest) {
  try {
    const { challengeId, playerAddress, date } = await request.json();

    if (!challengeId || !playerAddress) {
      return NextResponse.json(
        { error: "Missing challengeId or playerAddress" },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split("T")[0];

    // Determine which fitness source is connected (check cookies)
    const googleToken = request.cookies.get("google_fit_token")?.value;
    const stravaToken = request.cookies.get("strava_token")?.value;

    let steps = 0;
    let source = "none";

    if (googleToken) {
      // Fetch from Google Fit
      source = "google_fit";
      const startTime = new Date(targetDate);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(targetDate);
      endTime.setHours(23, 59, 59, 999);

      const response = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleToken}`,
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

      if (response.ok) {
        const data = await response.json();
        steps =
          data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      }
    } else if (stravaToken) {
      // Fetch from Strava
      source = "strava";
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(startDate.getTime() / 1000)}&before=${Math.floor(endDate.getTime() / 1000)}`,
        { headers: { Authorization: `Bearer ${stravaToken}` } }
      );

      if (response.ok) {
        const activities = await response.json();
        for (const activity of activities) {
          const distanceKm = (activity.distance || 0) / 1000;
          const type = activity.type?.toLowerCase();
          if (type === "walk" || type === "hike") {
            steps += Math.round(distanceKm * 1300);
          } else if (type === "run" || type === "trail_run") {
            steps += Math.round(distanceKm * 1400);
          }
        }
      }
    } else {
      return NextResponse.json(
        {
          error:
            "No fitness source connected. Connect Google Fit or Strava first.",
        },
        { status: 400 }
      );
    }

    // Calculate the day number relative to challenge start
    // The oracle will verify and auto-eliminate if steps < goal
    const dayNumber = Math.max(
      1,
      Math.ceil(
        (new Date(targetDate).getTime() - Date.now()) / 86400000 + 1
      )
    );

    // Submit steps on-chain via oracle
    const oracleKey = process.env.ORACLE_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    const oracleAddr = process.env.ORACLE_ADDRESS || process.env.DEPLOYER_ADDRESS;

    if (!oracleKey || !oracleAddr) {
      // No oracle configured — return data without on-chain submission
      return NextResponse.json({
        challengeId,
        playerAddress,
        date: targetDate,
        steps,
        source,
        submitted: false,
        message: "Oracle not configured. Steps fetched but not submitted on-chain.",
      });
    }

    try {
      const provider = new RpcProvider({ nodeUrl: RPC_URL });
      const oracle = new Account({ provider, address: oracleAddr, signer: oracleKey });

      const tx = await oracle.execute([
        {
          contractAddress: STARKFIT_CONTRACT,
          entrypoint: "submit_steps",
          calldata: [
            challengeId.toString(),
            playerAddress,
            steps.toString(),
            dayNumber.toString(),
          ],
        },
      ]);

      return NextResponse.json({
        challengeId,
        playerAddress,
        date: targetDate,
        steps,
        source,
        submitted: true,
        txHash: tx.transaction_hash,
      });
    } catch (txErr: any) {
      // Return steps data even if on-chain submission fails
      return NextResponse.json({
        challengeId,
        playerAddress,
        date: targetDate,
        steps,
        source,
        submitted: false,
        error: txErr.message?.slice(0, 200),
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

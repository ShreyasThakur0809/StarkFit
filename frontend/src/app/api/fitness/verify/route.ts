import { NextRequest, NextResponse } from "next/server";

// Step verification endpoint
// Called by a cron job or manually to verify a player's daily steps
// and submit the result to the Starknet contract via the oracle

const STEP_GOAL = 7000;

export async function POST(request: NextRequest) {
  try {
    const { challengeId, playerAddress, source, accessToken, date } =
      await request.json();

    // Validate inputs
    if (!challengeId || !playerAddress || !source || !accessToken || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch steps from the appropriate source
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const fitnessResponse = await fetch(
      `${baseUrl}/api/fitness/${source === "google_fit" ? "google-fit" : "strava"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, date }),
      }
    );

    if (!fitnessResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch fitness data" },
        { status: 500 }
      );
    }

    const { steps } = await fitnessResponse.json();
    const passed = steps >= STEP_GOAL;

    // In production: use the oracle private key to submit a transaction
    // to the Starknet contract calling submit_steps()
    //
    // const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC });
    // const oracle = new Account(provider, oracleAddress, oraclePrivateKey);
    // const contract = new Contract(abi, contractAddress, oracle);
    // await contract.submit_steps(challengeId, playerAddress, steps, dayNumber);

    return NextResponse.json({
      challengeId,
      playerAddress,
      date,
      steps,
      stepGoal: STEP_GOAL,
      passed,
      source,
      // txHash: "0x..." // would include actual tx hash in production
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

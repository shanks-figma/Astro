import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    const body = await request.text();

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    // Webhook logging logic
    console.log("Received simulated Razorpay Webhook notification:", body);

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

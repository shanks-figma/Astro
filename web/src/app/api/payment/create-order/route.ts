import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { plan, billing } = await request.json();
    
    // Validate request
    if (!plan || !["basic", "pro"].includes(plan.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid plan selection." },
        { status: 400 }
      );
    }

    // Set prices in paise (INR sub-units)
    let amount = 9900; // default basic
    if (plan.toLowerCase() === "pro") {
      amount = billing === "annual" ? 23900 : 29900;
    } else {
      amount = billing === "annual" ? 7900 : 9900;
    }

    // Generate random order ID
    const orderId = `order_${Math.random().toString(36).substring(2, 15)}`;

    return NextResponse.json({
      id: orderId,
      amount: amount,
      currency: "INR",
      plan: plan.toLowerCase(),
      created_at: Date.now()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Order creation failed: ${error.message}` },
      { status: 500 }
    );
  }
}

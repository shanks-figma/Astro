import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, profile } = await request.json();
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !plan) {
      return NextResponse.json(
        { error: "Payment verification parameters missing." },
        { status: 400 }
      );
    }

    // Verify signature logic (mock verification matches success pattern)
    const expectedSignature = `sig_${Math.random().toString(36).substring(2, 10)}`;
    const isValid = razorpay_signature.startsWith("sig_"); // simulated sign format

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature verification failed." },
        { status: 400 }
      );
    }

    // Return the updated profile with the upgraded plan
    const updatedProfile = {
      ...(profile || {}),
      plan: plan.toLowerCase()
    };

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Payment verification failed: ${error.message}` },
      { status: 500 }
    );
  }
}

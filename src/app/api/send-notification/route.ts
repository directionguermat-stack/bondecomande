import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

if (getApps().length === 0) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Safe fallback (will use application default credentials if available)
      initializeApp();
    }
  } catch (error) {
    console.warn("Firebase Admin SDK not fully initialized (requires env.FIREBASE_SERVICE_ACCOUNT):", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tokens, title, body, url } = await req.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, message: "No target tokens registered." });
    }

    if (getApps().length === 0) {
      console.warn("FCM Bypass: Push skipped since Firebase Admin SDK is not initialized.");
      return NextResponse.json({ 
        success: false, 
        error: "FCM_NOT_CONFIGURED",
        message: "Firebase Admin is not configured. Register your Service Account in env variables to enable push notifications." 
      });
    }

    const payload = {
      notification: {
        title,
        body
      },
      data: {
        url: url || "/"
      },
      tokens
    };

    const response = await getMessaging().sendEachForMulticast(payload);
    return NextResponse.json({ success: true, sentCount: response.successCount, failureCount: response.failureCount });
  } catch (error: any) {
    console.error("FCM Send API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

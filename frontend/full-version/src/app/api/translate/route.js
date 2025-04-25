import { NextResponse } from "next/server";

// We read your existing DEEPL_AUTH_KEY from process.env
const DEEPL_AUTH_KEY = process.env.DEEPL_AUTH_KEY;

export async function POST(request) {
  try {
    const { text, to } = await request.json();
    if (!text || !to) {
      return NextResponse.json(
        { error: "Missing `text` or `to` in request body" },
        { status: 400 }
      );
    }

    if (!DEEPL_AUTH_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing DEEPL_AUTH_KEY" },
        { status: 500 }
      );
    }

    // DeepL wants uppercase target codes (e.g. "EN", "DE", "FR", …)
    const targetLang = to.toUpperCase();

    const params = new URLSearchParams();
    params.append("auth_key", DEEPL_AUTH_KEY);
    params.append("text", text);
    params.append("target_lang", targetLang);

    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error("DeepL error:", details);
      return NextResponse.json(
        { error: "DeepL translation failed", details },
        { status: res.status }
      );
    }

    const data = await res.json();
    const translation = data.translations?.[0]?.text || "";

    return NextResponse.json({ translation });
  } catch (err) {
    console.error("Unexpected error in /api/translate:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

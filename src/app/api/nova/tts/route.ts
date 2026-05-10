import { NextRequest } from "next/server";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";

type TtsEmotion = "happy" | "thinking" | "excited" | "concerned";

function voiceSettingsForEmotion(emotion: TtsEmotion | undefined) {
  switch (emotion) {
    case "excited":
      return {
        stability: 0.35,
        similarity_boost: 0.82,
        style: 0.55,
        speed: 1.06,
        use_speaker_boost: true,
      };
    case "concerned":
      return {
        stability: 0.58,
        similarity_boost: 0.74,
        style: 0.22,
        speed: 0.9,
        use_speaker_boost: true,
      };
    case "thinking":
      return {
        stability: 0.52,
        similarity_boost: 0.72,
        style: 0.28,
        speed: 0.94,
        use_speaker_boost: true,
      };
    default:
      return {
        stability: 0.45,
        similarity_boost: 0.78,
        style: 0.38,
        speed: 1,
        use_speaker_boost: true,
      };
  }
}

function isTtsEmotion(s: string): s is TtsEmotion {
  return (
    s === "happy" ||
    s === "thinking" ||
    s === "excited" ||
    s === "concerned"
  );
}

/** Whether ElevenLabs TTS is configured (no secrets exposed). */
export async function GET() {
  const enabled =
    !!process.env.ELEVENLABS_API_KEY?.trim() &&
    !!process.env.ELEVENLABS_VOICE_ID?.trim();
  return Response.json(
    { enabled },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!apiKey || !voiceId) {
    return Response.json({ error: "TTS not configured" }, { status: 503 });
  }

  let body: { text?: string; emotion?: string };
  try {
    body = (await req.json()) as { text?: string; emotion?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.text?.trim() ?? "";
  if (!raw) {
    return Response.json({ error: "No text" }, { status: 400 });
  }
  if (raw.length > 2500) {
    return Response.json({ error: "Text too long" }, { status: 400 });
  }

  const cleaned = raw
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\n/g, " ")
    .trim();

  const emotion =
    body.emotion && isTtsEmotion(body.emotion) ? body.emotion : "happy";

  const modelId =
    process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

  try {
    const upstream = await fetch(`${ELEVEN_API}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleaned,
        model_id: modelId,
        voice_settings: voiceSettingsForEmotion(emotion),
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("ElevenLabs TTS error:", upstream.status, errText);
      return Response.json({ error: "Upstream TTS failed" }, { status: 502 });
    }

    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("ElevenLabs TTS exception:", e);
    return Response.json({ error: "TTS failed" }, { status: 502 });
  }
}

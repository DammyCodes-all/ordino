import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  language: z.string().trim().min(2).max(16).optional(),
});

function voiceForLanguage(language?: string) {
  const base = (language || "en").toLowerCase().slice(0, 2);
  const map: Record<string, string> = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    it: "it",
    pt: "pt",
    ha: "ha",
  };
  return map[base] ?? "en";
}

async function synthesizeWithEspeak(text: string, language?: string) {
  const wavPath = join(tmpdir(), `ordino-tts-${randomUUID()}.wav`);
  const voice = voiceForLanguage(language);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "espeak-ng",
      ["-v", voice, "-w", wavPath, "--", text],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `espeak-ng exited with ${code}`));
    });
  });

  try {
    return await readFile(wavPath);
  } finally {
    await unlink(wavPath).catch(() => undefined);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { code: "INVALID_REQUEST", message: "Invalid TTS payload." },
        { status: 400 },
      );
    }

    const wav = await synthesizeWithEspeak(
      parsed.data.text.slice(0, 4_000),
      parsed.data.language,
    );

    return new Response(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        code: "TTS_UNAVAILABLE",
        message:
          message.includes("ENOENT")
            ? "espeak-ng is not installed on the server."
            : message,
      },
      { status: 503 },
    );
  }
}

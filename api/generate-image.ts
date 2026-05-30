import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const config = { runtime: "edge" };

function buildPrompt(
  childName: string,
  aspiration: string,
  subject: string,
  problem: string,
  selfDescription: string,
): string {
  return [
    `Vibrant, joyful digital illustration for a child named ${childName} in India.`,
    `They dream of becoming a ${aspiration}.`,
    `They love ${subject} and want to help with ${problem} in the world.`,
    `They are ${selfDescription}.`,
    `Style: warm, colorful, uplifting, hopeful. Celebrating a child's potential and dreams.`,
    `No text or writing anywhere in the image. Square composition.`,
  ].join(" ");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const openaiKey = process.env.OPENAI_API_KEY!;

  if (!supabaseUrl || !serviceKey || !openaiKey) {
    return json({ error: "Server misconfiguration" }, 500);
  }

  let body: {
    registrationId: string;
    childName: string;
    aspiration: string;
    subject: string;
    problem: string;
    selfDescription: string;
  };

  try {
    body = await (req as Request).json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { registrationId, childName, aspiration, subject, problem, selfDescription } = body;
  if (!registrationId) return json({ error: "registrationId required" }, 400);

  const openai = new OpenAI({ apiKey: openaiKey });

  // Generate image with DALL-E 3
  let dalleUrl: string;
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: buildPrompt(
        childName || "a child",
        aspiration || "something great",
        subject || "learning",
        problem || "the world",
        selfDescription || "brave",
      ),
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });
    dalleUrl = response.data[0].url!;
  } catch (err) {
    console.error("DALL-E error:", err);
    return json({ error: "Image generation failed" }, 500);
  }

  // Download and upload to Supabase Storage
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let publicUrl: string;
  try {
    const imgResponse = await fetch(dalleUrl);
    const buffer = await imgResponse.arrayBuffer();

    const fileName = `${registrationId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("dream-cards")
      .upload(fileName, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("dream-cards").getPublicUrl(fileName);
    publicUrl = data.publicUrl;
  } catch (err) {
    console.error("Storage error:", err);
    return json({ error: "Failed to store image" }, 500);
  }

  // Mark card generated + store image URL
  await supabase
    .from("parent_registrations")
    .update({ card_generated: true, image_url: publicUrl })
    .eq("id", registrationId);

  return json({ imageUrl: publicUrl }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

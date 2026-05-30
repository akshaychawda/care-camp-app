import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const config = { runtime: "edge" };

function buildPrompt(
  childName: string,
  gender: string,
  aspiration: string,
  subject: string,
  problem: string,
  selfDescription: string,
): string {
  const genderDesc = gender === "girl" ? "young Indian girl" : gender === "boy" ? "young Indian boy" : "young Indian child";
  const pronoun = gender === "girl" ? "her" : gender === "boy" ? "his" : "their";
  return [
    `A vibrant, joyful digital illustration of a ${genderDesc} named ${childName} living ${pronoun} dream.`,
    `The child is shown as a ${aspiration} — depict them actively in this role or clearly on the path to it.`,
    `They love ${subject}: weave this into the scene naturally.`,
    `They want to help with ${problem} in the world — let the image feel purposeful and hopeful.`,
    `They are ${selfDescription}.`,
    `Style: warm Indian colors, uplifting digital art, empowering and celebratory mood.`,
    `Make the aspiration visually unmistakable in the scene.`,
    `No text, letters, or writing anywhere in the image. Square composition.`,
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
    gender: string;
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

  const { registrationId, childName, gender, aspiration, subject, problem, selfDescription } = body;
  if (!registrationId) return json({ error: "registrationId required" }, 400);

  const openai = new OpenAI({ apiKey: openaiKey });

  // Generate image + caption in parallel
  let dalleUrl: string;
  let caption: string;
  try {
    const [imageResponse, captionResponse] = await Promise.all([
      openai.images.generate({
        model: "dall-e-3",
        prompt: buildPrompt(
          childName || "a child",
          gender || "child",
          aspiration || "something great",
          subject || "learning",
          problem || "the world",
          selfDescription || "brave",
        ),
        size: "1024x1024",
        quality: "standard",
        n: 1,
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Write one short, poetic, inspiring sentence (under 20 words) about a child named ${childName || "this child"} who dreams of becoming a ${aspiration || "changemaker"} and wants to help with ${problem || "the world"}. Use their first name. Make it uplifting and beautiful.`,
          },
        ],
        max_tokens: 60,
      }),
    ]);
    dalleUrl = imageResponse.data[0].url!;
    caption = captionResponse.choices[0].message.content?.trim().replace(/^["']|["']$/g, "") ?? "";
  } catch (err) {
    console.error("Generation error:", err);
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

  return json({ imageUrl: publicUrl, caption }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

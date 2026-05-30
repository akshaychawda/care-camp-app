import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const config = { runtime: "edge" };

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

  const name = childName || "a child";
  const genderWord = gender === "girl" ? "girl" : gender === "boy" ? "boy" : "child";

  const openai = new OpenAI({ apiKey: openaiKey });

  // Step 1: GPT designs a concrete scene + writes the caption
  let scenePrompt: string;
  let caption: string;
  try {
    const plan = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You design image prompts for DALL-E and write captions for children's dream cards at community events in India. Output only valid JSON.",
        },
        {
          role: "user",
          content: `Child details:
- Name: ${name}
- Gender: ${genderWord}
- Wants to become: ${aspiration || "someone great"}
- Loves: ${subject || "learning"}
- Wants to fix: ${problem || "problems in the world"}
- One word to describe themselves: ${selfDescription || "brave"}

Task 1 — scene_prompt: Write a 60–80 word DALL-E image prompt.
Rules:
- Show the ${genderWord} ACTIVELY doing their job RIGHT NOW, not wishing or reaching for stars
- Describe the exact setting, what they are doing, what objects are around them
- Weave in their love for "${subject}" visually somewhere in the scene
- Indian cultural context — clothing, environment, people
- Warm, vibrant, joyful, celebratory digital art
- End with: "No text or writing anywhere. Square composition."

Task 2 — caption: One beautiful, poetic sentence under 20 words. Use the child's name ${name}. Reference their aspiration and the change they'll make. Avoid clichés like "reach for the stars".

Respond with JSON: {"scene_prompt": "...", "caption": "..."}`,
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(plan.choices[0].message.content ?? "{}");
    scenePrompt = parsed.scene_prompt ?? "";
    caption = (parsed.caption ?? "").replace(/^["']|["']$/g, "");
  } catch (err) {
    console.error("GPT planning error:", err);
    // Fallback prompt if GPT fails
    scenePrompt = `A vibrant scene of a ${genderWord} in India actively working as a ${aspiration || "changemaker"}, surrounded by elements of ${subject || "their passion"}. Warm Indian colors, joyful atmosphere. No text. Square composition.`;
    caption = "";
  }

  // Step 2: DALL-E generates the image using the scene GPT designed
  let dalleUrl: string;
  try {
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: scenePrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });
    dalleUrl = imageResponse.data[0].url!;
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

  return json({ imageUrl: publicUrl, caption }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

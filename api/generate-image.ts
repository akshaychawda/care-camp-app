import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Node.js runtime — no 25s Edge cap; Vercel Pro allows up to 300s
export const config = { maxDuration: 120 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const openaiKey = process.env.OPENAI_API_KEY!;

  if (!supabaseUrl || !serviceKey || !openaiKey) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { registrationId, childName, gender, aspiration, subject, problem, selfDescription } =
    req.body ?? {};

  if (!registrationId) return res.status(400).json({ error: "registrationId required" });

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
            "You design image prompts and write captions for children's dream cards at community events in India. Output only valid JSON.",
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

Task 1 — scene_prompt: Write a 60–80 word image prompt.
Rules:
- Show the ${genderWord} ACTIVELY doing their job RIGHT NOW — not dreaming, not wishing, not reaching for stars
- Describe the exact setting, what they are doing, specific objects around them
- Weave in their love for "${subject}" visually somewhere in the scene
- Indian cultural context — clothing, environment
- Style: soft watercolor illustration, children's book style, painterly brushstrokes, warm muted palette, gentle and dreamy, slightly stylized figures — NOT photorealistic, NOT 3D render, NOT cartoon
- End with: "No text or writing anywhere. Square composition."

Task 2 — caption: One beautiful, poetic sentence under 20 words. Use ${name}. Reference their aspiration and the difference they will make. No clichés.

Respond with JSON only: {"scene_prompt": "...", "caption": "..."}`,
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(plan.choices[0].message.content ?? "{}");
    scenePrompt = parsed.scene_prompt ?? "";
    caption = (parsed.caption ?? "").replace(/^["']|["']$/g, "");
    console.log("Scene prompt:", scenePrompt);
    console.log("Caption:", caption);
  } catch (err) {
    console.error("GPT planning error:", err);
    scenePrompt = `A vibrant scene of a ${genderWord} in India actively working as a ${aspiration || "changemaker"}, surrounded by elements of ${subject || "their passion"}. Warm Indian colors, joyful atmosphere. No text. Square composition.`;
    caption = "";
  }

  // Step 2: Generate the image
  let imageBuffer: Buffer;
  try {
    const imageResponse = await openai.images.generate({
      model: "gpt-image-2",
      prompt: scenePrompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    });
    const b64 = imageResponse.data[0].b64_json!;
    imageBuffer = Buffer.from(b64, "base64");
  } catch (err) {
    console.error("Image generation error:", err);
    return res.status(500).json({ error: "Image generation failed" });
  }

  // Step 3: Upload to Supabase Storage
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let publicUrl: string;
  try {
    const fileName = `${registrationId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("dream-cards")
      .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("dream-cards").getPublicUrl(fileName);
    publicUrl = data.publicUrl;
  } catch (err) {
    console.error("Storage error:", err);
    return res.status(500).json({ error: "Failed to store image" });
  }

  // Step 4: Mark card generated
  await supabase
    .from("parent_registrations")
    .update({ card_generated: true, image_url: publicUrl })
    .eq("id", registrationId);

  return res.status(200).json({ imageUrl: publicUrl, caption });
}

import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { topic, audience, length, tone, style, language } = req.body || {};

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
    }

    const client = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert YouTube scriptwriter who creates high-retention videos.

Create a complete YouTube content package for this video:

TOPIC: ${topic}
TARGET AUDIENCE: ${audience || "General audience"}
VIDEO LENGTH: ${length || "8-12 minutes"}
TONE: ${tone || "Entertaining and informative"}
STYLE: ${style || "Talking head"}
LANGUAGE: ${language || "English"}`;

    const interaction = await client.interactions.create({
      model: "gemini-2.5-flash",
      input: prompt,
      store: false,
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
        },
      ],
    });

    const data = JSON.parse(interaction.output_text);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Execution Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate script" });
  }
}


import { GoogleGenAI } from "@google/genai";

export async function handler(event) {
  // 1. Setup CORS Headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // 2. Handle CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // 3. Reject non-POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // 4. Parse request body
    const body = JSON.parse(event.body || "{}");
    const { topic, audience, length, tone, style, language } = body;

    if (!topic || !topic.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Topic is required" }),
      };
    }

    // 5. Read API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "API key missing. Add GEMINI_API_KEY in Netlify Environment Variables.",
        }),
      };
    }

    // 6. Initialize Google GenAI Client
    const client = new GoogleGenAI({ apiKey });

    // 7. Prompt Engineering
    const prompt = `You are an expert YouTube scriptwriter who creates high-retention videos.

Create a complete YouTube content package for this video:

TOPIC: ${topic}
TARGET AUDIENCE: ${audience || "General audience"}
VIDEO LENGTH: ${length || "8-12 minutes"}
TONE: ${tone || "Entertaining and informative"}
STYLE: ${style || "Talking head"}
LANGUAGE: ${language || "English"}

RULES:
- Write in natural spoken language easy to say out loud.
- Strong curiosity hook in the first 10 seconds.
- Use open loops and pattern interrupts to keep retention high.
- Include clear timestamps for sections.`;

    // 8. Create Interaction with Structured JSON Response
    const interaction = await client.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
      store: false, // Set to false if you don't need server-side history for stateless function execution
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              titles: {
                type: "array",
                items: { type: "string" },
              },
              description: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" },
              },
              script: {
                type: "object",
                properties: {
                  hook: { type: "string" },
                  intro: { type: "string" },
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        timestamp: { type: "string" },
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["timestamp", "title", "content"],
                    },
                  },
                  cta: { type: "string" },
                  outro: { type: "string" },
                },
                required: ["hook", "intro", "sections", "cta", "outro"],
              },
            },
            required: ["titles", "description", "tags", "script"],
          },
        },
      ],
    });

    // 9. Extract and parse JSON output
    const data = JSON.parse(interaction.output_text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Gemini Interaction Execution Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Failed to generate script. Please try again later.",
      }),
    };
  }
}

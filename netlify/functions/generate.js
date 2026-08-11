const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
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

    // 6. Initialize Gemini Model (Updated to gemini-2.0-flash)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json", // Enforces strict JSON output
      },
    });

    // 7. Prompt Engineering
    const prompt = `You are an expert YouTube scriptwriter who creates high-retention videos.

Create a complete YouTube content package for this video:

TOPIC: ${topic}
TARGET AUDIENCE: ${audience || "General audience"}
VIDEO LENGTH: ${length || "8-12 minutes"}
TONE: ${tone || "Entertaining and informative"}
STYLE: ${style || "Talking head"}
LANGUAGE: ${language || "English"}

Return JSON matching this exact structure:

{
  "titles": [
    "Title option 1 with curiosity and benefit",
    "Title option 2 with curiosity and benefit",
    "Title option 3 with curiosity and benefit"
  ],
  "description": "Full SEO-optimized YouTube description. Include short summary, timestamps if possible, CTA, and 3-4 hashtags.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"],
  "script": {
    "hook": "Powerful 5-15 second hook creating curiosity or tension.",
    "intro": "Short intro expanding the hook and promising value.",
    "sections": [
      {
        "timestamp": "0:45",
        "title": "Section name",
        "content": "Full spoken script for this section using short conversational sentences."
      }
    ],
    "cta": "Natural call-to-action before the end.",
    "outro": "Short memorable outro reinforcing the main takeaway."
  }
}

RULES:
- Write in natural spoken language easy to say out loud.
- Strong curiosity hook in the first 10 seconds.
- Use open loops and pattern interrupts to keep retention high.
- Include clear timestamps for sections.`;

    // 8. Generate Content
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 9. Parse and return JSON
    const data = JSON.parse(responseText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("Gemini Execution Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Failed to generate script. Please try again later.",
      }),
    };
  }
};

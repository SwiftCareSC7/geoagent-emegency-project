import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { getNewRoute } from "./geoAgent.tools.js";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function testAgent() {
  const getNewRouteTool = {
    name: "getNewRoute",
    description:
      "Find alternative routes for an emergency ambulance when the current route is affected by traffic or an incident.",
    parameters: {
      type: "object",
      properties: {},
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents:
      "An ambulance is stuck in heavy traffic. Find alternative routes.",
    config: {
      tools: [
        {
          functionDeclarations: [getNewRouteTool],
        },
      ],
    },
  });

  const functionCall = response.functionCalls?.[0];

  if (functionCall?.name === "getNewRoute") {
    const result = getNewRoute();

    console.log("Gemini requested:", functionCall.name);
    console.log("Route results:", result);

    const finalResponse = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are an emergency vehicle routing agent.

The ambulance needs an alternative route.

Available routes:
${JSON.stringify(result)}

Choose the best route based on ETA and traffic.

Return:
- Recommended route
- ETA
- Estimated time saved
- Short reason for your decision
              `,
            },
          ],
        },
      ],
    });

    console.log("\nAI FINAL DECISION:");
    console.log(finalResponse.text);
  }
}

testAgent();
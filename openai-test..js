import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: "./server/.env" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);

  const response = await client.responses.create({
    model: "gpt-5.6",
    input: "Reply with exactly: XPLAY OPENAI CONNECTED",
  });

  console.log(response.output_text);
}

main().catch(console.error);
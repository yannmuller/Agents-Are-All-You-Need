import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import OpenAI from "openai";
import { config } from "dotenv";
import { image_to_base64, sleep, generate_speech } from "../utils.js";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

config();

puppeteer.use(StealthPlugin());

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

const timeout = 2000;

(async () => {
  console.clear();

  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    userDataDir:
      "/Users/matthieu.minguet/Library/Application Support/Google/Chrome Canary/Default",
  });

  const messages = [
    {
      role: "system",
      content: `You are a storyteller that tell a story based on webcam screenshots.
      You will receive a screenshot of a webcam and you should tell a story based on this image. Be very creative in the answer. Maximum 20 words each time. keep the story going with previous messages.
      `,
    },
  ];

  const page = await browser.newPage();

  await page.goto("http://localhost:5500/examples/p5_webcam/", {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });

  console.clear();
  await sleep(5000);

  while (true) {
    console.log("📸 Taking a screenshot...");

    await page.screenshot({
      path: "images/screenshot.jpg",
      fullPage: true,
      omitBackground: true,
      captureBeyondViewport: false,
    });

    await sleep(2000);
    const base64_image = await image_to_base64("images/screenshot.jpg");

    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: base64_image,
          },
        },
        {
          type: "text",
          text: "Here is a the screenshot of the canvas.",
        },
      ],
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      max_tokens: 1024,
      // response_format: { type: "json_object" },
      messages: messages,
    });

    const message = response.choices[0].message;
    const message_text = message.content;

    console.log("🤖 ", message_text);

    await generate_speech(message_text, openai);
  }
})();

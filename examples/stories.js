import OpenAI from "openai";
import { config } from "dotenv";
import {
  input,
  sleep,
  image_to_base64,
  generate_speech,
  setPuppeteer,
} from "../utils.js";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

config();

const timeout = 3000;

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

(async () => {
  console.clear();
  const prompt = await input("🧑‍💻 What should i like on instagram today:");

  const spinner = await term.spinner();
  term(" Processing... ");

  //const prompt = "Content related to AI only";

  const puppeteer = await setPuppeteer();
  const page = puppeteer.page;

  const messages = [
    {
      role: "system",
      content: `You are an instagram bot. 
      I'll send you a screenshot of an Instagram story on a user's feed.
      your should only like if the content is related to the user prompt. Do not give a description of the image, just point out a small reason why you like it or not. Use a charismatic tone. Not more than 15 words.
      Please return a JSON object with the following schema. Do not include any explanations or extra text. Example of JSON:
        {
          "like": true
          "reason": "Like it! then reason why you like it..."
        }
      `,
    },
  ];

  await page.goto("https://www.instagram.com/", {
    waitUntil: "domcontentloaded",
  });

  await sleep(timeout);
  await page.click("._aauk");
  await sleep(timeout);

  while (true) {
    // PAUSE STORY
    await page.keyboard.press("Space");

    await page.screenshot({
      path: "images/screenshot.jpg",
      fullPage: true,
    });

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
          text:
            "Here is a screenshot of the story, please like it if: " + prompt,
        },
      ],
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: messages,
    });

    const message = response.choices[0].message;
    const message_text = message.content;
    const json_answer = JSON.parse(message_text);

    const like = json_answer["like"];
    const reason = json_answer["reason"];

    spinner.animate(false);
    term.reset();

    if (like) {
      // Click on like button
      const likeButton = await page.$('svg[aria-label="Like"]');

      if (likeButton)
        await page.evaluate((element) => {
          const parent = element.parentNode; // Access the parent node
          parent.click(); // Perform the click action on the parent
        }, likeButton);
    }

    term(like ? "🩷 " : "👎 ");

    await Promise.all([
      term.slowTyping(" " + reason + "\n", {
        flashStyle: term.brightWhite,
        delay: 50,
      }),
      generate_speech(reason, openai),
    ]);

    // NEXT STORY
    await page.keyboard.press("ArrowDown");
    await sleep(1000);
    await page.keyboard.press("Space");
  }
})();

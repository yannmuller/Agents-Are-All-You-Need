import OpenAI from "openai";
import { config } from "dotenv";
import {
  image_to_base64,
  sleep,
  generate_speech,
  input,
  setPuppeteer,
} from "../utils.js";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

config();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const timeout = 2000;

(async () => {
  console.clear();

  const puppeteer = await setPuppeteer();
  const page = puppeteer.page;

  // Visual prompt
  const messages = [
    {
      role: "system",
      content: `You are a web assistant that helps users to extract informations from a webpage.
      You will receive a screenshot of a webpage and you should extract informations described in user's query in this image. Be very concise in the answer. Just few sentences.
    
      Extract only the information needed by the user. Only the relevant information is needed. Do not include any other information than that.
      You can format content as lists or short sentences.
      `,
    },
  ];

  while (true) {
    const query = await input("🧑‍💻 What are you searching for :");
    console.clear();

    const spinner = await term.spinner();
    term(" Processing... ");

    await page.goto("https://www.google.com", {
      waitUntil: "domcontentloaded",
      timeout: timeout,
    });

    await sleep(timeout);

    // Remplir le champ de recherche
    await page.type("textarea[name=q]", query);

    // Cliquer sur le bouton "I'm feeling lucky"
    const feelinglucky = await page.$("input[name=btnI]");
    await page.evaluate((element) => {
      element.click();
    }, feelinglucky);

    // Attendre que la page soit chargée
    await sleep(timeout);

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
          text: "Here is a the screenshot. please extract the informations.",
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
    // const json_answer = JSON.parse(message_text);
    // const answer = json_answer["answer"];

    spinner.animate(false);
    term.reset();

    console.log("🤖 " + message_text);
  }
})();

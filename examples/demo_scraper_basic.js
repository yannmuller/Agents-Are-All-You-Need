import {
  image_to_base64,
  sleep,
  input,
  setPuppeteer,
  openai,
} from "../utils.js";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

const timeout = 2000;

(async () => {
  console.clear();

  const { page } = await setPuppeteer();

  // Visual prompt
  const messages = [
    {
      role: "system",
      content: `You are an assistant tasked with extracting specific information requested by a user from an image of a webpage. Your responses should be concise, limited to one sentence, and formatted as lists or short sentences when appropriate. Adopt a personal tone, as if you are the user's personal assistant.

      Focus on providing the relevant information related to the user's query. Avoid including any extraneous details or descriptions of the page.
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

    // Remplir le champ de recherche
    await page.type("textarea[name=q]", query);

    await sleep(timeout);

    // Trouver le bouton "I'm feeling lucky"
    const feelingLuckyButton = await page.$("input[name=btnI]");

    // // Attendre que la page soit chargée après le clic
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.evaluate((button) => button.click(), feelingLuckyButton),
    ]);

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
            "Here is a the screenshot. please find informations from user query: " +
            query,
        },
      ],
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: messages,
    });

    const message = response.choices[0].message;
    const message_text = message.content;

    spinner.animate(false);
    term.reset();

    console.log("🤖 " + message_text);
  }
})();

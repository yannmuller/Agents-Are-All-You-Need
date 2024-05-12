import express from "express";
import path from "path";
import fs from "fs";
import play from "play-sound";
import { image_to_base64, sleep, setPuppeteer, openai } from "../../utils.js";

const timeout = 2000;

const player = play({});

// Serveur express
const app = express();
const port = 9000;
app.use(express.static("./examples/p5_webcam"));
const address = `http://localhost:${port}`;
app.listen(port, () => {
  console.log(`Server running at ${address}`);
});

let initialPlay = false;
let message_text = "";

(async () => {
  console.clear();

  const { page } = await setPuppeteer();

  // Visual prompt
  const messages = [
    {
      role: "system",
      content: `You are a storyteller that tells stories based on webcam screenshots.
      You will receive a screenshot of a webcam every few seconds and you should write a story based on this image. Be very creative in the answer. Maximum 20 words each time. 
      keep the context of ongoing story from previous messages.
      `,
    },
  ];

  await page.goto(address, {
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
      messages: messages,
    });

    const message = response.choices[0].message;
    message_text = message.content;

    // On garde le contexte des réponses
    messages.push({
      role: "assistant",
      content: message_text,
    });

    // console.log("🤖 ", message_text);

    // Ne pas attendre la fin de la lecture pour générer le prochain texte
    if (initialPlay == false) {
      generateAndPlayAudio();
      initialPlay = true;
    }

    await sleep(1000);
  }
})();

let current_played_message = "";

async function generateAndPlayAudio() {
  // Si le message est le même que le précédent, on ne le joue pas
  // On attend le prochain message
  if (current_played_message == message_text) {
    initialPlay = false;
    return;
  }

  console.log("🔈 generating audio");
  const speechFile = path.resolve(`./speech.mp3`);

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: message_text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);

  console.log("playing :" + message_text);
  playAudio(speechFile);
  current_played_message = message_text;
}

function playAudio(filename) {
  player.play(filename, (err) => {
    if (err) {
      console.error("Audio playback error:", err);
      return;
    }
    console.log("Audio playback finished");
    generateAndPlayAudio();
  });
}

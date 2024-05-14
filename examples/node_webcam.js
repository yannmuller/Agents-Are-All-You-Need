import { image_to_base64, sleep, openai } from "../utils.js";
import NodeWebcam from "node-webcam";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

// You need to install
// brew install imagesnap

const opts = {
  width: 1280,
  height: 720,
  quality: 100,
  frames: 1,
  delay: 0,
  saveShots: false,
  output: "jpeg",
  device: false,
  callbackReturn: "base64", // Setting to return base64 encoded image
  verbose: false,
};

const webcam = NodeWebcam.create(opts);

(async () => {
  console.clear();

  // Visual prompt
  const messages = [
    {
      role: "system",
      content: `You are an assistant that will receive webcam images.
      If you can see a person doing thumbs up return 👍. If doing thumbs down 👎.
      Else return 🧐.
      Only answer with one emoji. Nothing else.
      `,
    },
  ];

  while (true) {
    const image = await new Promise((resolve, reject) => {
      webcam.capture("images/screenshot", (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    console.log("📸 Captured image");

    const spinner = await term.spinner();
    term(" Processing... ");

    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: image,
          },
        },
        {
          type: "text",
          text: "Here is a the screenshot",
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

    messages.push({
      role: "assistant",
      content: message_text,
    });

    spinner.animate(false);
    term.reset();

    console.log("🤖 " + message_text + "\n");
  }
})();

import express, { json } from "express";
import {
  image_to_base64,
  sleep,
  setPuppeteer,
  input,
  openai,
} from "../../utils.js";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

const timeout = 2000;

// Serveur express
const app = express();
const port = 9000;
app.use(express.static("./examples/p5_drawing"));
const address = `http://localhost:${port}`;
app.listen(port, () => {});

(async () => {
  console.clear();
  const style = await input("🎨 Select a style ");

  const { page } = await setPuppeteer();

  await page.goto(address, {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });

  // Visual prompt – Conditional drawing
  const messages = [
    {
      role: "system",
      content: `You are a drawing bot.
      I will send you screenshots of a canvas, you will have to draw something on it.
      you can draw by clicking the mouse on a specific location. Please fill the canvas. Shapes can overlap. Coordinates are in pixels and should fit the canvas size. It is the same as the screenshot size. You will receive a style to follow. you have to pick colors depending on the style. Max 4 colors. Never exceed this number. You can draw all over the canvas. Don't need to start from the top left corner. You should always return a random shapes within example values.

      After 10 iterations the drawing is done. Return "true" to JSON "finished" property and give a title first and a small reflection on the artwork to JSON "thought" property. Otherwise return "false" to "finished" property. 
      
      return the JSON object with the following example format:
      {
        position: {
          x: 100, // This is an example
          y: 100 // This is an example
        }
        color: "red", // Example color values for mondrian style: "#ff0000", "#0000ff", "#ffff00", "#ffffff"
        shape: "square" // Only possible shape values: "square", "circle", "triangle", "half_circle"
        thought: "Let's draw a red rectangle here. seems like a good spot."
        finished: false
      }
      Use a creative tone in your thoughts. Maximum 20 words each time. You can sometimes reflect to the whole composition to give a thought about the global aspect.
      `,
    },
  ];

  await page.goto(address, {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });

  console.clear();

  while (true) {
    // console.log("📸 Taking a screenshot...");
    const spinner = await term.spinner();
    term(" Processing... ");

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
          text:
            "Here is a the screenshot of the canvas. draw somewhere on it with the color scheme style: " +
            style,
        },
      ],
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: messages,
      response_format: { type: "json_object" },
    });

    const message = response.choices[0].message;
    const message_text = message.content;
    const json_answer = JSON.parse(message_text);

    //console.log("🤖 ", json_answer);

    // on garde le contexte des anciennes opérations
    messages.push({
      role: "assistant",
      content: message_text,
    });

    console.log(message_text);

    const position = json_answer["position"];
    const color = json_answer["color"];
    const shape = json_answer["shape"];
    const thought = json_answer["thought"];
    const finished = json_answer["finished"];

    // Changer les variables dans le contexte de la page
    await page.evaluate(
      (color, shape) => {
        pcolor = color;
        pshape = shape;
      },
      color,
      shape
    );

    // Dessiner la forme
    if (position) await page.mouse.click(position.x, position.y);

    spinner.animate(false);
    term.reset();
    console.clear();

    term("👨‍🎨 ");

    await term.slowTyping(thought + "\n", {
      flashStyle: term.brightWhite,
      delay: 40,
    });

    await sleep(500);

    if (finished === true) break;
  }
})();

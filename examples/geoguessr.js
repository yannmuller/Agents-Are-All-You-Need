import {
  image_to_base64,
  sleep,
  generate_speech,
  setPuppeteer,
  openai,
} from "../utils.js";
import pkg from "terminal-kit";
const { terminal: term } = pkg;

const timeout = 2000;
const steps = 3;
const locations = [
  ["46.5221392", "6.6330123", "350.42"],
  ["48.8611391", "2.3403721", "143.91"],
  ["29.977912", "31.12932", "57.75"],
  ["35.627752", "139.7718118", "351.05"],
  ["43.4642843", "-1.5631188", "24.32"],
  ["23.0325402", "31.4215355", "61.89"],
];

(async () => {
  console.clear();

  term("🌍 ");
  await term.slowTyping("Searching for a random location " + "\n", {
    flashStyle: term.brightWhite,
    delay: 40,
  });

  await sleep(1000);

  term.reset();

  const { page } = await setPuppeteer();

  const messages = [
    {
      role: "system",
      content: `You are a geo guesser assistant for google maps street view. You'll have to guess based on screenshots. Be concise in the answer. Do not use UI elements nor texts on the image.

      You will receive multiple screenshots. Integrate in your reasoning some elements of previous answers to maintain continuity in the storytelling. Never include the location name in the thoughts. Thoughs shoud be very short descriptions of metadatas. You have to point out the main elements that could help you find the location. Use a personal and creative tone of voice.
      
      Always answer with the following JSON schema. Your priority is to never include trails commas in answer. return only the JSON object and nothing else:
        {
          "thought": "I can see in this place lots of interesting metadatas: The architecture is European and there is a lake view.",
          "metadatas": ["European architecture", "Lake view"],
          "guess": "🇨🇭 Lausanne, Switzerland",
          "guess_coordinates": ["46.5221392", "6.6330123"]
        }
      `,
    },
  ];

  const location = locations[Math.floor(Math.random() * locations.length)];
  //const location = locations[3];

  await page.goto(
    "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" +
      location[0] +
      "," +
      location[1] +
      "&fov=75&heading=" +
      location[2] +
      "&pitch=0",
    {
      waitUntil: "domcontentloaded",
      timeout: timeout,
    }
  );

  // Attendre que la page soit chargée
  await sleep(timeout);

  while (true) {
    const spinner = await term.spinner();
    term(" Processing... ");

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
          text: "Here is a screenshot of a random google street view location",
        },
      ],
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 1024,
      messages: messages,
    });

    const message = response.choices[0].message;
    const message_text = message.content;

    // On ajoute la réponse à la liste des messages pour garder le contexte
    messages.push({
      role: "assistant",
      content: message_text,
    });

    const json_answer = JSON.parse(message_text);
    const thought = json_answer["thought"];
    //console.log("🤖 Answer: ", json_answer);

    spinner.animate(false);
    term.reset();

    await Promise.all([
      term.slowTyping(thought + "\n", {
        flashStyle: term.brightWhite,
        delay: 40,
      }),
      generate_speech(thought, openai),
    ]);

    await page.click(".ZDEBfc");
    await sleep(1000);

    // On casse la boucle si on a atteint le nombre d'étapes
    if (messages.length === steps * 2 + 1) {
      const guess = json_answer["guess"];
      const coordinates = json_answer["guess_coordinates"];

      console.clear();

      await term.slowTyping("Probable location :" + coordinates + "\n", {
        flashStyle: term.brightWhite,
        delay: 40,
      }),
        //console.log("🤖 Guess: ", guess + "\n" + "coordinates: ", coordinates);

        await page.goto(
          "https://www.google.com/maps/@?api=1&map_action=map&center=" +
            coordinates[0] + // Latitude
            "," +
            coordinates[1] + // Longitude
            "&zoom=15",
          {
            waitUntil: "domcontentloaded",
            timeout: timeout,
          }
        );

      await page.evaluate((guess) => {
        let dom = document.querySelector("body");
        const htmlContent =
          '<div style="width: 90%; font-weight:bold; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 7rem; text-align: center;"> ' +
          guess +
          "</div>";

        // Insert the new HTML content into the body at the end
        dom.insertAdjacentHTML("beforeend", htmlContent);
      }, guess);

      generate_speech("Probable location: " + guess, openai);

      break;
    }
  }
})();

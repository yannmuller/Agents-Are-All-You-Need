import {
  setPuppeteer,
  input,
  openai,
  image_to_base64,
  sleep,
} from "../utils.js";

const timeout = 3000;

(async () => {
  console.log("hello world");

  const messages = [
    {
      role: "system",
      content: `You are an assistant tasked with extracting specific information requested by a user from an image of a webpage. Your responses should be concise, limited to one sentence, and formatted as lists or short sentences when appropriate. Adopt a personal tone, as if you are the user's personal assistant.

      Focus on providing the relevant information related to the user's query. Avoid including any extraneous details or descriptions of the page.
      
      If you think the user's query could be improved, suggest a more effective search query based on the information provided in the image.

      If you think search result is not relevant, set "search_succeeded" to false. else set it to true. 

      Your response shoud be structured as a JSON object following this schema:

      {
        "informations": "<relevant informations>"
        "suggested_query": <suggested search query>"
        "search_succeeded" : <true|false>
      }
      `,
    },
  ];

  const { page } = await setPuppeteer();
  const user_query = await input("👩‍💻 What are you searching for: ");

  let gpt_query = "";

  while (true) {
    await page.goto("https://www.google.com", {
      waitUntil: "domcontentloaded",
      timeout: timeout,
    });

    await page.type("textarea[name=q]", gpt_query ? gpt_query : user_query);

    await sleep(1000);

    const feelingLuckyButton = await page.$("input[name=btnI]");

    await Promise.all([
      page.evaluate((button) => button.click(), feelingLuckyButton),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);

    await sleep(1000);

    console.log("Navigation done");

    await page.screenshot({
      path: "images/screenshot.jpg",
      fullPage: true,
    });

    const image = await image_to_base64("images/screenshot.jpg");

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
          text:
            "Here is a screenshot. Please find the informations asked by the user query " +
            user_query +
            ". Do not answer what was provided before. The new suggested query is: " +
            gpt_query,
        },
      ],
    });

    console.log("Calling ChatGPT API");

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      max_tokens: 1024,
      messages: messages,
      response_format: { type: "json_object" },
    });

    const answer = response.choices[0].message;
    const answer_content = answer.content;

    const answer_json = JSON.parse(answer_content);

    const informations = answer_json["informations"];
    const suggested_query = answer_json["suggested_query"];
    const search_succeeded = answer_json["search_succeeded"];

    // console.log("informations: " + informations);
    // console.log("suggested query: " + suggested_query);
    // console.log("search succeeded: " + search_succeeded);

    if (search_succeeded) {
      console.log("👍 Search succeeded");
      console.log(informations);
      break;
    } else {
      console.log("Try again with this new term: " + suggested_query);
    }

    gpt_query = suggested_query;
  }
})();

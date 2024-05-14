import {
  image_to_base64,
  input,
  sleep,
  highlight_links,
  waitForEvent,
  setPuppeteer,
  openai,
} from "../utils.js";

const timeout = 5000;

(async () => {
  const { page } = await setPuppeteer();

  const messages = [
    {
      role: "system",
      content: `You are a website crawler. You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot. Don't guess link names.

            You can go to a specific URL by answering with the following JSON format:
            {"url": "url goes here"}

            You can click links on the website by referencing the text inside of the link/button. If it's not highlighted in the square do not click on it. Pick another one. If there is a doubt of clicking on a link, just go ahead and take the lead. You have to answer in the following JSON format:
            {"click": "Text in link"}

            Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.

            Use google search by set a sub-page like 'https://google.com/search?q=search' if applicable. Prefer to use Google for simple queries. If the user provides a direct URL, go to that one. Do not make up links`,
    },
  ];

  console.log("🤖 GPT: How can I assist you today?");
  const prompt = await input("You: ");
  // console.log();

  // messages.push({
  //   role: "user",
  //   content:
  //     "Find the latest event and find details about it. Then create a small story out of it. Find it on https://ecal.ch/en/ english website",
  // });

  messages.push({
    role: "user",
    content: prompt,
  });

  let url;
  let screenshot_taken = false;

  while (true) {
    //console.log(messages);

    if (url) {
      console.log("Crawling " + url);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: timeout,
      });

      await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);

      await highlight_links(page);

      await page.screenshot({
        path: "images/screenshot.jpg",
        fullPage: true,
      });

      screenshot_taken = true;
      url = null;
    }

    if (screenshot_taken) {
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
            text: 'Here\'s the screenshot of the website you are on right now. You can click on links with {"click": "Link text"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user\'s question, you can respond normally.',
          },
        ],
      });

      screenshot_taken = false;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: messages,
    });

    const message = response.choices[0].message;
    const message_text = message.content;

    messages.push({
      role: "assistant",
      content: message_text,
    });

    console.log("🤖 GPT: " + message_text);

    if (message_text.indexOf('{"click": "') !== -1) {
      // First get the link text from gpt message
      let parts = message_text.split('{"click": "');
      parts = parts[1].split('"}');
      //const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, "");
      // keep accents
      const link_text = parts[0].replace(/[^a-zA-Z0-9 \u00C0-\u00FF]/g, "");

      console.log("Clicking on " + link_text);

      // Then get all elements with gpt-link-text attribute and find the one that matches the link text
      try {
        const elements = await page.$$("[gpt-link-text]");

        let partial;
        let exact;

        for (const element of elements) {
          const attributeValue = await element.evaluate((el) =>
            el.getAttribute("gpt-link-text")
          );

          // console.log("Checking link text: " + attributeValue);

          //if (attributeValue.includes(link_text)) {
          if (attributeValue.toLowerCase().includes(link_text.toLowerCase())) {
            partial = element;
          }

          if (attributeValue === link_text) {
            exact = element;
          }
        }

        if (exact) console.log("Exact match found: " + link_text);
        if (partial) console.log("Partial match found: " + link_text);

        if (exact || partial) {
          try {
            const [response] = await Promise.all([
              page
                .waitForNavigation({ waitUntil: "domcontentloaded" })
                .catch((e) =>
                  console.log("Navigation timeout/error:", e.message)
                ),
              (exact || partial).click(),
            ]);
          } catch (error) {
            console.log("ERROR: Clicking failed", error);
          }

          // Additional checks can be done here, like validating the response or URL
          await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);

          const pageHeight = await page.evaluate(() => {
            return Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight
            );
          });

          await page.setViewport({
            width: 1280, // Set the width as per your requirements
            height: pageHeight, // Set the height based on the calculated page height
          });

          await highlight_links(page);

          await page.screenshot({
            path: "images/screenshot.jpg",
            quality: 100,
            fullpage: true,
          });

          screenshot_taken = true;
        } else {
          throw new Error("Can't find link");
        }
      } catch (error) {
        console.log("ERROR: Clicking failed", error);

        messages.push({
          role: "user",
          content: "ERROR: I was unable to click that element",
        });
      }

      continue;
    } else if (message_text.indexOf('{"url": "') !== -1) {
      let parts = message_text.split('{"url": "');
      parts = parts[1].split('"}');
      url = parts[0];

      continue;
    }

    const prompt = await input("🧑‍💻 You: ");
    console.log();

    messages.push({
      role: "user",
      content: prompt,
    });
  }
})();

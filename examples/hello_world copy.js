import pkg from "terminal-kit";
const { terminal: term } = pkg;

(async () => {
  console.clear();
  const spinner = await term.spinner("unboxing");
  await term.slowTyping(" Agents Are \n  All You Need", {
    flashStyle: term.brightWhite,
    delay: 80,
  });
})();

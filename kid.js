const data = require("/users/acab/Downloads/JEOPARDY_QUESTIONS1.json");
const util = require("util");
const fs = require("fs");
const mine = fs.readFileSync("mine.txt").toString("utf-8");
const games = require("./questions.json");

let max = 0;

const questions = data.filter((game) => {
  const show = Number(game.show_number);
  if (show > max) {
    max = show;
  }
  return game.show_number === "5737";
});

const game = {};
const categories = {};
game.name = "kids";

game.jeopardy = [];
game.double_jeopardy = [];
game.final_jeopardy = [];

const groups = {
  "Jeopardy!": "jeopardy",
  "Double Jeopardy!": "double_jeopardy",
  "Final Jeopardy!": "final_jeopardy"
};

questions.forEach((q) => {
  if (!categories[q.category]) {
    categories[q.category] = {
      questions: [],
      name: q.category
    };
    console.log(q.round, groups);
    game[groups[q.round]].push(categories[q.category]);
  }
  cat = categories[q.category];

  cat.questions.push({
    q: q.question,
    answer: q.answer,
    value: null
  });
});

games.games.push(game);

fs.writeFileSync("./questions.json", JSON.stringify(games, null, 2));

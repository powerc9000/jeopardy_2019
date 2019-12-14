const data = require("/users/acab/Downloads/JEOPARDY_QUESTIONS1.json");
const util = require("util");
const fs = require("fs");
const mine = fs.readFileSync("mine.txt").toString("utf-8");
const games = [];
const saved = require("./q2.json");

const savedGames = saved.games;

const gameParts = mine.split("\n\n");

const myCats = [];
const values = [200, 400, 600, 800, 1000];

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.Interface.prototype.question[util.promisify.custom] = function(
  prompt
) {
  return new Promise((resolve) =>
    readline.Interface.prototype.question.call(this, prompt, resolve)
  );
};
readline.Interface.prototype.questionAsync = util.promisify(
  readline.Interface.prototype.question
);

async function dod() {
  gameParts.forEach((gp) => {
    let mod = 1;
    const category = {};
    const lines = gp.split("\n");
    category.name = lines[0];
    if (category.name.includes(":")) {
      category.name = category.name.split(":")[0];
      category.round = "double";
      mod = 2;
    }
    category.questions = [];
    for (let i = 1; i < lines.length; i += 2) {
      const question = {};
      if (!lines[i]) {
        return;
      }
      question.q = lines[i];
      question.answer = lines[i + 1];
      question.value = values[~~(i / 2)] * mod;
      category.questions.push(question);
    }
    myCats.push(category);
  });

  const sets = {};

  data.forEach((q) => {
    if (!sets[q.show_number]) {
      sets[q.show_number] = {
        categories: {}
      };
    }
    if (!sets[q.show_number].categories[q.category]) {
      sets[q.show_number].categories[q.category] = {
        name: q.category,
        questions: [],
        round: q.round
      };
    }

    sets[q.show_number].categories[q.category].questions.push({
      q: q.question,
      value: (q.value || "").replace("$", ""),
      answer: q.answer
    });
  });

  const formattedGames = Object.values(sets);

  function randInt(max) {
    return Math.round(Math.random() * max);
  }

  function findCat(len, games, round) {
    let gameIndex = randInt(len - 1);
    let numQ = 0;
    const total = round === "Final Jeopardy!" ? 1 : 5;
    let cat;
    do {
      gameIndex = randInt(len - 1);
      const g = games[gameIndex].categories;
      const catKeys = Object.keys(g);
      cat = g[catKeys[randInt(catKeys.length - -1)]];
      if (!cat) continue;
      if (cat.round !== round) {
        continue;
      }
      numQ = cat.questions.length;
    } while (numQ < total);
    return cat;
  }

  const len = formattedGames.length;
  const customLen = myCats.length;
  const map = {
    "Jeopardy!": "jeopardy",
    "Double Jeopardy!": "double_jeopardy"
  };

  for (let i = 0; i < customLen; i++) {
    const custom = myCats.shift();
    let game = savedGames[i];
    let doCustom = false;
    if (!game) {
      doCustom = true;
      game = {
        name: `Game ${i + 1}`,
        jeopardy: [],
        double_jeopardy: [],
        final_jeopardy: []
      };
    }
    if (custom && doCustom) {
      let set = "jeopardy";
      if (custom.round === "double") {
        set = "double_jeopardy";
      }
      game[set].push({
        name: custom.name,
        questions: custom.questions
      });
    }
    let answer;
    console.log(custom.name);
    while (game.jeopardy.length < 6 || game.double_jeopardy.length < 6) {
      console.log(
        "jepardy",
        game.jeopardy.length,
        "double",
        game.double_jeopardy.length
      );
      let cat;
      let round = "Jeopardy!";
      if (game.jeopardy.length === 6) {
        round = "Double Jeopardy!";
      }
      do {
        cat = findCat(len, formattedGames, round);
        cat.questions.forEach((q) => {
          console.log(q.q);
        });
        answer = await rl.questionAsync(
          `Category: ${cat.name} round: ${cat.round} > `
        );
      } while (answer !== "y");

      game[map[cat.round]].push({
        questions: cat.questions,
        name: cat.name
      });
    }
    if (!game.final_jeopardy || game.final_jeopardy.length < 1) {
      game.final_jeopardy = [];
      let final;
      let cat;
      do {
        cat = findCat(len, formattedGames, "Final Jeopardy!");
        console.log(cat.questions[0].q);

        aFinal = await rl.questionAsync(`Final ${cat.name} > `);
      } while (aFinal !== "y");

      game.final_jeopardy.push({
        questions: cat.questions,
        name: cat.name
      });
    }
    games.push(game);
    fs.writeFileSync("./q2.json", JSON.stringify({ games }, null, 4));
  }
  rl.close();
}
dod();

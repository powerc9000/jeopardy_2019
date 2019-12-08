(() => {
  const application = Stimulus.Application.start();
  application.register(
    "game",
    class extends Stimulus.Controller {
      async getQuestions() {
        const qReq = await fetch("/questions.json");
        const questions = await qReq.json();
        return questions;
      }
      async connect() {
        const questions = await this.getQuestions();
        const hasLast = localStorage.getItem("state");
        this.board = window.open("/gameboard.html", "gameboard");
        this.state = {
          boardState: "showBoard",
          categories: questions.games[0].jeopardy,
          players: [],
          selectedQuestion: "What is my favorite Katie."
        };
        this.otherState = null;
        if (hasLast) {
          this.otherState = JSON.parse(hasLast);
        }
        setTimeout(() => {
          this.tellState();
        }, 500);
        this.fillBoard();
      }
      loadPreviousState() {
        this.state = this.otherState;
        this.tellState();
        this.showPlayers();
        this.fillBoard();
        this.setQuestion();
      }
      set otherState(val) {
        this._otherState = val;
        if (this._otherState) {
          this.targets.find("haveOther").style.display = "block";
        }
      }
      get otherState() {
        return this._otherState;
      }
      addPlayer(e) {
        const form = this.targets.find("add-form");
        e.preventDefault();
        if (!form.name.value) return;
        this.state.players.push({
          name: form.name.value,
          correct: [],
          wrong: []
        });
        this.tellState();
        this.showPlayers();
        form.reset();
      }
      tellState() {
        localStorage.setItem("state", JSON.stringify(this.state));
        this.board.postMessage({
          type: "changeState",
          data: this.state
        });
      }
      selectQ(e) {
        const target = e.target;
        const q = target.dataset.question;
        const [cIDX, qIDX] = q.split(":");
        console.log(
          this.state,
          this.state.categories,
          this.state.categories[cIDX]
        );
        const question = this.state.categories[cIDX].questions[qIDX];
        question.used = true;
        this.state.question = { index: qIDX, cat: cIDX, ...question };
        this.state.selectedQuestion = question.q;
        this.state.boardState = "showQuestion";
        this.setQuestion();
        this.fillBoard();
        this.tellState();
      }
      clearQuestion() {
        this.state.boardState = "showBoard";
        this.tellState();
      }
      gotRight(e) {
        const parent = e.target.parentNode;
        const player = this.state.players[parent.dataset.player];
        this.player.removeFrom("wrong", player, this.state.question);
        this.player.addTo("correct", player, this.state.question);
        this.tellState();
        this.showPlayers();
        this.setQuestion();
      }
      gotWrong(e) {
        const parent = e.target.parentNode;
        const player = this.state.players[parent.dataset.player];
        this.player.removeFrom("correct", player, this.state.question);
        this.player.addTo("wrong", player, this.state.question);
        this.tellState();
        this.showPlayers();
        this.setQuestion();
      }
      gotClear(e) {
        const parent = e.target.parentNode;
        const player = this.state.players[parent.dataset.player];
        this.player.removeFrom("correct", player, this.state.question);
        this.player.removeFrom("wrong", player, this.state.question);
        this.tellState();
        this.showPlayers();
        this.setQuestion();
      }
      showPlayers() {
        const html = this.state.players
          .map((p) => {
            return `<li>${p.name} ${p.correct.length} - ${
              p.wrong.length
            } - $${this.player.calcScore(p)}</li>`;
          })
          .join("");
        const players = this.targets.find("players");

        players.innerHTML = `<ul>${html}</ul>`;
      }
      setQuestion() {
        if (!this.state.question) return;
        currentquestion.innerHTML = `
							${this.state.question.value}<br>${this.state.question.q}
							<button data-action="game#clearQuestion">Clear</button>
								<div>
								${this.state.players
                  .map((p, idx) => {
                    return `<div data-player="${idx}">${p.name}<button data-action="game#gotRight">right</button><button data-action="game#gotWrong">wrong</button><button data-action="game#gotClear">none</button></div>`;
                  })
                  .join("")}
								</div>
							`;
      }
      fillBoard() {
        const board = this.targets.find("board");
        const template = document.importNode(
          this.targets.find("boardTemplate").content,
          true
        ).firstElementChild;
        const ulTemplate = document.importNode(
          template.querySelector("[data-ul-template]").content,
          true
        ).firstElementChild;
        const liTemplate = document.importNode(
          ulTemplate.querySelector("[data-li-template]").content,
          true
        ).firstElementChild;

        board.innerHTML = "";
        this.state.categories.forEach((cat, catIdx) => {
          const parent = template.cloneNode(true);
          parent.querySelector("h3").innerText = cat.name;
          const ul = ulTemplate.cloneNode(true);
          cat.questions.forEach((q, qIdx) => {
            const li = liTemplate.cloneNode(true);
            li.classList.toggle("used", !!q.used);
            const button = li.querySelector("button");
            button.innerText = q.value;
            button.dataset.question = `${catIdx}:${qIdx}`;
            ul.appendChild(li);
          });

          parent.appendChild(ul);
          board.appendChild(parent);
        });
      }
      player = {
        addTo: (list, player, question) => {
          const exists = player[list].find((q) => {
            return q.index === question.index && q.cat === question.cat;
          });

          if (exists) return;

          player[list].push(question);
        },
        removeFrom: (list, player, question) => {
          const idx = player[list].findIndex((q) => {
            return q.index === question.index && q.cat === question.cat;
          });

          if (idx > -1) {
            player[list].splice(idx, 1);
          }
        },
        calcScore: (player) => {
          let score = 0;

          player.correct.forEach((r) => {
            score += Number(r.value);
          });
          player.wrong.forEach((w) => {
            score -= Number(w.value);
          });

          return score;
        }
      };
    }
  );
})();

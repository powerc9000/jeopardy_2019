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
        this.setQuestion();
        form.reset();
      }
      adjustQuestion(e) {
        const target = e.target;
        const q = target.dataset.question;
        const [cat, index] = q.split(":");
        const question = this.state.categories[cat].questions[index];
        console.log(question);
        this.state.question = { index, cat, ...question };
        this.setQuestion();
      }
      tellState() {
        localStorage.setItem("state", JSON.stringify(this.state));
        this.board.postMessage({
          type: "changeState",
          data: this.state
        });
        this.targets.find("boardState").innerText = this.state.boardState;
      }
      selectQ(e) {
        const target = e.target;
        const q = target.dataset.question;
        const [cIDX, qIDX] = q.split(":");
        const question = this.state.categories[cIDX].questions[qIDX];
        question.used = true;
        this.state.question = { index: qIDX, cat: cIDX, ...question };
        this.state.selectedQuestion = question.q;
        if (question.dailyDouble) {
          this.state.boardState = "dailyDouble";
        } else {
          this.state.boardState = "showQuestion";
        }
        this.setQuestion();
        this.fillBoard();
        this.tellState();
      }
      showDailyDouble() {
        this.state.boardState = "showQuestion";
        this.tellState();
      }
      clearQuestion() {
        this.state.boardState = "showBoard";
        this.tellState();
      }
      setWager() {
        console.log(this.state.boardState);
        if (this.state.boardState === "dailyDouble") {
          this.state.boardState = "showQuestion";
          this.tellState();
        }
      }
      gotRight(e) {
        const parent = e.target.parentNode;
        const player = this.state.players[parent.dataset.player];
        this.setDailyDoubleWager(
          this.state.question,
          this.targets.find("ddWager")
        );
        this.player.removeFrom("wrong", player, this.state.question);
        this.player.addTo("correct", player, this.state.question);
        this.tellState();
        this.showPlayers();
        this.setQuestion();
      }
      gotWrong(e) {
        const parent = e.target.parentNode;
        const player = this.state.players[parent.dataset.player];
        this.setDailyDoubleWager(
          this.state.question,
          this.targets.find("ddWager")
        );
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
      setDailyDoubleWager(question, wager) {
        question.value = wager.value;
        const stateQ = this.state.categories[question.cat].questions[
          question.index
        ];
        if (stateQ) {
          stateQ.value = wager.value;
        }
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
        const template = document.importNode(
          this.targets.find("questionSection").content,
          true
        );
        template.querySelector(
          `[data-for="question"]`
        ).innerHTML = this.state.question.q;

        if (this.state.question.dailyDouble) {
          const input = template.querySelector(`[data-for="wager"]`);
          template.querySelector(`[data-for="ddStuff"]`).style = "";
          input.value = this.state.question.value;
        }

        const buttonParent = template.querySelector(`[data-for="userButtons"]`);
        this.state.players.forEach((player, index) => {
          const buttonTemplate = buttonParent
            .querySelector("[data-for=buttonTemplate]")
            .cloneNode(true);
          buttonTemplate.style = "";
          buttonTemplate.dataset.player = index;
          buttonTemplate.querySelector("[data-for=name]").innerText =
            player.name;

          const status = this.player.getQuestionStatus(
            player,
            this.state.question
          );
          if (status) {
            const button = buttonTemplate.querySelector(
              `[data-for="${status}"]`
            );
            if (button) {
              button.classList.add("active");
            }
          }
          buttonParent.appendChild(buttonTemplate);
        });
        currentquestion.innerHTML = "";
        currentquestion.appendChild(template);
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
            if (q.used) {
              li.querySelector(`button[data-for="edit"]`).style = "";
            }
            const button = li.querySelector("button[data-for=select]");
            button.innerText = q.value;
            [...li.querySelectorAll("button")].forEach((button) => {
              button.dataset.question = `${catIdx}:${qIdx}`;
            });
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
        },
        getQuestionStatus: (player, question) => {
          const isWrong = player.wrong.find((q) => {
            return q.cat === question.cat && q.index === question.index;
          });

          if (isWrong) {
            return "wrong";
          }

          const isRight = player.correct.find((q) => {
            return q.cat === question.cat && q.index === question.index;
          });

          if (isRight) {
            return "right";
          }

          return null;
        }
      };
    }
  );
})();

const iq = require("inquirer");
const onoff = require("onoff");
const gpio = onoff.Gpio;

const green = new gpio(18, "out");
const red = new gpio(23, "out");

const arm = new gpio(21, "in", "rising");
const reset = new gpio(24, "in", "rising");

const controllerPins = [26];
const controllers = [];
const players = [];
const penalties = {};

let user = null;
let state = "SETUP";
let lastState = null;

controllerPins.forEach((pin) => {
  const controller = new gpio(pin, "in", "rising", { debounceTimeout: 10 });
  controller.watch((e, val) => {
    controllerBuzz(val, pin);
  });

  controllers.push(controller);
});

function getByPin(pin) {
  return players.find((p) => {
    return p.pin === pin;
  });
}

function controllerBuzz(val, pin) {
  if (state === "SETUP") {
    console.log("Button press on pin", pin);
  }
  if (state !== "OPEN") {
    penalties[pin] = Date.now();
  }
  if (state === "OPEN") {
    if (penalties[pin] && penalties[pin] + 250 > Date.now()) {
      return;
    }
    state = "LOCKED";
    user = getByPin(pin);
  }
}

function play() {
  arm.watch((e, val) => {
    if (val) {
      if (state === "NONE") {
        state = "OPEN";
      }
    }
  });

  reset.watch((e, val) => {
    if (val) {
      state = "NONE";
    }
  });
  setInterval(() => {
    if (lastState !== state) {
      if (state === "LOCKED") {
        console.log(user.name, "RANG IN");
        red.write(1);
        green.write(1);
      }
      if (state === "OPEN") {
        red.write(0);
        green.write(1);
      }
      if (state === "NONE") {
        red.write(1);
        green.write(0);
      }
    }
    lastState = state;
  }, 200);
}

let flip = 0;
function toggleLights() {
  return setInterval(() => {
    red.write(flip ^ 1);
    green.write(flip);
    flip = flip ^ 1;
  }, 1000);
}

async function setup() {
  let interval = toggleLights();
  const numPlayers = (await iq.prompt([
    { type: "input", name: "players", message: "Number of players" }
  ])).players;

  for (i = 0; i < numPlayers; i++) {
    const q = await iq.prompt([
      { type: "input", name: "name", message: "Player Name" },
      {
        type: "input",
        name: "pin",
        message: "Button Pin",
        filter: (pin) => {
          return parseInt(pin, 10);
        }
      }
    ]);

    players.push(q);
  }
  clearInterval(interval);
  state = "NONE";
  play();
}

setup();

process.on("SIGINT", (_) => {
  green.unexport();
  red.unexport();

  arm.unexport();
  reset.unexport();
  controllers.forEach((controller) => {
    controller.unexport();
  });
});

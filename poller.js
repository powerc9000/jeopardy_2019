const iq = require("inquirer");
const onoff = require("onoff");
const gpio = onoff.Gpio;

const OUTPUTS = {
  GREEN: 18,
  RED: 23,
  LIGHT: 17
};

const INPUTS = {
  ARM: 21,
  RESET: 24
};

const controllerPins = [26, 19, 13, 20, 16];
const controllers = [];
const players = [];
const penalties = {};

let user = null;
let state = "SETUP";
let lastState = null;
let red;
let green;
let light;
const _listeners = [];
const _outputs = [];

controllerPins.forEach((pin) => {
  const controller = new gpio(pin, "in", "rising", { debounceTimeout: 10 });
  listenOnButton(pin, controllerBuzz);
});

function getByPin(pin) {
  return players.find((p) => {
    return p.pin === pin;
  });
}

function controllerBuzz(val, state, pin) {
  if (state === "SETUP") {
    console.log("Button press on pin", pin);
    return state;
  }
  if (state !== "OPEN") {
    penalties[pin] = Date.now();
    return state;
  }
  if (state === "OPEN") {
    if (penalties[pin] && penalties[pin] + 250 > Date.now()) {
      return state;
    }
    user = getByPin(pin);
    if (!user) {
      console.log("No user on pin", pin);
      return state;
    }
    return "LOCKED";
  }
}

function createOutput(pin) {
  const out = new gpio(pin, "out");
  _outputs.push(out);

  return out;
}
function unbindOutputs() {
  _outputs.forEach((out) => {
    out.unexport();
  });
}

let stateChangeCb;
function listenOnButton(pin, callback) {
  const button = new gpio(pin, "in", "rising", { debounceTimeout: 10 });
  button.watch((err, val) => {
    const result = callback(val, state, pin);
    if (result && result !== state) {
      stateChangeCb(state, result);
      state = result;
    }
  });
  _listeners.push(button);
}

function unbindInputs() {
  _listeners.forEach((e) => {
    e.unwatchAll();
    e.unexport();
  });
}

function onStateChange(cb) {
  stateChangeCb = cb;
}

function play() {
  listenOnButton(INPUTS.ARM, (val, state) => {
    if (val) {
      if (state === "NONE") {
        return "OPEN";
      }
    }
  });

  listenOnButton(INPUTS.RESET, (val, state) => {
    if (val) {
      return "NONE";
    }
  });

  onStateChange((lastState, state) => {
    light.write(0);
    if (lastState === "SETUP") {
      process.stdout.write("\033c");
    }
    if (state === "LOCKED") {
      process.stdout.write("\033c");
      console.log(user.name, "RANG IN");
      red.write(1);
      green.write(1);
    }
    if (state === "OPEN") {
      process.stdout.write("\033c");
      red.write(0);
      light.write(1);
      green.write(1);
    }
    if (state === "NONE") {
      red.write(1);
      green.write(0);
    }
  });
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

  green = createOutput(OUTPUTS.GREEN);
  red = createOutput(OUTPUTS.RED);
  light = createOutput(OUTPUTS.LIGHT);

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
  lastState = "SETUP";
  play();
}

setup();

process.on("SIGINT", (_) => {
  unbindOutputs();
  unbindInputs();

  process.exit(0);
});

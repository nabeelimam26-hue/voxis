import EngineState from "../state/EngineState";
import InputCommands from "./InputCommands";

class InputManager {
  processGesture(gesture) {
    let command =
      InputCommands.NONE;

    switch (gesture) {
      case "open_palm":
        command =
          InputCommands.HOVER;
        break;

      case "fist":
        command =
          InputCommands.GRAB;
        break;

      case "victory":
        command =
          InputCommands.ROTATE;
        break;

      case "three":
        command =
          InputCommands.SCALE;
        break;

      case "point":
        command =
          InputCommands.DRAW;
        break;

      default:
        command =
          InputCommands.NONE;
    }

    EngineState.inputCommand =
      command;

    return command;
  }
}

const inputManager =
  new InputManager();

export default inputManager;
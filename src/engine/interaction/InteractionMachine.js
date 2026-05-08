import EngineState from "../state/EngineState";
import InteractionStates from "./InteractionStates";
import eventBus from "../events/EventBus";

class InteractionMachine {
  transition(newState) {
    const oldState =
      EngineState.interaction.state;

    if (oldState === newState) return;

    console.log(
      `[Interaction] ${oldState} → ${newState}`
    );

    EngineState.interaction.state =
      newState;

    eventBus.emit(
      "interaction:changed",
      {
        oldState,
        newState,
      }
    );
  }

  update(gesture) {
    switch (gesture) {
      case "open_palm":
        this.transition(
          InteractionStates.HOVERING
        );
        break;

      case "fist":
        this.transition(
          InteractionStates.GRABBING
        );
        break;

      case "victory":
        this.transition(
          InteractionStates.ROTATING
        );
        break;

      case "three":
        this.transition(
          InteractionStates.SCALING
        );
        break;

      case "point":
        this.transition(
          InteractionStates.DRAWING
        );
        break;

      case "none":
      default:
        this.transition(
          InteractionStates.IDLE
        );
        break;
    }
  }
}

const interactionMachine =
  new InteractionMachine();

export default interactionMachine;
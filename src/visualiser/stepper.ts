import type { Inspector } from '../lib'

export class Stepper {
    constructor(
        inspector: typeof Inspector,
        pause: HTMLButtonElement,
        step: HTMLButtonElement,
        play: HTMLButtonElement,
    ) {
        inspector.onStartStepping = () => {
            play.disabled = false
            pause.disabled = true
        }

        inspector.onStopStepping = () => {
            play.disabled = true
            pause.disabled = false
        }

        inspector.onNextStepDone = () => {
            step.disabled = true
        }

        inspector.onReadyForNextStep = () => {
            step.disabled = false
        }

        if (inspector.readyForNextStep) {
            step.disabled = false
        }
        if (inspector.stepping) {
            play.disabled = false
            pause.disabled = true
        } else {
            play.disabled = true
            pause.disabled = false
        }

        play.onclick = () => inspector.disableSteppingMode()
        pause.onclick = () => inspector.enableSteppingMode()
        step.onclick = () => inspector.doNextStep()
    }
}

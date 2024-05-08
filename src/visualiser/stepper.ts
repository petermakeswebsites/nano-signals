import type { Inspector } from '../lib'

export class Stepper {
    constructor(
        inspector: typeof Inspector,
        pause: HTMLButtonElement,
        step: HTMLButtonElement,
        play: HTMLButtonElement,
    ) {
        inspector.onstartstepping = () => {
            play.disabled = false
            pause.disabled = true
        }

        inspector.onstopstepping = () => {
            play.disabled = true
            pause.disabled = false
        }

        inspector.onnextstepdone = () => {
            step.disabled = true
        }

        inspector.onreadyfornextstep = () => {
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

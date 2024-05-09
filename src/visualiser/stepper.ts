import type { Inspector } from '../lib'
import { Phase } from '../lib/microtask.ts'

export class Stepper {
    constructor(
        inspector: typeof Inspector,
        pause: HTMLButtonElement,
        step: HTMLButtonElement,
        play: HTMLButtonElement,
        phase: HTMLSpanElement,
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

        if (!inspector.readyForNextStep) {
            step.disabled = true
        }

        if (inspector.stepping) {
            play.disabled = false
            pause.disabled = true
        } else {
            play.disabled = true
            pause.disabled = false
        }

        inspector.onMicrotaskPhaseChange = (phaseEnum) => {
            switch (phaseEnum) {
                case Phase.AWAITING_FLUSH:
                    phase.innerText = 'Awaiting flush (1/5)'
                    break
                case Phase.PROCESSING_MAYBES:
                    phase.innerText = 'Processing maybes (2/5)'
                    break
                case Phase.ORGANISING_EFFECT_TREE:
                    phase.innerText = 'Organising effect tree (3/5)'
                    break
                case Phase.APPLYING_EFFECTS:
                    phase.innerText = 'Applying effects (4/5)'
                    break
                case Phase.DONE:
                    phase.innerText = 'Done (5/5)'
                    break
            }
        }

        play.onclick = () => inspector.disableSteppingMode()
        pause.onclick = () => inspector.enableSteppingMode()
        step.onclick = () => inspector.doNextStep()
    }
}

import { Visualiser } from './visualiser/visualiser.ts'
import { Inspector } from './lib'
import { Stepper } from './visualiser/stepper.ts'

const visualiser = new Visualiser(Inspector)
document.addEventListener('DOMContentLoaded', () => {
    visualiser.mount(document.getElementById('cy')!)
    const play = document.getElementById('play') as HTMLButtonElement
    const step = document.getElementById('step') as HTMLButtonElement
    const pause = document.getElementById('pause') as HTMLButtonElement
    new Stepper(Inspector, pause, step, play)
})

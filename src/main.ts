import './style.css'
import './transform-inspector.ts'
import { $effect, Inspector } from './lib'
import { CounterView } from './examples/counter.ts'

Inspector.forceNames = true

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app')!
    $effect.root(() => {
        CounterView(app, {})
    }, 'app root')
})

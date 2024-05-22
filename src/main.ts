import './style.css'
import './transform-inspector.ts'
import { $effect, Inspector /* $derived, $get, $set, $source, create, html, $bind, $window */ } from './lib'

// Simple counter with some effect nesting
import { CounterView } from './examples/counter.ts'

// Example using a loop
// import { CarListView } from './examples/cars.ts'

// Example using $window listener
// import { Focus } from './examples/focus.ts'

Inspector.forceNames = true

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app')!
    $effect.root(() => {
        // Comment out CounterView and add your own code in here!
        CounterView(app, {})
    }, 'app root')
})

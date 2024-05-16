import './style.css'
import './transform-inspector.ts'
import { $derived, $effect, $get, $set, $source, html, Inspector } from './lib'
// import { CounterView } from './examples/counter.ts'
// import { CarListView } from './examples/cars.ts'
// import { Focus } from './examples/focus.ts'

// Focus(app, {})
// CounterView(app, {})
Inspector.forceNames = true

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app')!
    $effect.root(() => {
        const a = $source(0, 'a')
        const b = $source(0, 'b')
        const c = $source(0, 'c')
        const d = $source(0, 'd')

        const sum = $derived(() => {
            return $get(a) + $get(b) + $get(c) + $get(d)
        }, 'sum')

        function sumIt() {
            // return $get(a) + $get(b) + $get(c) + $get(d)
            return $get(sum)
        }

        for (let i = 0; i < 20; i++) {
            $effect(() => {
                console.log(sumIt())
            }, 'printing')
        }

        const [button, button2] = html(`<button>Increment a</button><button>Increment b</button>`).$all('button')!

        button!.addEventListener('click', () => $set(a, $get(a) + 1))
        button2!.addEventListener('click', () => $set(b, $get(b) + 1))
        app.appendChild(button!)
        app.appendChild(button2!)
        // CarListView(app, {})
    }, 'app root')
})

import { $children, $component, $effect, $get, $innertext, $set, $source, html } from '../lib'

const counter = $source(5, 'counter')
export const CounterView = $component((node) => {
    const [span, button] = html(`
            <span>counter: <span>yup</span></span>
          
            <button>increment</button>
        `) as [HTMLSpanElement, HTMLButtonElement]

    button.addEventListener('click', () => {
        $set(counter, $get(counter) + 1)
    })

    $effect.pre(() => $innertext(span, '' + $get(counter)), 'counter text display')
    return $children(node, span, button)
}, 'counter view')

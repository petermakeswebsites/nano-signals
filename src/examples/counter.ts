import { $children, $class, $component, $derived, $effect, $get, $set, $source, html } from '../lib'

const counter = $source(5, 'counter')
const double = $derived(() => $get(counter) * 2, 'double')

export const CounterView = $component((node) => {
    const { $, $all, children } = html(`
            <span>counter:</span><span class="rx"></span> <br />
            <span>double:</span><span class="rx"></span> <br />
            <span class="warning rx hidden">uh oh!</span> <br />
            <button>increment</button>
        `)

    $('button')!.addEventListener('click', () => {
        $set(counter, $get(counter) + 1)
    })
    const [countSpan, doubleSpan, warningSpan] = $all('span.rx')

    $effect.pre(() => {
        countSpan!.innerText = '' + $get(counter)
    }, 'counter text display')

    const isDouble = $derived(() => $get(double) > 20, 'is double more than 20')

    $effect.pre(() => {
        $effect.pre(() => {
            doubleSpan!.innerText = '' + $get(double)
        }, 'double text display')

        if ($get(isDouble)) {
            return $class.remove(warningSpan!, 'hidden')
        }
    }, 'more than double?')

    return $children(node, ...children)
}, 'counter view')

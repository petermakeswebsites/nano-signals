import { $bind, $child, $component, $effect, $source, $window, create } from '../lib'

export const Focus = $component((node) => {
    const input = create('input')
    const name = $source('Enter', 'key choice')
    $bind(input, name)

    $effect(
        () =>
            $window.listen('keydown', (e) => {
                if (e.key == name.value) input.focus()
            }),
        'listener change',
    )

    return $child(node, input)
}, 'focus component')

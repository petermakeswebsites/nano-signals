import { $child, $component, html } from '../lib'

const button = $component<{ click: (this: HTMLButtonElement, e: Event) => void; text: string }>(
    (node, { click, text }) => {
        const [btn] = html(`<button class="">${text}</button>`) as [HTMLButtonElement]
        btn.addEventListener('click', click)
        return $child(node, btn)
    },
)

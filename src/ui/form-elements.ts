import { $child, $component, $effect, html } from '../lib'
import { Children } from '../lib/component.ts'

export const button = $component<{ click: (this: HTMLButtonElement, e: Event) => void; text: string }>(
    (node, { click, text }) => {
        const [btn] = html(`<button>${text}</button>`) as [HTMLButtonElement]
        btn.addEventListener('click', click)
        return $child(node, btn)
    },
    'button',
)
export const textInput = $component<{ placeholder: string; name: string }>((node, { placeholder, name }) => {
    const [input] = html(`<input name="${encodeURI(name)}" placeholder="${encodeURI(placeholder)}"></input>`) as [
        HTMLInputElement,
    ]
    return $child(node, input)
}, 'input')

export const form = $component<{
    onsubmit: (this: HTMLFormElement, e: SubmitEvent) => void
    children: Children
}>((node, { onsubmit, children }) => {
    const [form] = html(`<form></form>`) as [HTMLFormElement]
    form.addEventListener('submit', onsubmit)

    $effect.pre(() => {
        return children(form)
    }, 'form children')

    return $child(node, form)
}, 'form')

import { Derived } from './derived.ts'
import { $effect, $get } from './effect.ts'

/**
 * @param node
 * @param text
 */
export function $innertext(node: { innerText: string }, text: string) {
    node.innerText = text
    return () => (node.innerText = '')
}

export function $innerhtml(node: { innerHTML: string }, text: string) {
    node.innerHTML = text
    return () => (node.innerHTML = '')
}

export function text(str: string) {
    return document.createTextNode(str)
}

export function html(html: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return [...doc.body.childNodes]
}

/**
 * Auto-cleans if disabled
 */
export function $if(
    node: Element,
    fn: () => boolean,
    render: (node: Element) => void | (() => void),
    or: undefined | ((node: Element) => void | (() => void)),
    name?: string,
) {
    const isTrue = new Derived(fn, 'if' + (name ? ' ' + name : ''))
    $effect.pre(() => {
        if ($get(isTrue)) {
            return render(node)
        } else {
            if (or) return or(node)
        }
    }, 'then render')
}

// export function $event<
//     T extends Element,
//     K extends Parameters<T['addEventListener']>[0],
// >(element: T, evt: K, fn: (this: T, evt: [K]) => void) {
//     // @ts-ignore not sure how to fix this
//     element.addEventListener<K>(evt, fn)
// }

export function $child<T extends Element, Q extends Element | Text>(parent: T, child: Q) {
    parent.appendChild(child)
    return () => {
        parent.removeChild(child)
    }
}

export function $class<T extends Element>(element: T, className: string) {
    element.classList.add(className)
    return () => element.classList.remove(className)
}

export function $children<T extends Element, Q extends (Element | Text)[]>(parent: T, ...children: Q) {
    children.forEach((child) => parent.appendChild(child))
    return () => {
        children.forEach((child) => parent.removeChild(child))
    }
}

// export function $creates<
//     T extends (keyof (HTMLElementTagNameMap | SVGElementTagNameMap))[],
// >(...args: T) {
//     return args.map((tag) => $create(tag)) as {
//         [K in keyof T]: (K extends keyof SVGElementTagNameMap
//             ? SVGElementTagNameMap
//             : HTMLElementTagNameMap)[T[K]]
//     }
// }

export function create<T extends keyof HTMLElementTagNameMap>(tagName: T): HTMLElementTagNameMap[T]
export function create<T extends keyof SVGElementTagNameMap>(tagName: T): SVGElementTagNameMap[T]
export function create<T extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
    tagName: T,
): HTMLElement | SVGElement {
    const element = document.createElement(tagName)
    return element
}

/**
 * Each
 */
export function $each<T, U extends Element, Q = number>(
    node: U,
    arr: T[],
    render: (item: T, index: number, node: U) => void | (() => void),
    keyBy?: (item: T, index: number) => Q,
) {
    if (keyBy === undefined) keyBy = (_, index) => index as Q
    const roots = new Map(
        arr.map((item, index) => {
            const renderReturn = render(item, index, node)
            const key = keyBy!(item, index)
            return [key, renderReturn] as const
        }),
    )

    return () => {
        for (const [_, destroyFn] of [...roots]) {
            destroyFn?.()
        }
    }
}

import { Derived } from './derived.ts'
import { $get, Effect } from './effect.ts'
import { Source } from './source.ts'
import { NanoComponent } from './component.ts'

/**
 * @param node
 * @param text
 */
export function $innertext(node: { innerText: string }, text: string) {
    node.innerText = text
    return () => (node.innerText = '')
}

export function $text(str: string) {
    return document.createTextNode(str)
}

export function $html(node: { innerHTML: string }, text: string) {
    node.innerHTML = text
    return () => (node.innerHTML = '')
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
    new Effect(() => {
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

export function $child<T extends Element, Q extends Element | Text>(
    parent: T,
    child: Q,
) {
    parent.appendChild(child)
    return () => {
        parent.removeChild(child)
    }
}

export function $class<T extends Element>(element: T, className: string) {
    element.classList.add(className)
    return () => element.classList.remove(className)
}

export function $children<T extends Element, Q extends (Element | Text)[]>(
    parent: T,
    ...children: Q
) {
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

export function $create<T extends keyof HTMLElementTagNameMap>(
    tagName: T,
): HTMLElementTagNameMap[T]
export function $create<T extends keyof SVGElementTagNameMap>(
    tagName: T,
): SVGElementTagNameMap[T]
export function $create<
    T extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap),
>(tagName: T): HTMLElement | SVGElement {
    const element = document.createElement(tagName)
    return element
}

/**
 * Each
 */
export function $each<T, U extends Element, Q = number>(
    node: U,
    arr: Source<T[]>,
    fn: (item: T, index: number, node: U) => void | (() => void),
    id?: (item: T, index: number) => Q,
    name?: string,
) {
    if (id === undefined)
        (id = (_, index) => index as Q),
            new Effect(
                () => {
                    const roots = new Map(
                        $get(arr).map((item, index) => {
                            return [
                                id!(item, index),
                                fn(item, index, node),
                            ] as const
                        }),
                    )

                    return () => {
                        for (const [_, destroyFn] of [...roots]) {
                            destroyFn?.()
                        }
                    }
                },
                'each ' + (name ? ' ' + name : ''),
            )
}

export function $destroyer(comp: NanoComponent<any>) {
    return () => comp.destroy()
}

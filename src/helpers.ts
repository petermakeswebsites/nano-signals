import {$get, Derived, Effect, effect, EffectRoot, Source} from "./lib/";

export function $text(node: Element, text: string) {
    node.innerHTML = text;
    return () => node.innerHTML = ''
}

/**
 * Auto-cleans if disabled
 */
export function $if(node: Element, fn: () => boolean, render: (node: Element) => (void | (() => void))) {
    // This is an effect attached to the parent root
    const isTrue = new Derived(fn)
    effect(() => {
        if ($get(isTrue)) {
            // Create a new root context for children
            const root = new EffectRoot(() => {
                return render(node)
            })

            return () => {
                root.destroy()
            }
        }
    })
}

/**
 * Each
 */
export function $each<T, U extends Element, Q = number>(
    node: U, arr: Source<T[]>,
    fn: (item: T, index: number, node: U) => (void | (() => void)),
    id: (item: T, index: number) => Q = (_, index) => index as Q) {

    new Effect(() => {
        const roots = new Map($get(arr).map((item, index) => {
            return [id(item, index), new EffectRoot(() => {
                return fn(item, index, node)
            })] as const
        }))

        return () => {
            for (const [_, root] of [...roots]) {
                root.destroy()
            }
        }
    })
}

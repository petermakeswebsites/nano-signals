import { $effect } from './'
//
// /**
//  * Component lifecycle is a render-once kind of function, updates should be done
//  * via surgically-precise $effects.
//  */
// export class NanoComponent<T extends Element> {
//     get destroyed(): boolean {
//         return this._destroyed
//     }
//
//     private _destroyed = false
//
//     attachTo: T
//     /**
//      *
//      * @param attachTo
//      * @param render Function that handles creation of effects, dom, etc in a synchronous root context. Returns a cleanup function
//      */
//     constructor(attachTo: T, render: (node: T) => (() => void) | void, name?: string) {
//         this.attachTo = attachTo
//         $effect.pre(() => {
//             if (this._destroyed) throw new AlreadyDestroyedError()
//             if (this.onMount) {
//                 $effect(() => {
//                     untrack(() => this.onMount!())
//                 }, 'onmount callback')
//             }
//             return render(this.attachTo)
//         }, 'c-' + name)
//     }
//
//     readonly onMount: undefined | (() => {})
//
//     destroy() {
//         if (this._destroyed) throw new AlreadyDestroyedError()
//         this._destroyed = true
//     }
// }
//
/**
 * Returns a function that creates a component, which is actually just a
 * @param attachTo
 * @param render function that is called when the component is instantiated and returns a destroy function
 * @param name
 */
export function $component<Props extends { [key: string]: any }>(
    render: (node: Element, props: Props) => (() => void) | void,
    name?: string,
) {
    return (node: Element, props: Props, lastname?: '') => {
        $effect.pre(
            () => {
                return render(node, props)
            },
            '' + (name || '') + (lastname || ''),
        )
    }
    // return new NanoComponent(attachTo, render, name)
}

export type ChildrenDestroy = () => void
export type Children = (node: Element) => ChildrenDestroy

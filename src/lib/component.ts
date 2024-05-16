import { $effect } from './'

// The global renderable element. This essentially
export type RenderableElement = Element

// A destruction function for when the children are destroyed
export type ChildrenDestroy = () => void

// A function that is passed as children, essentially a render function with a return that removes whatever was rendered
export type Children<T extends RenderableElement> = (node: T) => ChildrenDestroy

/**
 * Returns a function that creates a component, which is actually just an {@link $effect.pre} wrapper with
 * some props being able to passed to it.
 *
 * Because it's wrapped in an {@link $effect}, this means it will be destroyed automatically when the effect
 * is destroyed, meaning it doesn't need to manually dismounted. It just needs to be in an effect context.
 *
 * @param attachTo node to attach
 * @param render function that is called when the component is instantiated and returns a destroy function
 * @param name
 */
export function $component<
    Props extends { children?: Children<Q>; [key: string]: any },
    Q extends RenderableElement = any,
    // TODO make it so that props is optional when Props is empty in a type-safe manner
>(
    render: (node: RenderableElement, props: Props) => (() => void) | void,
    /* DEBUG START */
    name?: string,
    /* DEBUG END */
) {
    return (
        node: RenderableElement,
        props: Props,
        /* DEBUG START */
        lastname?: string,
        /* DEBUG END */
    ) => {
        $effect.pre(
            () => {
                return render(node, props)
            },
            /* DEBUG START */
            '' + (name || '') + (lastname || ''),
            /* DEBUG END */
        )
    }
}

/**
 * @fileoverview This module provides utilities for manipulating the DOM, just to make things
 * a little less verbose.
 *
 * The functions that start with a dollar sign are special because they return a function
 * that reverses what they created to begin with, allowing easy ability to do something like
 *
 * ```typescript
 * $effect(() => $innertext(node, $get(helloWorld)))
 * ```
 */

import { $effect, $get, $set } from './effect.ts'
import { ParseSelector } from 'typed-query-selector/parser'
import { Source } from './source.ts'

class Html {
    static parser = new DOMParser()
    doc: Document

    constructor(html: string) {
        this.doc = Html.parser.parseFromString(html, 'text/html')
    }
}

/**
 * Parses the html string and returns the body element that contains them. Appends two helper functions,
 * `$` which acts as the shortcut for `querySelector` except returns an array rather than an iterator.
 * And `$all` which acts as a shortcut for `querySelectorAll`.
 *
 * ```typescript
 * const {$} = html(`<div><span>hello</span><span>world</span></div>`)
 * const div = $('div')
 * const [span1, span2] = $all('span')
 * ````
 * @param html
 */
export function html(html: string) {
    const body = new Html(html).doc.body

    function $<T extends string>(str: T) {
        return body.querySelector(str) as ParseSelector<typeof str> | null
    }

    function $all<T extends string>(str: T) {
        return [...body.querySelectorAll(str)] as (ParseSelector<typeof str> | undefined)[]
    }

    // @ts-expect-error
    body.$ = $
    // @ts-expect-error
    body.$all = $all
    return body as HTMLElement & {
        $: typeof $
        $all: typeof $all
    }
}

/**
 * Creates a two-way binding through event listeners and property modifications. By default, `$bind` is
 * set up for inputs. It uses the `input` listener to listen for changes and changes the `input.value`
 * property. This can be overridden through changing the {@link property} and {@link triggers} args.
 *
 * @param element
 * @param source
 * @param property
 * @param triggers
 */
export function $bind<T extends EventTarget>(
    element: T,
    source: Source<any>,
    ...[property, triggers]: T extends HTMLInputElement
        ? [property?: keyof T, triggers?: (keyof T)[]]
        : [property: keyof T, triggers: (keyof T)[]]
) {
    const actualProperty = ('value' in element && property === undefined ? 'value' : property) as keyof T
    for (const trigger of triggers || ['input']) {
        element.addEventListener(trigger.toString(), () => $set(source, element[actualProperty]))
    }

    $effect(
        () => (element[actualProperty] = $get(source)),
        /* DEBUG START */
        'change element ' + (property === undefined ? '' : property),
        /* DEBUG END */
    )
}

/**
 * Assigns a child to a parent. Returns a function that removes the child.
 *
 * @param parent
 * @param child
 */
export function $child<T extends Element, Q extends ChildNode>(parent: T, child: Q) {
    parent.appendChild(child)
    return () => parent.removeChild(child)
}

/**
 * Adds multiple children to the parent and returns a function that removes
 * the children.
 *
 * @param parent
 * @param children
 */
export function $children<T extends Element, Q extends ChildNode[]>(parent: T, ...children: Q) {
    children.forEach((child) => parent.appendChild(child))
    return () => {
        children.forEach((child) => parent.removeChild(child))
    }
}

/**
 * Adds a class and returns a function that removes the class.
 * @param element
 * @param className
 */
export function $class<T extends Element>(element: T, className: string) {
    element.classList.add(className)
    return () => element.classList.remove(className)
}

/**
 * Inverse of {@link $class}, removes a class and returns a function that
 * adds the class back in.
 * @param element
 * @param className
 */
$class.remove = function <T extends Element>(element: T, className: string) {
    element.classList.remove(className)
    return () => element.classList.add(className)
}

export function $before<T extends Element, Q extends Node[]>(olderBrother: T, ...siblings: Q) {
    const parent = olderBrother.parentNode!
    siblings.reduce((previousSibling, current) => {
        parent.insertBefore(current, previousSibling)
        return current
    }, olderBrother)
    return () => {
        siblings.forEach((child) => child.parentNode?.removeChild(child))
    }
}

export function $after<T extends Element, Q extends Node[]>(olderBrother: T, ...siblings: Q) {
    const parent = olderBrother.parentNode!
    siblings.reduce((previousSibling, current) => {
        parent.insertBefore(current, previousSibling.nextSibling)
        return current
    }, olderBrother)
    return () => {
        siblings.forEach((child) => child.parentNode?.removeChild(child))
    }
}

/**
 * Creates an element, shortcut for {@link document.createElement}
 */
export const create = ((tag: string) => document.createElement(tag)) as (typeof document)['createElement']

/**
 * Reactive shortcuts for the window
 */
export const $window: {
    /**
     * Adds an event listener to the window, returns a function
     * that removes the event listener.
     *
     * ```typescript
     * $effect(() => $window.listen("resize", () => console.log("resizing!")))
     * ```
     * @param type
     * @param listener
     * @param options
     */
    listen: <Q extends keyof WindowEventMap>(
        type: Q,
        listener: (this: Window, ev: WindowEventMap[Q]) => any,
        options?: boolean | AddEventListenerOptions | undefined,
    ) => () => void
} = {
    listen: function (type, listener, options) {
        window.addEventListener(type, listener, options)
        return () => window.removeEventListener(type, listener, options)
    },
}

// type Render<T> = (val: T, index: number) => { nodes: ChildNode[]; update: Render<T> }
// class EachItem<T, Q> {
//     prev: EachItem<T, Q> | undefined
//     next: EachItem<T, Q> | undefined
//
//     constructor(
//         public readonly value: T,
//         public readonly nodes: Node[],
//         public readonly update: Render<T>,
//     ) {}
// }

// class EachSnapshot<T, Q> {
//     list = new Map<Q, EachItem<T, Q>>()
//
//     compare() {}
// }
//
// export function $each<T, Q>(renderList: Source<T[]>, render: Render<T>, eachKey: (val: T, index: number) => Q) {
//     const map = new Map<Q, { value: T; nodes: Node[]; update: Render<T> }>()
//
//     // We need to get the difference between a re-run and a destruction
//     $effect.pre(
//         () => {
//             const list = $get(renderList).map((val, i) => [eachKey(val, i), { val, i }] as const)
//
//             const keySet = new Set(list.map(([q]) => q))
//             if (keySet.size !== list.length) Error(`Illegal duplicate key for $each loop detected`)
//
//             const oldMap = new Map(map.entries())
//             map.clear()
//
//             // Add in the new ones first
//             for (const [key, { val, i }] of list) {
//                 const oldInstance = oldMap.get(key)!
//                 if (oldInstance) {
//                     // Update!
//                     if (oldInstance.value !== val) {
//                         // Different key, re-run
//                         oldInstance.update(val, i)
//                     }
//
//                     // Move maybe?
//                     // if ()
//                 } else {
//                     // Old instance doesn't exist - create!
//                 }
//             }
//
//             return (destroying) => {
//                 if (destroying) {
//                     map.forEach(({ nodes }) => {
//                         nodes.forEach((node) => node.remove())
//                     })
//                 }
//             }
//         },
//         /* DEBUG START */
//         'each',
//         /* DEBUG END */
//     )
// }

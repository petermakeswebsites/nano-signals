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

import { $effect } from './effect.ts'
import { Children, RenderableElement } from './component.ts'

/**
 * Sets the innertext of a node, and returns a function that sets it back to
 * nothing
 *
 * **Example:**
 * ```typescript
 * $effect(() => $innertext(node, $get(helloWorld)))
 * ```
 * @param node
 * @param text
 */
export function $innertext(node: { innerText: string }, text: string) {
    node.innerText = text
    return () => (node.innerText = '')
}

/**
 * Sets the innertext of a node, and returns a function that sets it back to
 * nothing
 *
 * **Example:**
 * ```typescript
 * $effect(() => $innerhtml(node, `<p>${$get(helloWorld)}</p>`))
 * ```
 * @param node
 * @param text
 */
export function $innerhtml(node: { innerHTML: string }, text: string) {
    node.innerHTML = text
    return () => (node.innerHTML = '')
}

/**
 * Creates a simple text node
 * @param str
 */
export function text(str: string) {
    return document.createTextNode(str)
}

/**
 * Parses the html string and returns the elements inside
 * @param html
 */
export function html(html: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return [...doc.body.childNodes]
}

/**
 *
 */
export function $if<T extends RenderableElement>(
    node: T,
    fn: () => boolean,
    render: Children<T>,
    or?: Children<T> | undefined,
    name?: string,
) {
    $effect.pre(
        () => {
            if (fn()) {
                return render(node)
            } else {
                if (or) return or(node)
            }
        },
        'then ' + (name || ''),
    )
}

/**
 * Assigns a child to a parent
 * @param parent
 * @param child
 */
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

export function create<T extends keyof HTMLElementTagNameMap>(tagName: T): HTMLElementTagNameMap[T]
export function create<T extends keyof SVGElementTagNameMap>(tagName: T): SVGElementTagNameMap[T]
export function create<T extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
    tagName: T,
): HTMLElement | SVGElement {
    const element = document.createElement(tagName)
    return element
}

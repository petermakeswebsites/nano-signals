import { Effect } from './effect.ts'
import { Derived } from './derived.ts'

/**
 * The simplest signal, it remembers who (which effect) got it,
 * and calls that effect when it next changes
 */
export class Source<T> {
    value: T

    constructor(def: T) {
        this.value = def
    }

    rx = new Set<Effect<any> | Derived<any>>()
}

export function $source<T>(def: T) {
    return new Source(def)
}

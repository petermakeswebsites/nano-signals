import { $set, Effect } from './effect.ts'
import { Derived } from './derived.ts'
import { Inspector } from './inspect.ts'

/**
 * The simplest signal, it remembers who (which effect) got it,
 * and calls that effect when it next changes
 */
export class Source<T> {
    value: T

    weakref = new WeakRef<Source<T>>(this)

    constructor(def: T, name?: string) {
        if (Inspector.inspecting) {
            Inspector._newItem(this.weakref, name)
            Inspector._updateValue(this.weakref, def)
        }
        this.value = def
    }

    set(val: T) {
        $set(this, val)
    }

    rx = new Set<Effect<any> | Derived<any>>()
}

export function $source<T>(def: T, name?: string) {
    return new Source(def, name)
}

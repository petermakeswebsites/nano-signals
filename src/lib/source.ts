import { $set, Effect } from './effect.ts'
import { Derived } from './derived.ts'

/* DEBUG START */
import { Inspector } from './inspect.ts'

/* DEBUG END */

/**
 * The simplest signal, it remembers who (which effect) retrieved it through {@link $get}, via
 * the {@link DepCollector}, and marks dirty when changes, then processes to see whether to run
 * its reactions.
 */
export class Source<T> {
    value: T

    /* DEBUG START */
    /**
     * Used for the {@link Inspector} tracking when its garbage collected
     */
    weakref = new WeakRef<Source<T>>(this)

    /* DEBUG END */

    constructor(
        def: T,
        /* DEBUG START */
        name?: string,
        /* DEBUG END */
    ) {
        /* DEBUG START */
        if (Inspector.inspecting) {
            Inspector._newItem(this.weakref, name)
            Inspector._updateValue(this.weakref, def)
        }
        /* DEBUG END */
        this.value = def
    }

    /**
     * Mainly for debug purposes, a handy way to reactively set the value
     * @param val
     */
    set(val: T) {
        $set(this, val)
    }

    /**
     * List of reactions managed through {@link DepCollector}
     */
    rx = new Set<Effect<any> | Derived<any>>()
}

/**
 * Shorthand for a {@link Source}, the simplest signal
 * @param def
 * @param name
 */
export function $source<T>(def: T, name?: string) {
    return new Source(def, name)
}

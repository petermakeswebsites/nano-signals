import { Source } from './source'
import { type Effect } from './effect.ts'
import { collect_deps, disconnect_deps } from './collector.ts'
import { Flag } from './dirtiness.ts'
/* DEBUG START */
import { Inspector } from './inspect.ts'
/* DEBUG END */

/**
 * An effect and a source back-to-back, stores values
 */
export class Derived<T> {
    rx = new Set<Effect<any> | Derived<any>>()
    deps = new Set<Derived<any> | Source<any>>()
    flag = Flag.DIRTY
    _value: T

    /* DEBUG START */
    weakref = new WeakRef<Derived<T>>(this)
    /* DEBUG END */

    /**
     * Get value, will update if value is dirty
     */
    get value() {
        if (this.flag === Flag.DIRTY) {
            disconnect_deps(this)
            /* DEBUG START */
            const oldValue = this._value
            /* DEBUG END */
            this._value = collect_deps(this.fn, this)
            this.flag = Flag.CLEAN
            /* DEBUG START */
            if (Inspector.inspecting) {
                if (oldValue !== this._value) Inspector._updateValue(this.weakref, this._value)
                Inspector._registerDirtinessChange(this.weakref, Flag.CLEAN)
            }
            /* DEBUG END */
        }
        return this._value
    }

    constructor(
        public readonly fn: () => T,
        /* DEBUG START */
        name?: string,
        /* DEBUG END */
    ) {
        /* DEBUG START */
        if (Inspector.inspecting) Inspector._newItem(this.weakref, name)
        /* DEBUG END */

        // We basically set up a private root with a private effect.
        // This root might have no owner, or it might be owned by another root
        // Not exactly sure if this reflects Svelte's implementation
        this._value = collect_deps(fn, this)
        /* DEBUG START */
        if (Inspector.inspecting) Inspector._updateValue(this.weakref, this._value)
        /* DEBUG END */

        this.flag = Flag.CLEAN
        /* DEBUG START */
        if (Inspector.inspecting) Inspector._registerDirtinessChange(this.weakref, Flag.CLEAN)
        /* DEBUG END */
    }
}

export function $derived<T>(
    fn: () => T,
    /* DEBUG START */
    name?: string,
    /* DEBUG END */
) {
    return new Derived(
        fn,
        /* DEBUG START */
        name,
        /* DEBUG END */
    )
}

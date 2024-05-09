import { Source } from './source'
import { type Effect } from './effect.ts'
import { collect_deps, disconnect_deps } from './collector.ts'
import { Inspector } from './inspect.ts'

import { Flag } from './dirtiness.ts'

/**
 * An effect and a source back-to-back, stores values
 */
export class Derived<T> {
    rx = new Set<Effect<any> | Derived<any>>()
    deps = new Set<Derived<any> | Source<any>>()
    weakref = new WeakRef<Derived<T>>(this)
    flag = Flag.DIRTY
    _value: T

    /**
     * Get value, will update if value is dirty
     */
    get value() {
        if (this.flag === Flag.DIRTY) {
            disconnect_deps(this)
            this._value = collect_deps(this.fn, this)
            this.flag = Flag.CLEAN
            if (Inspector) {
                Inspector._updateValue(this.weakref, this._value)
                Inspector._registerDirtinessChange(this.weakref, Flag.CLEAN)
            }
        }
        return this._value
    }

    constructor(
        public readonly fn: () => T,
        name?: string,
    ) {
        if (Inspector.inspecting) Inspector._newItem(this.weakref, name)

        // We basically set up a private root with a private effect.
        // This root might have no owner, or it might be owned by another root
        // Not exactly sure if this reflects Svelte's implementation
        this._value = collect_deps(fn, this)

        this.flag = Flag.CLEAN
        if (Inspector)
            Inspector._registerDirtinessChange(this.weakref, Flag.CLEAN)
    }
}

export function $derived<T>(fn: () => T, name?: string) {
    return new Derived(fn, name)
}

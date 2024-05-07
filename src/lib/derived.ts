import { Source } from './source'
import { type Effect } from './effect.ts'
import { Flag } from './batch.ts'
import { collect_deps } from './collector.ts'

/**
 * An effect and a source back-to-back, stores values
 */
export class Derived<T> {
    rx = new Set<Effect<any> | Derived<any>>()
    deps = new Set<Derived<any> | Source<any>>()
    flag = Flag.DIRTY
    _value: T
    get value() {
        if (this.flag === Flag.DIRTY) {
            this._value = collect_deps(this.fn, this)
            Flag.CLEAN
        }
        return this._value
    }

    constructor(public readonly fn: () => T) {
        // We basically set up a private root with a private effect.
        // This root might have no owner, or it might be owned by another root
        // Not exactly sure if this reflects Svelte's implementation
        this._value = collect_deps(fn, this)
        this.flag = Flag.CLEAN
    }
}

export function $derived<T>(fn: () => T) {
    return new Derived(fn)
}

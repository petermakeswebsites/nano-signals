import { Effect } from './effect.ts'
import { Derived } from './derived.ts'
import { Source } from './source.ts'
import { Inspector } from './inspect.ts'

/**
 * This is our dependency collector. It essentially tracks the context
 * when calling a {@link $get}, makes connections. It is used for both {@link Derived}s
 * and {@link Effect}s. Both of these, when called, create a context where any synchronous
 * {@link $get} will result in a connection being made.
 *
 * Prior to every collection, the dependencies of the Derived or Effect are removed - both ways.
 * The reactions are removed from the signal, and the deps are removed from the Derived or Effect.
 * But this is handled outside the DepCollector, just a side note.
 */
export class DepCollector<T> {
    static untrack = false
    static currentCollecting: DepCollector<any> | undefined
    constructor(
        fn: () => T,
        public readonly recordingReaction: Effect<any> | Derived<any>,
    ) {
        // We want to remember the context of where we are tracking from
        const old = DepCollector.currentCollecting

        // We also want to remember whether we were untracking before we started this
        // Every time a new tracking context is created, we disable the untracking flag
        const oldUntrack = DepCollector.untrack

        DepCollector.untrack = false
        DepCollector.currentCollecting = this
        this.result = fn()

        // Reset back to the old ones
        DepCollector.currentCollecting = old
        DepCollector.untrack = oldUntrack
    }

    /**
     * Helper function that allows the easy adding of deps and reactions
     * @param dep
     */
    add(dep: Source<any> | Derived<any>) {
        if (!DepCollector.untrack) {
            if (Inspector.inspecting) Inspector._createRx(dep.weakref, this.recordingReaction.weakref)
            this.recordingReaction.deps.add(dep)
            dep.rx.add(this.recordingReaction)
        }
    }

    /**
     * The result which can be passed back and the end of the function, see {@link collect_deps}
     */
    readonly result: T
}

/**
 * Collect dependencies and reactions from a function call, {@link DepCollector}
 * @param fn the function which may have getters we desire to track in the effect or derived context
 * @param recordingReaction the effect or derived context
 * @returns the return value of the passed function
 */
export function collect_deps<T>(fn: () => T, recordingReaction: Effect<any> | Derived<any>) {
    // Notice how we return the result here, to preserve the return value of the passed function
    return new DepCollector(fn, recordingReaction).result
}

/**
 * For this particular level of collection context (derived or effect), cease to record
 * any reactions or dependencies
 * @param fn
 */
export function untrack<T>(fn: () => T) {
    const oldUntrack = DepCollector.untrack
    DepCollector.untrack = false
    const res = fn()
    DepCollector.untrack = oldUntrack
    return res
}

/**
 * Remove all dependencies associated with {@link receiver}. This also removes
 * the "backlinks" of reactions from the dependencies back to the {@link receiver}.
 * @param receiver
 */
export function disconnect_deps(receiver: Effect<any> | Derived<any>) {
    for (const d of [...receiver.deps]) {
        if (Inspector.inspecting) {
            Inspector._removeRx(d.weakref, receiver.weakref)
        }
        receiver.deps.delete(d)
        d.rx.delete(receiver)
    }
}

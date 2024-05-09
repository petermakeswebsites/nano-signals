import { Effect } from './effect.ts'
import { Derived } from './derived.ts'
import { Source } from './source.ts'
import { Inspector } from './inspect.ts'

export class DepCollector<T> {
    static untrack = false
    static currentCollecting: DepCollector<any> | undefined
    constructor(
        fn: () => T,
        public readonly recordingReaction: Effect<any> | Derived<any>,
    ) {
        const old = DepCollector.currentCollecting
        const oldUntrack = DepCollector.untrack
        DepCollector.untrack = false
        DepCollector.currentCollecting = this
        this.result = fn()
        DepCollector.currentCollecting = old
        DepCollector.untrack = oldUntrack
    }

    add(dep: Source<any> | Derived<any>) {
        if (!DepCollector.untrack) {
            if (Inspector.inspecting) Inspector._createRx(dep.weakref, this.recordingReaction.weakref)
            this.recordingReaction.deps.add(dep)
            dep.rx.add(this.recordingReaction)
        }
    }

    readonly result: T
}

export function collect_deps<T>(fn: () => T, recordingReaction: Effect<any> | Derived<any>) {
    return new DepCollector(fn, recordingReaction).result
}

export function untrack<T>(fn: () => T) {
    const oldUntrack = DepCollector.untrack
    DepCollector.untrack = false
    const res = fn()
    DepCollector.untrack = oldUntrack
    return res
}

export function disconnect_deps(fx: Effect<any> | Derived<any>) {
    for (const d of [...fx.deps]) {
        if (Inspector.inspecting) {
            Inspector._removeRx(d.weakref, fx.weakref)
        }
        fx.deps.delete(d)
        d.rx.delete(fx)
    }
}

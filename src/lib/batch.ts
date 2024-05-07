import { Effect } from './effect.ts'
import { Derived } from './derived.ts'

/**
 * Batch creates a context where signals and deriveds and effects can be postponed
 * until they need to be read. For example, if we know we're going to be making changes
 * to multiple signals, we wrap them in a batch. "Inside" the batch, the deriveds are still
 * marked as dirty
 */
export class Batch<T> {
    static currentBatch: Batch<any> | undefined
    static createIfNone(fn: (batch: Batch<any>) => any): void {
        if (this.currentBatch) {
            fn(this.currentBatch)
        } else {
            new Batch(fn)
        }
    }
    queue: Set<Effect<any>> = new Set()
    add(effect: Effect<any>) {
        this.queue.add(effect)
    }
    readonly final: T
    constructor(fn: (batch: Batch<T>) => T) {
        if (Batch.currentBatch)
            throw new Error(
                `A batch was created but there was already one in progress`,
            )
        Batch.currentBatch = this
        this.final = fn(this)
        Batch.currentBatch = undefined
        if (this.queue.size) this.runAll()
    }

    runAll() {
        new Batch(() => {
            for (const effect of this.queue) {
                effect.rerun()
            }
        })
    }
}

export function $batch<T>(fn: () => T): T {
    return new Batch(fn).final
}

export enum Flag {
    DIRTY,
    CLEAN,
}

/**
 * Recursively marks dirty, taking advantage of the fact that we know the
 * reactions of all deriveds. But! We don't know effects. So the most we can do
 * is mark the effect dirty.
 * @param source
 */
export function mark_dirty_recursive(source: Effect<any> | Derived<any>) {
    if (source instanceof Derived) {
        source.flag = Flag.DIRTY
        source.rx.forEach((effect) => {
            mark_dirty_recursive(effect)
        })
    } else {
        Batch.currentBatch!.add(source)
    }
}

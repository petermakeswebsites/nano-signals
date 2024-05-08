import { Effect } from './effect.ts'
import { Derived } from './derived.ts'
import { Inspector } from './inspect.ts'

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
        if (Inspector.inspecting) {
            Inspector._registerPendingEffect(effect.weakref)
        }
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
        const next = () => {
            new Batch(() => {
                for (const effect of this.queue) {
                    if (!effect.destroyed) {
                        if (Inspector.inspecting)
                            Inspector._removePendingEffect(effect.weakref)
                        effect.rerun()
                    }
                }
            })
        }
        if (Inspector.inspecting && Inspector.stepping) {
            Inspector._setNextStep(next)
        } else {
            next()
        }
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
    // Deriveds should go first, they're higher priority
    if (source instanceof Derived) {
        source.flag = Flag.DIRTY
        Inspector._registerMarkDirty(source.weakref)
        source.rx.forEach((effectOrDerived) => {
            mark_dirty_recursive(effectOrDerived)
        })
    } else {
        Batch.currentBatch!.add(source)
    }
}

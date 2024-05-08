import { Source } from './source.ts'
import { Derived } from './derived.ts'
import { Batch, mark_dirty_recursive } from './batch.ts'
import { collect_deps, DepCollector, disconnect_deps } from './collector.ts'
import { Inspector } from './inspect.ts'

export function _resetAllGlobalTrackers() {
    rootContext = null
}

/**
 * The root that owns the current effect. See {@link EffectRoot}
 */
let rootContext: EffectRoot | null = null

/**
 *
 */
export type EffectCleanup<T> = ((destroy: boolean) => T) | void

/**
 *
 */
export type EffectFn<T> = (previous: T | undefined) => EffectCleanup<T>

/**
 * Creates a context that tracks when a getter is encountered
 */
export class Effect<T> {
    destroyed = false
    /**
     * Cleanup function (return of effect)
     */
    // @ts-expect-error it is assigned in the constructor
    cleanup: EffectCleanup<T>

    /**
     * Tracking the signals that will signal this effect
     */
    deps = new Set<Source<any> | Derived<any>>()

    weakref = new WeakRef(this)

    constructor(
        public readonly fn: EffectFn<T>,
        name?: string,
    ) {
        if (Inspector.inspecting) {
            if (!name) console.trace('Effect created without name!', this)
            Inspector._newItem(this.weakref, name)
        }
        if (!rootContext!) throw new Error(`Cannot create effect without root`)
        rootContext.addEffect(this)
        // Set cleanup
        this.rerun()
    }

    /**
     * Disconnect deps and signals, re-run the function,
     * and refresh signals (because they might change!)
     */
    rerun() {
        if (this.destroyed)
            throw new Error(
                `Effect was destroyed, should not have been re-run!`,
            )
        const memory = this.cleanup ? this.cleanup(false) : undefined

        // Remove deps
        disconnect_deps(this)

        this.cleanup = collect_deps(
            () => this.fn(memory as T | undefined),
            this,
        )
    }

    /**
     * Run cleanup and remove disconnect deps. This will always be called
     * from a root, and so we will never have to tell the root to remove the link
     * to this
     */
    destroy() {
        disconnect_deps(this)
        this.destroyed = true

        // One last cleanup, without setting tracking
        if (this.cleanup) this.cleanup(true)

        this.cleanup = undefined
        if (Inspector.inspecting) Inspector._destroyItem(this.weakref)
    }
}

/**
 * Creates a "root" for all effects. It creates a context where
 * all the effects that are created automatically link to it. That way,
 * the lifecycle of all the child affects can be handled by a parent.
 * This allows the destruction of all effects by destroying the effect root,
 * preventing memory leaks.
 */
export class EffectRoot {
    destroyed = false
    rootDestroy: void | (() => void)

    /**
     * Create an effect context
     * @param fn what to run inside the root - returns a cleanup function to run
     */
    constructor(
        fn: () => (() => void) | void,
        public readonly name?: string,
    ) {
        const oldRoot = rootContext
        rootContext = this
        this.rootDestroy = fn()
        rootContext = oldRoot
    }

    /**
     * Direct effect descendents of this root
     */
    effects = new Set<Effect<any>>()

    addEffect(effect: Effect<any>) {
        this.effects.add(effect)
    }

    /**
     * Recursively destroy all child roots and effects,
     * then destroy this one
     */
    destroy() {
        for (const effect of [...this.effects]) {
            effect.destroy()
            this.effects.delete(effect)
        }
        this.rootDestroy?.()
        this.destroyed = true
    }
}

export function $root(fn: () => void | (() => void), name?: string) {
    return new EffectRoot(fn, name)
}

/**
 * See {@link Effect}
 * @param fn
 */
export function $effect<T>(fn: EffectFn<T>, name?: string) {
    return new Effect(fn, name)
}

/**
 * Gets a value from a source. You can get the value (non-tracked) directly
 * by doing source.value. Using $get takes note of the effect context,
 * and sets up a reaction relationship
 * @param source
 */
export function $get<T>(source: Source<T> | Derived<T>): T {
    DepCollector.currentCollecting?.add(source)
    return source.value
}

/**
 * Sets a source to a particular value. If the value changes, react accordingly
 * @param source
 * @param newValue
 */
export function $set<T>(source: Source<T>, newValue: T): void {
    const changed = newValue !== source.value
    if (!changed) return

    // In case we have no batch, we'll create a batch context
    // this will prevent effects & deriveds from re-running unnecessarily
    // by marking potential dirty effects & deriveds and only calculating them
    // a) if we need a value that depends on one of them (and they're dirty), or
    // b) if the batch ends
    // When the batch ends, a new batch is created
    Batch.createIfNone(() => {
        source.value = newValue

        // The spread operator is necessary here because sets get weird
        // if modified while in use
        for (const effect of [...source.rx]) {
            mark_dirty_recursive(effect)
        }
    })
}

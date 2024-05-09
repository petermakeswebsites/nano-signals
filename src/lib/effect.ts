import { Source } from './source.ts'
import { Derived } from './derived.ts'
import { collect_deps, DepCollector, disconnect_deps } from './collector.ts'
import { Inspector } from './inspect.ts'
import { queue_microtask_effect } from './microtask.ts'
import { Call, check_if_dirty, Flag, mark_dirty_recursive } from './dirtiness.ts'

export function _reset_all_global_trackers() {
    rootContext = null
}

/**
 * The root that owns the current effect. See {@link EffectRoot}
 */
let rootContext: EffectRoot | Effect<any> | null = null

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
     * The only time parent is null is during the destroy callback,
     */
    parent: EffectRoot | Effect<any> | null = null
    children = new Set<Effect<any>>()
    addEffect(effect: Effect<any>) {
        this.children.add(effect)
    }

    get root(): EffectRoot {
        if (!this.parent) throw new Error('orphaned effect!')
        if (this.parent instanceof EffectRoot) return this.parent
        return this.parent.root
    }

    /**
     * Tracking the signals that will signal this effect
     */
    deps = new Set<Source<any> | Derived<any>>()
    weakref = new WeakRef(this)

    constructor(
        public readonly fn: EffectFn<T>,
        pre: boolean = false,
        name?: string,
    ) {
        // this.flag = Flag.DIRTY
        if (Inspector.inspecting) {
            if (!name) console.trace('Effect created without name!', this)
            Inspector._newItem(this.weakref, name)
            // Inspector._registerDirtinessChange(this.weakref, Flag.DIRTY)
        }
        if (!rootContext) throw new Error(`Cannot create effect without root`)

        if (Inspector.inspecting) Inspector._createEffectRelation(rootContext.weakref, this.weakref)
        rootContext.addEffect(this)
        this.parent = rootContext

        // Set cleanup
        if (pre) {
            this.rerun()
        } else {
            // Inspector dirtiness is handled inside this function
            queue_microtask_effect(this, Flag.DIRTY)
        }
    }

    /**
     * SHOULD ONLY CALL IF MAYBE_DIRTY! If dirty, run right away.
     *
     * Gauges whether this effect should run based on the dirtiness of its
     * deps. Returns true if *any* deps are dirty.
     *
     * Actually, without any deps, shouldRun would never be called because
     * it would never be "marked" for a microtask check, since nothing would
     * have it as a reaction.
     */
    process_deps_dirtiness() {
        // Here's my logic. So basically, if this effect was added to queue (where this should be called from)
        // it would definitely be dirty on not maybe dirty. shouldRun() is only called when this is maybe dirty.
        // Therefor this function would not call. This means that its deps are a mix of either two
        // options: clean sources, maybe derived, clean derived, or dirty deriveds.
        //
        // What this means is that all potential effects that could have created this combination would
        // have already been marked as maybes, therefore we would not need to ever mark this, which is
        // why check_if_dirty doesn't mark effects.
        return [...this.deps].some((dep) => check_if_dirty(dep) === Flag.DIRTY) ? Flag.DIRTY : Flag.CLEAN
    }

    /**
     * Disconnect deps and signals, re-run the function,
     * and refresh signals (because they might change!)
     */
    rerun() {
        if (this.destroyed) throw new Error(`Effect was destroyed, should not have been re-run!`)
        const memory = this.cleanup ? this.cleanup(false) : undefined

        // Remove deps
        disconnect_deps(this)

        this.destroy_children()

        const oldRootContext = rootContext
        rootContext = this
        this.cleanup = collect_deps(() => this.fn(memory as T | undefined), this)
        rootContext = oldRootContext

        // this.flag = Flag.CLEAN
        // if (Inspector.inspecting) {
        //     Inspector._registerDirtinessChange(this.weakref, Flag.CLEAN)
        // }
    }

    destroy_children() {
        // Cleanup children
        for (const child of [...this.children]) {
            this.children.delete(child)
            child.parent = null
            if (Inspector.inspecting) Inspector._destroyEffectRelation(this.weakref, child.weakref)
            child.destroy()
        }
    }

    /**
     * Run cleanup and remove disconnect deps. This will always be called
     * from a root, and so we will never have to tell the root to remove the link
     * to this
     */
    destroy() {
        disconnect_deps(this)
        this.destroyed = true
        this.destroy_children()

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
    weakref = new WeakRef<EffectRoot>(this)

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
        if (Inspector.inspecting) Inspector._newItem(this.weakref, name)
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
     */
    destroy() {
        for (const effect of [...this.effects]) {
            effect.destroy()
            this.effects.delete(effect)
        }
        if (Inspector.inspecting) Inspector._destroyItem(this.weakref)
        this.rootDestroy?.()
        this.destroyed = true
    }
}

export function $root(fn: () => void | (() => void), name?: string) {
    return new EffectRoot(fn, name)
}

// Define an interface that extends the function type
interface EffectFunction {
    <T>(fn: EffectFn<T>, name?: string): Effect<T>
    pre: <T>(fn: EffectFn<T>, name?: string) => Effect<T>
}

// Implement the interface
const effect: EffectFunction = <T>(fn: EffectFn<T>, name?: string) => {
    return new Effect(fn, false, name)
}

// Define the pre method on effect
effect.pre = <T>(fn: EffectFn<T>, name?: string): Effect<T> => {
    return new Effect(fn, true, name)
}

/**
 * Initial function is fired after the microtask
 * See {@link Effect}
 * @param fn
 */
export function $effect<T>(fn: EffectFn<T>, name?: string) {
    return new Effect(fn, false, name)
}

/**
 * Initial function is fired synchronously
 * @param fn
 * @param name
 */
$effect.pre = function <T>(fn: EffectFn<T>, name?: string): Effect<T> {
    return new Effect(fn, true, name)
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
 * Sets a source to a particular value. If the value changes, react accordingly by marking
 * all reactions as dirty for them to be calculated at the next microtask. If the value is the
 * same, do not do anything.
 * @param source
 * @param newValue
 */
export function $set<T>(source: Source<T>, newValue: T): void {
    const changed = newValue !== source.value
    if (!changed) return

    source.value = newValue

    // If inspecting, lets trigger that we updated the value
    if (Inspector.inspecting) Inspector._updateValue(source.weakref, newValue)

    // The spread operator is necessary here because sets get weird
    // if modified while in use
    for (const effectOrDerived of [...source.rx]) {
        mark_dirty_recursive(effectOrDerived, Call.INITIAL)
    }
}

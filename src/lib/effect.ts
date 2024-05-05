import {Source} from "./source.ts";
import {Derived} from "./derived.ts";

/**
 * What "tracking" context - or effect - are we in?
 * This is a global variable that can be accessed during a
 * {@link $get} phase that links the signal to the effect
 * calling it.
 */
let effectContext: Effect<any> | null = null;

/**
 * The root that owns the current effect. See {@link EffectRoot}
 */
let root: EffectRoot | null = null;

/**
 * Are we bypassing effects?
 */
let untrackEnabled = false;

/**
 *
 */
type EffectCleanup<T> = ((destroy : boolean) => T) | void

/**
 *
 */
type EffectFn<T> = (previous : T | undefined) => (EffectCleanup<T>)

/**
 * Creates a context that tracks when a getter is encountered
 */
export class Effect<T> {
    /**
     * Cleanup function (return of effect)
     */
        // @ts-expect-error it is assigned in the constructor
    cleanup: EffectCleanup<T>

    /**
     * Tracking the signals that will signal this effect
     */
    deps = new Set<Source<any> | Derived<any>>();

    constructor(public readonly fn: EffectFn<T>) {
        if (!root) {
            throw new Error(`Attempting to create an effect outside of an effect root!`)
        }

        root.addEffect(this)

        // Remember original tracking state
        const originalUntrack = untrackEnabled;
        // Set current tracking state
        untrackEnabled = false;

        // Set cleanup
        this.rerun()

        // Re-set to original tracking state
        untrackEnabled = originalUntrack;
    }

    /**
     * Disconnect signals and sources
     */
    disconnectFromSources() {
        for (const dep of [...this.deps]) {
            dep.rx.delete(this);
            this.deps.delete(dep);
        }
    }

    /**
     * Disconnect deps and signals, re-run the function,
     * and refresh signals (because they might change!)
     */
    rerun() {
        const memory = this.cleanup ? this.cleanup(false) : undefined

        // Remove deps
        this.disconnectFromSources();

        // Store original effect context and set this one to capture signals in the re-run
        const originalEffectContext = effectContext;
        effectContext = this;

        this.cleanup = this.fn(memory as T | undefined)

        // Restore original effect context
        effectContext = originalEffectContext;
    }

    /**
     * Run cleanup and remove disconnect deps. This will always be called
     * from a root, and so we will never have to tell the root to remove the link
     * to this
     */
    destroy() {
        this.disconnectFromSources();

        // One last cleanup, without setting tracking
        if (this.cleanup) this.cleanup(true);
        this.cleanup = undefined;
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
    rootDestroy: void | (() => void)

    /**
     * Create an effect context
     * @param fn what to run inside the root - returns a cleanup function to run
     */
    constructor(fn: () => (() => void) | void) {
        const oldRoot = root;
        root = this;
        this.rootDestroy = fn();
        if (oldRoot) oldRoot.subroots.add(this);
        root = oldRoot;
    }

    /**
     * Direct root children of this root
     */
    subroots = new Set<EffectRoot>();

    /**
     * Direct effect descendents of this root
     */
    effects = new Set<Effect<any>>();

    addEffect(effect: Effect<any>) {
        this.effects.add(effect);
    }

    /**
     * Recursively destroy all child roots and effects,
     * then destroy this one
     */
    destroy() {
        for (const effect of [...this.effects]) {
            effect.destroy();
        }
        for (const subroot of [...this.subroots]) {
            subroot.destroy();
            this.subroots.delete(subroot);
        }
        this.rootDestroy?.()
    }
}

/**
 * See {@link Effect}
 * @param fn
 */
export function effect<T>(fn: EffectFn<T>) {
    return new Effect(fn);
}


/**
 * Gets a value from a source. You can get the value (non-tracked) directly
 * by doing source.value. Using $get takes note of the effect context,
 * and sets up a reaction relationship
 * @param source
 */
export function $get<T>(source: Source<T> | Derived<T>): T {
    if (effectContext && !untrackEnabled && !source.rx.has(effectContext)) {
        source.rx.add(effectContext);
        effectContext.deps.add(source);
    }
    return source.value;
}

/**
 * Sets a source to a particular value. If the value changes, react accordingly
 * @param source
 * @param newValue
 */
export function $set<T>(source: Source<T>, newValue: T): void {
    if (source instanceof Derived) throw new Error(`Can't set derived!`);
    const changed = newValue !== source.value
    if (changed) {
        source.value = newValue;

        // The spread operator is necessary here because sets get weird
        // if modified while in use
        for (const effect of [...source.rx]) {
            effect.rerun();
        }
    }
}


/**
 * Disables tracking for the current effect context, and returns
 * the return value of the function passed
 * @param fn
 */
export function untrack<T>(fn: () => T): T {
    const originalUntrack = untrackEnabled;
    untrackEnabled = true;
    const rtn = fn();
    untrackEnabled = originalUntrack;
    return rtn
}

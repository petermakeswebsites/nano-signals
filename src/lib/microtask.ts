import { Effect } from './effect.ts'
import { Flag } from './dirtiness.ts'

/* DEBUG START */
import { Inspector } from './inspect.ts'
/* DEBUG END */

const queuedOrganisedEffects = new Set<Effect<any>>()
const queuedDirtyEffects = new Set<Effect<any>>()
const queuedMaybeEffects = new Set<Effect<any>>()

let tickCallbacks: (() => any)[] = []
export enum Phase {
    DONE,
    AWAITING_FLUSH,
    PROCESSING_MAYBES,
    ORGANISING_EFFECT_TREE,
    APPLYING_EFFECTS,
}

/**
 * For testing a debug purposes
 */
export function _kill_all_microtasks() {
    queuedDirtyEffects.clear()
    tickCallbacks = []
}

/**
 * Tick allows us to wait until all the effects have completed. This ensures
 * we have the latest values available. Synchronistically accessing values will work for sources and derives,
 * but if there are effects that change things, those need to be processed as well.
 */
export function tick() {
    return new Promise<void>((res) => {
        if (no_queued_effects()) {
            // If there's nothing queued, fire now
            res()
        } else {
            // If there is something queued, lets add it to the callback list
            tickCallbacks.push(res)
        }
    })
}

/**
 * Run the list of promises stored by await tick()
 */
function run_tick_promises() {
    const callbacks = [...tickCallbacks]
    tickCallbacks = []
    for (const callback of callbacks) {
        callback()
    }
}

/**
 * Called from the outside to add a microtask to the queue
 * @param effect
 * @param flag
 */
export function queue_microtask_effect(effect: Effect<any>, flag: Flag.DIRTY | Flag.MAYBE_DIRTY) {
    add_to_appropriate_set(effect, flag)
    /* DEBUG START */
    if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.AWAITING_FLUSH)
    /* DEBUG END */
    set_microtask_or_inspect()
}

/**
 * This is a cyclic function that gradually moves through the microtask queue. First, it
 * goes through the "maybe" effect list {@link queuedMaybeEffects}. It will keep doing this
 * until all maybes are either dirty or clean.
 *
 * Then, it will organise the dirties. It will basically find redundancies, for example if
 * re-run a branch and a leaf, you only need to do the branch. Moreover, it can lead to bugs
 * if you don't do this. A branch might be called first, and if the leaf is still in the queue,
 * the leaf might be referencing things that don't exist anymore.
 *
 * Finally, once it's organised, it will run all the dirty effects.
 *
 * TODO make sure the effects run in the order they were added to in the queue
 */
function flush_microtasks() {
    if (no_queued_effects()) {
        /* DEBUG START */
        if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.DONE)
        /* DEBUG END */
        run_tick_promises()
        return
    }

    // The first thing we need to do is get rid of the maybe dirties
    const firstMaybe = extract_first_element_of_set(queuedMaybeEffects)
    if (firstMaybe) {
        // Let's process this and see if it's dirty or clean
        const flag = firstMaybe.process_deps_dirtiness()

        // Part of the algorithm is that it tags effects that need to be rendered,
        // essentially making us run this whole thing again. To prevent it, we
        // simply delete it here in case it was set.
        queuedMaybeEffects.delete(firstMaybe)

        /* DEBUG START */
        if (Inspector.inspecting) Inspector._registerDirtinessChange(firstMaybe.weakref, flag)
        /* DEBUG END */
        if (flag === Flag.DIRTY) {
            queuedDirtyEffects.add(firstMaybe)
        }

        /* DEBUG START */
        if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.PROCESSING_MAYBES)
        /* DEBUG END */
        // This basically re-runs the function, to go to the next step or re-do this one
        return set_microtask_or_inspect()
    }

    // No maybes, lets organise
    if (queuedDirtyEffects.size) {
        organise_dirty_effects()
        /* DEBUG START */
        if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.ORGANISING_EFFECT_TREE)
        /* DEBUG END */
        return set_microtask_or_inspect()
    }

    // Now everything's organised
    const firstOrganised = extract_first_element_of_set(queuedOrganisedEffects)
    if (firstOrganised) {
        // Definitely dirty, so lets just run it and clean it
        /* DEBUG START */
        if (Inspector.inspecting) {
            Inspector._registerDirtinessChange(firstOrganised.weakref, Flag.CLEAN)
            Inspector._microtaskPhaseChange(Phase.APPLYING_EFFECTS)
        }
        /* DEBUG END */
        firstOrganised.rerun()
    }
    return set_microtask_or_inspect()
}

/**
 * This does what was mentioned above in {@link flush_microtasks}. Basically, it strips children of parents
 * that are already in the queue that would be redundant to run, or that could lead to bugs.
 */
function organise_dirty_effects() {
    // First, we mix our organised effects back into the dirty effect pile,
    // since they may interact
    for (const effect of queuedOrganisedEffects) {
        queuedDirtyEffects.add(effect)
    }
    queuedOrganisedEffects.clear()

    for (const effect of queuedDirtyEffects) {
        let isNonRedundant = true
        let current = effect.parent

        // Iterate up the parent
        while (current instanceof Effect) {
            if (queuedDirtyEffects.has(current)) {
                isNonRedundant = false
                break
            }
            current = current.parent
        }

        if (isNonRedundant) {
            queuedOrganisedEffects.add(effect)
        }

        /* DEBUG START */
        if (!isNonRedundant) {
            if (Inspector.inspecting) Inspector._registerDirtinessChange(effect.weakref, Flag.CLEAN) // Now only called once per effect after confirming it's redundant
        }
        /* DEBUG END */
    }

    // Clear the original effects after reorganizing
    queuedDirtyEffects.clear()
}

function extract_first_element_of_set<T>(set: Set<T>): T | undefined {
    const val = set.values().next().value as T | undefined
    if (val === undefined) return val
    set.delete(val)
    return val
}

function set_microtask_or_inspect() {
    /* DEBUG START */
    if (Inspector.stepping) {
        Inspector._setNextStep(flush_microtasks)
        return
    }
    /* DEBUG END */

    queueMicrotask(flush_microtasks)
}

/**
 * Helper function to see if there is anything left in any of the queues, which
 * essentially is checking if there are not microtasks to do.
 */
function no_queued_effects() {
    return 0 === queuedDirtyEffects.size + queuedMaybeEffects.size + queuedOrganisedEffects.size
}

/**
 * Adds the {@link effect} into the appropriate set. It also "moves" the effect if it is present
 * in another set, ensuring that there are no weird bugs where an effect is simultaneously in a maybe
 * and in an organised or something of that nature.
 * @param effect
 * @param flag
 */
function add_to_appropriate_set(effect: Effect<any>, flag: Flag.DIRTY | Flag.MAYBE_DIRTY) {
    /* DEBUG START */
    if (Inspector.inspecting) Inspector._registerDirtinessChange(effect.weakref, flag)
    /* DEBUG END */

    if (flag === Flag.MAYBE_DIRTY) {
        // If it's already in the dirty laundry, we don't want to set it to a maybe
        if (!queuedDirtyEffects.has(effect)) queuedMaybeEffects.add(effect)
    } else {
        // In case it's already in maybe, we will remove it - keep things unique
        queuedMaybeEffects.delete(effect)
        queuedDirtyEffects.add(effect)
    }
}

import { Effect } from './effect.ts'
import { Inspector } from './inspect.ts'
import { Flag } from './dirtiness.ts'

const queuedOrganisedEffects = new Set<Effect<any>>()
const queuedEffects = new Set<Effect<any>>()
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
    queuedEffects.clear()
    tickCallbacks = []
}

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
    if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.AWAITING_FLUSH)
    set_microtask_or_inspect()
}

function flush_microtasks() {
    if (no_queued_effects()) {
        if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.DONE)
        run_tick_promises()
        return
    }

    // The first thing we need to do is get rid of the maybe dirties
    const firstMaybe = extract_first_element_of_set(queuedMaybeEffects)
    if (firstMaybe) {
        // Let's process this and see if it's dirty or clean
        const flag = firstMaybe.process_deps_dirtiness()
        if (Inspector.inspecting) Inspector._registerDirtinessChange(firstMaybe.weakref, flag)
        if (flag === Flag.DIRTY) {
            queuedEffects.add(firstMaybe)
        }

        // This basically re-runs the function, to go to the next step or re-do this one
        if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.PROCESSING_MAYBES)
        return set_microtask_or_inspect()
    }

    // No maybes, lets organise
    if (queuedEffects.size) {
        organise_dirty_effects()
        if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.ORGANISING_EFFECT_TREE)
        return set_microtask_or_inspect()
    }

    // Now everything's organised
    const firstOrganised = extract_first_element_of_set(queuedOrganisedEffects)
    if (firstOrganised) {
        // Definitely dirty, so lets just run it and clean it
        if (Inspector.inspecting) {
            Inspector._registerDirtinessChange(firstOrganised.weakref, Flag.CLEAN)
            Inspector._microtaskPhaseChange(Phase.APPLYING_EFFECTS)
        }
        firstOrganised.rerun()
    }
    return set_microtask_or_inspect()
}

/**
 * Mixed organised & dirty effects and organised them. Empties dirties and spits out organised
 * @param dirtySet
 */
function organise_dirty_effects() {
    for (const effect of queuedOrganisedEffects) {
        queuedEffects.add(effect)
    }
    queuedOrganisedEffects.clear()

    for (const effect of queuedEffects) {
        let isNonRedundant = true
        let current = effect.parent // Start checking from the parent

        while (current instanceof Effect) {
            if (queuedEffects.has(current)) {
                isNonRedundant = false
                break // Only break here, move the processRedundantEffect call outside the loop
            }
            current = current.parent
        }

        if (isNonRedundant) {
            queuedOrganisedEffects.add(effect)
        } else {
            if (Inspector.inspecting) Inspector._registerDirtinessChange(effect.weakref, Flag.CLEAN) // Now only called once per effect after confirming it's redundant
        }
    }

    // Clear the original effects after reorganizing
    queuedEffects.clear()
}

function extract_first_element_of_set<T>(set: Set<T>): T | undefined {
    const val = set.values().next().value as T | undefined
    if (val === undefined) return val
    set.delete(val)
    return val
}

function set_microtask_or_inspect() {
    // If there are queued effects, it means that the next microtask is already set
    // if (no_queued_effects()) {
    //     if (Inspector.inspecting) Inspector._microtaskPhaseChange(Phase.DONE)
    //     return
    // }
    if (Inspector.stepping) {
        Inspector._setNextStep(flush_microtasks)
    } else {
        queueMicrotask(flush_microtasks)
    }
}

function no_queued_effects() {
    return 0 === queuedEffects.size + queuedMaybeEffects.size + queuedOrganisedEffects.size
}

function add_to_appropriate_set(effect: Effect<any>, flag: Flag.DIRTY | Flag.MAYBE_DIRTY) {
    if (Inspector.inspecting) Inspector._registerDirtinessChange(effect.weakref, flag)
    if (flag === Flag.MAYBE_DIRTY) {
        // If it's already in the dirty laundry, we don't want to set it to a maybe
        if (!queuedEffects.has(effect)) queuedMaybeEffects.add(effect)
    } else {
        // In case it's already in maybe, we will remove it - keep things unique
        queuedMaybeEffects.delete(effect)
        queuedEffects.add(effect)
    }
}

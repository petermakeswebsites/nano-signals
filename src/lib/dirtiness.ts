import { Source } from './source.ts'
import { Derived } from './derived.ts'
import { Effect } from './effect.ts'
import { Inspector } from './inspect.ts'
import { queue_microtask_effect } from './microtask.ts'

export function check_if_dirty(source: Derived<any> | Source<any>): Flag.DIRTY | Flag.CLEAN {
    // Because of the way it was set up, source will always be clean. This is because
    // when the source was changed in the first place, it marked all its reactions
    // as dirty, so you can never actually reach a "dirty" source without going through
    // a dirty thing itself and returning
    if (source instanceof Source) return Flag.CLEAN

    if (source.flag === Flag.CLEAN) return Flag.CLEAN
    else if (source.flag === Flag.DIRTY) {
        // Process change
        const oldValue = source._value
        const newValue = source.value // Also triggers update and marks as clean

        if (oldValue === newValue) {
            // We're clean and haven't changed
            return Flag.CLEAN
        } else {
            // The value *has* changed, so we have to set all reactions to definitely dirty
            source.rx.forEach((effectOrDerived) => {
                mark_dirty_recursive(effectOrDerived, Call.INITIAL)
            })
            return Flag.DIRTY
        }
    } else if (source.flag === Flag.MAYBE_DIRTY) {
        // We return clean if ALL are clean
        return [...source.deps].some((dep) => check_if_dirty(dep) === Flag.DIRTY) ? Flag.DIRTY : Flag.CLEAN
    } else {
        throw new Error(`A type of flag was not recognised, should never happen!`)
    }
}

export enum Flag {
    DIRTY,
    CLEAN,
    MAYBE_DIRTY,
}

export enum Call {
    INITIAL,
    SECONDARY,
}

/**
 * Recursively marks dirty, taking advantage of the fact that we know the
 * reactions of all deriveds. But! We don't know effects. So the most we can do
 * is mark the effect dirty.
 *
 * For the first call, because it had to go through the $set's checker first, it
 * is byproduct of something that has for sure changed, and therefor it is guaranteed
 * to be dirty.
 * @param reaction
 * @param call
 */
export function mark_dirty_recursive(reaction: Effect<any> | Derived<any>, call: Call) {
    if (reaction instanceof Derived) {
        // If the flag is already dirty and comes up again on different recursive path
        // we want the original dirty to take precedence over the maybe dirty

        // Don't need to do anything if already dirty
        if (reaction.flag === Flag.DIRTY) {
            return
        }

        // Already set to maybe dirty, which means it was already "processed"
        // previously
        if (reaction.flag === Flag.MAYBE_DIRTY) {
            if (call === Call.SECONDARY) return
        }

        // reaction.flag is maybe_dirty and the call is to set it dirty OR
        // reaction flag is clean and the call is to set it to maybe_dirty
        // either way, we're making a change, so we need to process the reactions

        reaction.flag = call === Call.INITIAL ? Flag.DIRTY : Flag.MAYBE_DIRTY
        if (Inspector.inspecting) Inspector._registerDirtinessChange(reaction.weakref, reaction.flag)
        reaction.rx.forEach((effectOrDerived) => {
            mark_dirty_recursive(effectOrDerived, Call.SECONDARY)
        })
    } else {
        // Queuing the microtask effect works in a similar way. Because sources can't be marked
        // as dirty or clean, it means that we can't actually know whether an effect that depends on a source
        // needs to run if we're just looking at deps. The secret sauce is essentially being able to
        // mark the effects themselves as dirty

        // NO DIRTINESS CHANGE for inspector! This is handled in the
        queue_microtask_effect(reaction, call === Call.INITIAL ? Flag.DIRTY : Flag.MAYBE_DIRTY)
    }
}

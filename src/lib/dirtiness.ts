import { Source } from './source.ts'
import { Derived } from './derived.ts'
import { Effect } from './effect.ts'
import { queue_microtask_effect } from './microtask.ts'
/* DEBUG START */
import { Inspector } from './inspect.ts'
/* DEBUG END */

export function check_if_dirty(source: Derived<any> | Source<any>): Flag.DIRTY | Flag.CLEAN {
    // Because of the way it was set up, source will always be clean. This is because
    // when the source was changed in the first place, it marked all its reactions
    // as dirty, so you can never actually reach a "dirty" source without going through
    // a dirty thing itself and returning
    if (source instanceof Source) return Flag.CLEAN
    if (source.flag === Flag.CLEAN) return Flag.CLEAN

    const reeval = source.flag === Flag.DIRTY || [...source.deps].some((dep) => check_if_dirty(dep) === Flag.DIRTY)
    if (reeval === false) return Flag.CLEAN

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
}

/**
 * Responsible for flagging whether something needs to be re-evaluated, whether
 * it might need to be, or whether it's clean. Note that {@link $effect}s are technically
 * "flagged" but they work in a different way. They are stored in ../dirtiness.ts in sets.
 * It's important to track these in sets for easy iteration, and redundant to have flag variables
 * as well. However, when logging in the {@link Inspector}, {@link $effect}s use this same Flag enum.
 */
export enum Flag {
    DIRTY,
    CLEAN,
    MAYBE_DIRTY,
}

/**
 * This is important to determine whether to mark certain things as dirty or not. Think of a signal changing value.
 * We know its immediate reactions will be dirty for sure, but whether extended relatives will be dirty we're not sure.
 * So the first call of {@link mark_dirty_recursive} is generally a {@link Call.INITIAL} one, then subsequent ones
 * are secondary, marking with {@link Flag.MAYBE_DIRTY}
 */
export enum Call {
    INITIAL,
    SECONDARY,
}

/**
 * Responsible for, as the name suggests, recursively marking dirty. This applies to {@link $deriveds}
 * and {@link $effect}s. We propagate upwards until we reach an effect. Immediate relatives from the initial
 * recursive call are marked as dirty, while subsequent ancestors are marked as maybe dirty.
 *
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
        /* DEBUG START */
        if (Inspector.inspecting) Inspector._registerDirtinessChange(reaction.weakref, reaction.flag)
        /* DEBUG END */

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

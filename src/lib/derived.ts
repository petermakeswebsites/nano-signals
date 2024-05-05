import {Source} from "./source";
import {$set, Effect, EffectRoot} from "./effect";

/**
 * An effect and a source back-to-back, stores values
 */
export class Derived<T> {
    source: Source<T>;
    effect!: Effect<any>

    get value() {
        return this.source.value
    }

    get rx() {
        return this.source.rx
    }

    constructor(public readonly fn: () => T) {
        // @ts-expect-error we are definitely setting the correct source in the function below
        // no point in letting the function run twice for typescript's sake
        this.source = new Source()

        // We basically set up a private root with a private effect.
        // This root might have no owner, or it might be owned by another root
        // Not exactly sure if this reflects Svelte's implementation
        new EffectRoot(() => {
            this.effect = new Effect(() => {
                const newVal = fn()
                if (newVal !== this.source.value) $set(this.source, newVal);
            });
        });
    }
}

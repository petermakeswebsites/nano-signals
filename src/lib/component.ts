import { EffectRoot } from './effect'
import { AlreadyDestroyed } from './errors.ts'

/**
 * Component lifecycle is a render-once kind of function, updates should be done
 * via surgically-precise $effects.
 */
export class NanoComponent<T extends Element> {
    get destroyed(): boolean {
        return this._destroyed
    }

    effectRoot: EffectRoot
    private _destroyed = false

    attachTo: T
    /**
     *
     * @param attachTo
     * @param render Function that handles creation of effects, dom, etc in a synchronous root context. Returns a cleanup function
     */
    constructor(attachTo: T, render: (node: T) => (() => void) | void) {
        this.attachTo = attachTo
        this.effectRoot = new EffectRoot(() => {
            if (this._destroyed) throw new AlreadyDestroyed()
            // This should only run once!
            return render(this.attachTo)
        })
        this.onMount()
    }

    onDestroy() {}

    onMount() {}

    destroy() {
        if (this._destroyed) throw new AlreadyDestroyed()
        this._destroyed = true
        this.effectRoot.destroy()
        this.onDestroy()
    }
}

export function $component<T extends Element>(
    attachTo: T,
    render: (node: T) => (() => void) | void,
) {
    return new NanoComponent(attachTo, render)
}

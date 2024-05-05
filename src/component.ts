import {EffectRoot} from "./lib/";

export class Component<T extends Element> {
    effectRoot: EffectRoot
    destroyed = false

    constructor(public readonly attachTo: T, render: (node : T) => ((() => void) | void)) {
        this.render = render
        this.effectRoot = new EffectRoot(() => {
            if (this.destroyed) throw new Error(`Already destroyed!`)
            // This should only run once!
            return this.render(attachTo)
        })
    }

    render: (node : T) => ((() => void) | void)

    destroy() {
        if (this.destroyed) throw new Error(`Already destroyed!`)
        this.destroyed = true
        this.effectRoot.destroy()
    }
}

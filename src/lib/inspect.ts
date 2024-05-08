import { Source } from './source.ts'
import { Derived } from './derived.ts'
import { Effect, EffectRoot } from './effect.ts'

export type Allowed = Source<any> | Effect<any> | Derived<any> | EffectRoot
export type AllowedEmitter = Source<any> | Derived<any>
export type AllowedReceiver = Derived<any> | Effect<any>
export type RefdItem<T extends Allowed> = WeakRef<T>
export type DataPack<T extends Allowed> = {
    name: string
    ref: RefdItem<T>
}
export const Inspector = new (class {
    inspecting = false

    /**
     * Internal use, returns the id, name and ref in a neat little packet
     * to be sent to client
     * @param ref
     */
    _getData<T extends Allowed>(ref: RefdItem<T>): DataPack<T> {
        const name = this.nameCatalogue.get(ref)
        if (name === undefined) throw new Error(`Name was undefined for a ref`)
        return {
            name,
            ref,
        }
    }

    // The stepping mechanism allows us to go step by step through
    // batches.
    #stepping = false
    get stepping() {
        return this.#stepping
    }

    _nextStep: undefined | (() => void)
    get readyForNextStep() {
        return !!this._nextStep
    }

    _setNextStep(nextStep: () => void) {
        this._nextStep = () => {
            this._nextStep = undefined
            nextStep()
            if (this._nextStep === undefined) {
                this.onnextstepdone?.()
            } else {
                this.onreadyfornextstep?.()
            }
        }
        this.onreadyfornextstep?.()
    }

    /**
     * Trigger the next step in the stepping process. Make sure
     * stepping is enabled and nextStep is set before otherwise this will
     * @throws
     */
    doNextStep() {
        if (!this.#stepping) throw new Error('Stepping mode disabled')
        if (!this._nextStep) throw new Error('Next step not found!')
        this._nextStep()
        if (this._nextStep === undefined) {
            this.onnextstepdone?.()
        }
    }

    /**
     * Enable stepping mode
     */
    enableSteppingMode() {
        this.#stepping = true
        this.onstartstepping?.()
    }

    /**
     * Disable stepping mode
     */
    disableSteppingMode() {
        this.#stepping = false
        this._nextStep?.()
        if (this._nextStep === undefined) {
            this.onnextstepdone?.()
        }
        this.onstopstepping?.()
    }

    onstartstepping?: () => void
    onstopstepping?: () => void
    onnextstepdone?: () => void
    onreadyfornextstep?: () => void

    oncreatenode?: (pack: DataPack<Allowed>) => void
    ondestroynode?: (pack: DataPack<Allowed>) => void
    ongarbagecollectnode?: (pack: DataPack<Allowed>) => void
    onupdatenode?: (pack: DataPack<Allowed>) => void
    oncreaterx?: (
        source: DataPack<AllowedEmitter>,
        target: DataPack<AllowedReceiver>,
    ) => void
    ondestroyrx?: (
        source: DataPack<AllowedEmitter>,
        target: DataPack<AllowedReceiver>,
    ) => void
    oncreatedep?: (
        source: DataPack<AllowedReceiver>,
        target: DataPack<AllowedEmitter>,
    ) => void
    ondestroydep?: (
        source: DataPack<AllowedReceiver>,
        target: DataPack<AllowedEmitter>,
    ) => void
    oneffectstartpending?: (source: DataPack<Effect<any>>) => void
    oneffectstoppending?: (source: DataPack<Effect<any>>) => void

    readonly #registry = new FinalizationRegistry<RefdItem<any>>((ref) => {
        const data = this._getData(ref)
        this.#purge(ref)
        this.ongarbagecollectnode?.(data)
    })

    /**
     * As an optimisation, deriveds are marked dirty before processing
     * at the end of batch (or as needed within it)
     * @param derived
     */
    _registerMarkDirty(derived: RefdItem<Derived<any>>) {
        this.onupdatenode?.(this._getData(derived))
    }

    /**
     * After a derived is processed, it is marked clean
     * @param derived
     */
    _registerMarkClean(derived: RefdItem<Derived<any>>) {
        this.onupdatenode?.(this._getData(derived))
    }

    _createRx(
        source: RefdItem<AllowedEmitter>,
        target: RefdItem<AllowedReceiver>,
    ) {
        this.oncreaterx?.(this._getData(source), this._getData(target))
    }
    _removeRx(
        source: RefdItem<AllowedEmitter>,
        target: RefdItem<AllowedReceiver>,
    ) {
        this.ondestroyrx?.(this._getData(source), this._getData(target))
    }

    _createDep(
        source: RefdItem<AllowedReceiver>,
        target: RefdItem<AllowedEmitter>,
    ) {
        this.oncreatedep?.(this._getData(source), this._getData(target))
    }
    _removeDep(
        source: RefdItem<AllowedReceiver>,
        target: RefdItem<AllowedEmitter>,
    ) {
        this.ondestroydep?.(this._getData(source), this._getData(target))
    }

    /**
     * When an effect enters a pending state
     * @param effect
     */
    _registerPendingEffect(effect: RefdItem<Effect<any>>) {
        this.oneffectstartpending?.(this._getData(effect))
    }

    _removePendingEffect(effect: RefdItem<Effect<any>>) {
        this.oneffectstoppending?.(this._getData(effect))
    }

    /**
     * Reference map for names. Is cleaned up through JS garbage removal
     */
    nameCatalogue = new Map<RefdItem<any>, string>()

    /**
     * Removes item from the catalogues, should follow garbage collection
     * @param item
     */
    #purge(item: RefdItem<any>) {
        this.nameCatalogue.delete(item)
    }

    /**
     * Adds to the local catalogues for referencing later. These will be removed when
     * the JS garbage collector sweeps them
     * @param ref
     * @param _name
     * @private
     */
    #addToCatalogues<T extends Allowed>(
        ref: RefdItem<T>,
        _name?: string,
    ): DataPack<T> {
        const name = _name || ''
        this.nameCatalogue.set(ref, name)
        return {
            name,
            ref,
        }
    }

    /**
     * Upon creation of a new node, lets watch it for garbage collection, otherwise
     * they will never get removed!
     * @param item
     */
    #addToRegistry(item: RefdItem<any>) {
        const ref = item.deref()
        if (!ref)
            throw new Error(
                `Item created without reference, already collected?`,
            )
        this.#registry.register(ref, item, item)
    }

    /**
     * Log a new item creation
     *
     * @param item
     * @param name
     */
    _newItem<T extends Allowed>(item: RefdItem<T>, name?: string) {
        const pack = this.#addToCatalogues(item, name)
        this.#addToRegistry(item)
        this.oncreatenode?.(pack)
    }

    /**
     * Log an item destruction
     *
     * Different from purged or garbage collected. This is when something is marked
     * as no longer needed. Actually only applies to effect - in Svelte I think it applies
     * to derived as well, which can be owned or unowned. Too complicated for a simple library.
     * @param item
     */
    _destroyItem(item: RefdItem<Effect<any>>) {
        this.ondestroynode?.(this._getData(item))
    }
})()

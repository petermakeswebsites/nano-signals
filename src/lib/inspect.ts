import { Source } from './source.ts'
import { Derived } from './derived.ts'
import { Effect, EffectRoot } from './effect.ts'
import { Flag } from './dirtiness.ts'
import { Phase } from './microtask.ts'

export type Allowed = Source<any> | Effect<any> | Derived<any> | EffectRoot
export type AllowedEmitter = Source<any> | Derived<any>
export type AllowedReceiver = Derived<any> | Effect<any>
export type RefdItem<T extends Allowed> = WeakRef<T>
export type DataPack<T extends Allowed> = {
    name: string
    ref: RefdItem<T>
}

function log(tags: string[] | string, ...packet: any) {
    if (!Inspector.logging) return
    packet = Inspector.stripRef ? packet.map((x: any) => (typeof x === 'object' && 'ref' in x ? x.name! : x)) : packet
    console.log(JSON.stringify(tags), ...packet)
}

export const Inspector = new (class {
    inspecting = true
    logging = false

    /**
     * Remove direct referencing to items in logging, makes it so that garbage
     * collection can take place
     */
    stripRef = true

    /**
     * Throw an error for any unnamed item
     */
    forceNames = false

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
        log('MICROTASK', 'Ready for next step')
        return !!this._nextStep
    }

    _setNextStep(nextStep: () => void) {
        log('MICROTASK', 'Next step set')
        this._nextStep = () => {
            this._nextStep = undefined
            log('MICROTASK', 'Next step running')
            nextStep()
            if (this._nextStep === undefined) {
                log('MICROTASK', 'Next step done')
                this.onNextStepDone?.()
            } else {
                log('MICROTASK', 'Detected another step, ready')
                this.onReadyForNextStep?.()
            }
        }
        this.onReadyForNextStep?.()
    }

    /**
     * Trigger the next step in the stepping process. Make sure
     * stepping is enabled and nextStep is set before otherwise this will
     * @throws
     */
    doNextStep() {
        if (!this.#stepping) throw new Error('Stepping mode disabled')
        if (!this._nextStep) throw new Error('Next step not found!')
        // Inside of this function is already logged
        this._nextStep()
    }

    /**
     * Enable stepping mode
     */
    enableSteppingMode() {
        this.#stepping = true
        this.onStartStepping?.()
    }

    /**
     * Disable stepping mode
     */
    disableSteppingMode() {
        this.#stepping = false
        this._nextStep?.()
        this.onStopStepping?.()
    }

    onStartStepping?: () => void
    onStopStepping?: () => void
    onNextStepDone?: () => void
    onReadyForNextStep?: () => void

    onCreateNode?: (pack: DataPack<Allowed>) => void
    onDestroyNode?: (pack: DataPack<Allowed>) => void
    onGarbageCollectNode?: (pack: DataPack<Allowed>) => void
    onCreateReaction?: (source: DataPack<AllowedEmitter>, target: DataPack<AllowedReceiver>) => void
    onDestroyReaction?: (source: DataPack<AllowedEmitter>, target: DataPack<AllowedReceiver>) => void

    onUpdateValue?: (source: DataPack<AllowedEmitter>, value: any) => void

    onCreateEffectRelation?: (parent: DataPack<Effect<any> | EffectRoot>, child: DataPack<Effect<any>>) => void
    onDestroyEffectRelation?: (parent: DataPack<Effect<any> | EffectRoot>, child: DataPack<Effect<any>>) => void
    onChangeDirtiness?: (pack: DataPack<AllowedReceiver>, flag: Flag) => void

    readonly #registry = new FinalizationRegistry<RefdItem<any>>((ref) => {
        const data = this._getData(ref)
        log('REGISTRY', 'Item garbage collected:' + data.name)
        this.#purge(ref)
        this.onGarbageCollectNode?.(data)
    })

    _createEffectRelation(parent: RefdItem<Effect<any> | EffectRoot>, child: RefdItem<Effect<any>>) {
        const parentData = this._getData(parent)
        const childData = this._getData(child)
        log('EFFECT', 'Created effect relation:', parentData, childData)
        this.onCreateEffectRelation?.(parentData, childData)
    }

    _destroyEffectRelation(parent: RefdItem<Effect<any> | EffectRoot>, child: RefdItem<Effect<any>>) {
        const parentData = this._getData(parent)
        const childData = this._getData(child)
        log('EFFECT', 'Removed effect relation:', parentData, childData)
        this.onDestroyEffectRelation?.(this._getData(parent), this._getData(child))
    }

    onMicrotaskPhaseChange?: (phase: Phase) => void
    _microtaskPhaseChange(phase: Phase) {
        log('MICROTASK', 'Microtask phase change: ', phase)
        this.onMicrotaskPhaseChange?.(phase)
    }

    /**
     * As an optimisation, deriveds are marked dirty before processing
     * at the end of batch (or as needed within it)
     * @param derived
     */
    _registerDirtinessChange(derived: RefdItem<Derived<any> | Effect<any>>, flag: Flag) {
        const data = this._getData(derived)
        log('DIRTINESS', 'Dirtiness changed to:', data, flag)
        this.onChangeDirtiness?.(data, flag)
    }

    _createRx(source: RefdItem<AllowedEmitter>, target: RefdItem<AllowedReceiver>) {
        const sourcedata = this._getData(source)
        const targetdata = this._getData(target)
        log('RX', 'Reaction created between:', sourcedata, targetdata)
        this.onCreateReaction?.(sourcedata, targetdata)
    }

    _removeRx(source: RefdItem<AllowedEmitter>, target: RefdItem<AllowedReceiver>) {
        const sourcedata = this._getData(source)
        const targetdata = this._getData(target)
        log('RX', 'Reaction removed from', sourcedata, targetdata)
        this.onDestroyReaction?.(sourcedata, targetdata)
    }

    _updateValue(source: RefdItem<AllowedEmitter>, value: any) {
        const sourcedata = this._getData(source)
        log('VALUE', 'Value changed for', source, JSON.stringify(value))
        this.onUpdateValue?.(sourcedata, value)
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
    #addToCatalogues<T extends Allowed>(ref: RefdItem<T>, _name?: string): DataPack<T> {
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
        if (!ref) throw new Error(`Item created without reference, already collected?`)
        this.#registry.register(ref, item, item)
    }

    /**
     * Log a new item creation
     *
     * @param item
     * @param name
     */
    _newItem<T extends Allowed>(item: RefdItem<T>, name?: string) {
        if (this.forceNames && !name) {
            console.error(item.deref())
            throw new Error(`No name`)
        }
        const pack = this.#addToCatalogues(item, name)
        log('ITEM', 'Creating item', pack)
        this.#addToRegistry(item)
        this.onCreateNode?.(pack)
    }

    /**
     * Log an item destruction
     *
     * Different from purged or garbage collected. This is when something is marked
     * as no longer needed. Actually only applies to effect - in Svelte I think it applies
     * to derived as well, which can be owned or unowned. Too complicated for a simple library.
     * @param item
     */
    _destroyItem(item: RefdItem<Effect<any> | EffectRoot>) {
        const pack = this._getData(item)
        log('ITEM', 'Destroying item', pack)
        this.onDestroyNode?.(pack)
    }
})()

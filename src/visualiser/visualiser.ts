import type { Allowed, Inspector, RefdItem } from '../lib'
import cytoscape from 'cytoscape'
import { cytoStyle } from './styles.ts'
import { VisualiserList } from './idlog.ts'
import { edgeID, toData, toEdge } from './todata.ts'

import { DebounceTimer } from '../helpers/debounce.ts'
import { cytoLayout } from './layout.ts'

export class Visualiser {
    cy = cytoscape({ style: cytoStyle })
    renderDebounce = new DebounceTimer()

    #withID<T extends Allowed, Q extends { ref: RefdItem<T> }>(obj: Q) {
        const id = VisualiserList.getID(obj.ref)
        return { id, ...obj }
    }

    #valueId(id: string) {
        return id + '_value'
    }

    constructor(inspector: typeof Inspector) {
        inspector.inspecting = true

        inspector.onCreateNode = ({ name, ref }) => {
            const id = VisualiserList.create(ref)
            const data = toData({ name, ref, id })
            this.cy.add({
                group: 'nodes',
                data: {
                    id: this.#valueId(id),
                    ref: data.ref,
                    type: 'value',
                    value: '',
                    name: '',
                },
                grabbable: false,
                selectable: false,
            })
            this.cy.add({
                group: 'nodes',
                data: { ...data, parent: this.#valueId(id) },
            })
            this._updated()
        }

        inspector.onCreateEffectRelation = (parent, child) => {
            const edge = toEdge(this.#withID(parent), this.#withID(child), 'effectrelation')
            this.cy.add({
                group: 'edges',
                ...edge,
            })
            this._updated()
        }

        inspector.onDestroyEffectRelation = (parent, child) => {
            const id = edgeID(VisualiserList.getID(parent.ref), VisualiserList.getID(child.ref))
            this.cy.getElementById(id).remove()
            this._updated()
        }

        inspector.onDestroyNode = ({ ref }) => {
            const id = VisualiserList.getID(ref)
            this.cy.getElementById(id).data('livestatus', 'destroyed')
            this._updated()
        }

        inspector.onGarbageCollectNode = ({ ref }) => {
            const id = VisualiserList.getID(ref)
            const val = this.#valueId(id)
            VisualiserList.remove(ref)
            this.cy.getElementById(id).remove()
            this.cy.getElementById(val).remove()
            this._updated()
        }

        inspector.onUpdateNode = ({ name, ref }) => {
            const id = VisualiserList.getID(ref)
            const data = toData({ name, ref, id })
            this.cy.getElementById(id).data(data)
            // this._updated()
        }

        inspector.onCreateReaction = (source, target) => {
            const edge = toEdge(this.#withID(source), this.#withID(target), 'rx')
            this.cy.add({
                group: 'edges',
                ...edge,
            })
            this._updated()
        }

        inspector.onDestroyReaction = (source, target) => {
            const id = edgeID(VisualiserList.getID(source.ref), VisualiserList.getID(target.ref))
            this.cy.getElementById(id).remove()
            // this._updated()
        }

        inspector.onEffectStartPending = ({ ref }) => {
            const ele = this.cy.getElementById(VisualiserList.getID(ref))
            ele.data('state', 'pending')
            // this._updated()
        }
        inspector.onEffectStopPending = ({ ref }) => {
            const ele = this.cy.getElementById(VisualiserList.getID(ref))
            ele.data('state', '')
            // this._updated()
        }

        inspector.onUpdateValue = ({ ref }, value) => {
            const ele = this.cy.getElementById(this.#valueId(VisualiserList.getID(ref)))
            ele.data('value', JSON.stringify(value))
        }

        this.cy.on('tap', 'node', (evt) => {
            console.log(evt.target._private.data.ref.deref(), evt.target._private.data)
        })
    }

    _updated() {
        if (!this.#mounted) return
        this.renderDebounce.debounce(() => {
            const layout = this.cy.layout(cytoLayout)
            layout.run()
        }, 50)
    }

    #mounted = false
    mount(element: Element) {
        this.cy.mount(element)
        this.#mounted = true
        this._updated()
    }
}

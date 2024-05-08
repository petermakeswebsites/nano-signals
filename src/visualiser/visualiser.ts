import type { Allowed, Inspector, RefdItem } from '../lib'
import cytoscape from 'cytoscape'
import { cytoStyle } from './styles.ts'
import { VisualiserList } from './idlog.ts'
import { edgeID, toData, toEdge } from './todata.ts'

// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent'
import { DebounceTimer } from '../helpers/debounce.ts'
import { cytoLayout } from './layout.ts'
cytoscape.use(coseBilkent)

export class Visualiser {
    cy = cytoscape({ style: cytoStyle })
    renderDebounce = new DebounceTimer()

    #withID<T extends Allowed, Q extends { ref: RefdItem<T> }>(obj: Q) {
        const id = VisualiserList.getID(obj.ref)
        return { id, ...obj }
    }

    constructor(inspector: typeof Inspector) {
        inspector.inspecting = true
        inspector.oncreatenode = ({ name, ref }) => {
            const id = VisualiserList.create(ref)
            const data = toData({ name, ref, id })
            this.cy.add({
                group: 'nodes',
                ...data,
            })
            this._updated()
        }

        inspector.ondestroynode = ({ ref }) => {
            const id = VisualiserList.getID(ref)
            this.cy.getElementById(id).data('livestatus', 'destroyed')
            this._updated()
        }

        inspector.ongarbagecollectnode = ({ ref }) => {
            const id = VisualiserList.getID(ref)
            VisualiserList.remove(ref)
            this.cy.getElementById(id).remove()
            this._updated()
        }

        inspector.onupdatenode = ({ name, ref }) => {
            const id = VisualiserList.getID(ref)
            const d = toData({ name, ref, id }).data
            this.cy.getElementById(id).data(d)
            // this._updated()
        }

        inspector.oncreatedep = undefined
        inspector.ondestroydep = undefined

        inspector.oncreaterx = (source, target) => {
            const edge = toEdge(
                this.#withID(source),
                this.#withID(target),
                'rx',
            )
            this.cy.add({
                group: 'edges',
                ...edge,
            })
            this._updated()
        }

        inspector.ondestroyrx = (source, target) => {
            const id = edgeID(
                VisualiserList.getID(source.ref),
                VisualiserList.getID(target.ref),
            )
            this.cy.getElementById(id).remove()
            // this._updated()
        }

        inspector.oneffectstartpending = ({ ref }) => {
            const ele = this.cy.getElementById(VisualiserList.getID(ref))
            ele.data('state', 'pending')
            // this._updated()
        }
        inspector.oneffectstoppending = ({ ref }) => {
            const ele = this.cy.getElementById(VisualiserList.getID(ref))
            ele.data('state', '')
            // this._updated()
        }

        this.cy.on('tap', 'node', (evt) => {
            console.log(
                evt.target._private.data.ref.deref(),
                evt.target._private.data,
            )
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

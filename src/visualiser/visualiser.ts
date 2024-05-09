import { Allowed, Inspector, RefdItem, Source } from '../lib'
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

        inspector.onChangeDirtiness = ({ ref }, flag) => {
            const id = VisualiserList.getID(ref)
            this.cy.getElementById(id).data({
                state: flag,
            })
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

        inspector.onUpdateValue = ({ ref }, value) => {
            // Pop it!
            this.pop(this.cy.getElementById(VisualiserList.getID(ref)))

            // Update actual value
            const valueNode = this.cy.getElementById(this.#valueId(VisualiserList.getID(ref)))
            valueNode.data('value', JSON.stringify(value))
        }

        this.cy.on('tap', 'node', (evt) => {
            // @ts-expect-error
            globalThis.set = (e: any) => {
                const r = evt.target._private.data.ref.deref()
                if (!r) throw new Error('It was garbage collected!')
                if (!(r instanceof Source)) throw new Error('Its not a source!')
                r.set(e)
            }
            console.log(evt.target._private.data.ref.deref(), evt.target._private.data)
        })
    }

    pop(node: cytoscape.CollectionReturnValue) {
        node.animate({
            style: {
                'background-color': '#FF4136', // Bright red color for emphasis
                width: '40px', // Larger size to make the node pop
                height: '40px',
            },
            duration: 5,
        })
            .delay(50)
            .animate(
                {
                    style: {
                        'background-color': '', // Reset to default by removing the style
                        width: '25px', // Reset to default by removing the style
                        height: '25px', // Reset to default by removing the style
                    },
                    duration: 5,
                },
                {
                    // Callback to completely remove the inline styles after animation
                    complete: function () {
                        node.removeStyle() // Removes all inline styles and reverts to stylesheet
                    },
                },
            )
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

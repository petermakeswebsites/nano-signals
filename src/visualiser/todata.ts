import { Allowed, DataPack, Derived, Effect, Source } from '../lib/'
import cytoscape from 'cytoscape'
import { Flag } from '../lib/batch.ts'

type FullData<T extends Allowed> = DataPack<T> & { id: string }

export function toData<T extends Allowed>({
    ref,
    name,
    id,
}: FullData<T>): cytoscape.NodeDefinition {
    const actualItem = ref.deref()
    if (actualItem === undefined) throw new Error(`Item was undefined!`)

    const data = { id, name, ref }
    if (actualItem instanceof Derived) {
        const state = actualItem.flag === Flag.DIRTY ? 'dirty' : 'clean'
        return {
            data: {
                ...data,
                type: 'derived',
                state,
                value: JSON.stringify(actualItem._value),
                level: 8,
            },
        }
    } else if (actualItem instanceof Effect) {
        return {
            data: {
                ...data,
                type: 'effect',
                state: '', // pending or not is managed elsewhere
                level: 1,
            },
        }
    } else if (actualItem instanceof Source) {
        return {
            data: {
                ...data,
                type: 'source',
                value: JSON.stringify(actualItem.value),
                level: 10,
            },
        }
    } else {
        throw new Error(`Unrecognised item`)
    }
}

export function edgeID(id1: string, id2: string) {
    return id1 + '_' + id2
}

export function toEdge(
    source: FullData<any>,
    target: FullData<any>,
    type: 'rx' | 'dep',
): cytoscape.EdgeDefinition {
    return {
        data: {
            id: edgeID(source.id, target.id),
            source: source.id,
            target: target.id,
            type,
        },
    }
}

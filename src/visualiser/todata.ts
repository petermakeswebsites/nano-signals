import { Allowed, DataPack, Derived, Effect, EffectRoot, Source } from '../lib/'
import cytoscape from 'cytoscape'

type FullData<T extends Allowed> = DataPack<T> & { id: string }

export function toData<T extends Allowed>({ ref, name, id }: FullData<T>): cytoscape.NodeDefinition['data'] {
    const actualItem = ref.deref()
    if (actualItem === undefined) throw new Error(`Item was undefined!`)

    const data = { id, name, ref }
    if (actualItem instanceof Derived) {
        return {
            ...data,
            type: 'derived',
            level: 8,
        }
    } else if (actualItem instanceof Effect) {
        return {
            ...data,
            type: 'effect',
            state: '', // pending or not is managed elsewhere
            level: 1,
        }
    } else if (actualItem instanceof Source) {
        return {
            ...data,
            type: 'source',
            level: 10,
        }
    } else if (actualItem instanceof EffectRoot) {
        return {
            ...data,
            type: 'root',
            level: 1,
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
    type: 'rx' | 'dep' | 'effectrelation',
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

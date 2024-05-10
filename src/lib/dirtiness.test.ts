import { beforeEach, describe, expect, it, vi } from 'vitest'
import { $effect, $get, $set, _reset_all_global_trackers } from './effect.ts'
import { DepCollector } from './collector.ts'
import { _kill_all_microtasks, tick } from './microtask.ts'
import { $source } from './source.ts'
import { $derived } from './derived.ts'

describe('dirtiness tests', () => {
    beforeEach(() => {
        _reset_all_global_trackers()
        DepCollector.currentCollecting = undefined
        DepCollector.untrack = false
        _kill_all_microtasks()
    })

    it('effect should not run if derived has not change', async () => {
        const source = $source(5)
        const derived = $derived(() => $get(source) > 10)
        const spy = vi.fn()
        $effect.root(() => {
            $effect.pre(() => {
                spy($get(derived))
            })
        })
        expect(spy).to.toHaveBeenNthCalledWith(1, false)
        $set(source, 8)
        await tick()
        expect(spy).not.toHaveBeenCalledTimes(2)
        $set(source, 15)
        await tick()
        expect(spy).toHaveBeenNthCalledWith(2, true)
    })

    it('should run source, effect derived', async () => {
        const source = $source(1)
        const source2 = $source(2)
        const source3 = $source(3)

        const derived = $derived(() => $get(source) + $get(source2)) // 1 + 2 = 3
        const derived2 = $derived(() => $get(source2) * $get(source3)) // 2 * 3 = 6

        const end = $derived(() => $get(derived) > $get(derived2), 'end') // 3 > 6 == false
        const spy = vi.fn()
        $effect.root(() => {
            $effect.pre(() => {
                console.log('answer', $get(end))
                spy($get(end))
            })
        })

        expect(spy).to.toHaveBeenNthCalledWith(1, false)
        console.log('SETTING...')
        $set(source, 2)
        console.log('AWATING...')
        // derived = 2 + 2 = 4
        // derived2 = 2 * 3 = 6
        // 4 > 6 == false
        await tick()
        expect(spy).not.toHaveBeenCalledTimes(2)
    })

    // describe('dirtiness', () => {
    //     // @ts-ignore
    //     let source: Source<any>
    //
    //     // @ts-ignore
    //     let source2: Source<any>
    //     // @ts-ignore
    //     let derived: Derived<any>
    //
    //     // @ts-ignore
    //     let fx: Effect<any>
    //
    //     // @ts-ignore
    //     let root: EffectRoot
    //     // @ts-ignore
    //     let spyDerived1: Mock<any, any>
    //     // @ts-ignore
    //     let spyEffect: Mock<any, any>
    //
    //     beforeEach(() => {
    //         spyDerived1 = vi.fn()
    //         source = $source(0)
    //         source2 = $source(0)
    //         derived = $derived(() => {
    //             spyDerived1()
    //             $get(source) + $get(source2)
    //         })
    //
    //         root = $effect.root(() => {
    //             fx = $effect(() => {
    //                 $get(source)
    //                 return spyDerived1
    //             })
    //         })
    //     })
    // })
})

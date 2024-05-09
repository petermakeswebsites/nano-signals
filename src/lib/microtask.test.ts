import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { $effect, $get, $set, _reset_all_global_trackers, EffectRoot } from './effect.ts'
import { DepCollector } from './collector.ts'
import { $derived, $source, tick } from './'
import { _kill_all_microtasks } from './microtask.ts'

describe('microtask test', () => {
    beforeEach(() => {
        _reset_all_global_trackers()
        DepCollector.currentCollecting = undefined
        DepCollector.untrack = false
        _kill_all_microtasks()
    })

    it('awaiting microtask calls it right away', async () => {
        const spy = vi.fn()
        await tick()
        // This might seem weird but actually this code would be unreachable if tick() didn't work
        spy()
        expect(spy).toHaveBeenCalledOnce
    })

    describe('basic microtask', () => {
        let spyPreCreate: Mock<any, any>
        let spyPreCleanup: Mock<any, any>
        let spyEffectCreate: Mock<any, any>
        let spyEffectCleanup: Mock<any, any>
        let root: EffectRoot

        beforeEach(() => {
            spyPreCreate = vi.fn()
            spyPreCleanup = vi.fn()
            spyEffectCreate = vi.fn()
            spyEffectCleanup = vi.fn()
            root = new EffectRoot(() => {
                $effect.pre(() => {
                    spyPreCreate()
                    return () => {
                        spyPreCleanup()
                    }
                })
                $effect(() => {
                    spyEffectCreate()
                    return () => {
                        spyEffectCleanup()
                    }
                })
            })
        })

        it('effect 1', async () => {
            root.destroy()
            await tick()
            expect(spyPreCreate).toHaveBeenCalled()
            expect(spyPreCleanup).toHaveBeenCalled()
            expect(spyEffectCreate).toHaveBeenCalled()
            expect(spyEffectCleanup).toHaveBeenCalled()
        })
    })

    describe('advanced microtask tests', () => {
        it('microtask should make this fire once', async () => {
            const spy = vi.fn()
            const a = $source(1)
            const b = $source(1)

            $effect.root(() => {
                $effect(() => {
                    spy($get(a) + $get(b))
                })
            })

            $set(a, 2)
            $set(b, 2)

            await tick()
            expect(spy).toHaveBeenNthCalledWith(1, 4) // Third call when a = 2, b = 2
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('deriveds should fire once after', async () => {
            const spy = vi.fn()
            const a = $source(1)
            const b = $source(1)
            const c = $derived(() => $get(a) + $get(b))

            $effect.root(() => {
                $effect(() => {
                    spy(`${$get(a)} ${$get(b)} ${$get(c)}`)
                })
            })

            $set(a, 2)
            $set(b, 2)

            await tick()

            expect(spy).toHaveBeenNthCalledWith(1, '2 2 4') // Third call when a = 2, b = 2
            expect(spy).toHaveBeenCalledTimes(1)
        })
    })
})

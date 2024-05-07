import {
    $effect,
    _resetAllGlobalTrackers,
    $get,
    $set,
    $root,
} from './effect.ts'
import { describe, beforeEach, vi, it, expect, Mock } from 'vitest'
import { $source, Source } from './source.ts'
import { $batch, Batch } from './batch.ts'
import { $derived } from './derived.ts'
import { DepCollector } from './collector.ts'

describe('reactivity tests', () => {
    beforeEach(() => {
        _resetAllGlobalTrackers()
        Batch.currentBatch = undefined
        DepCollector.currentCollecting = undefined
        DepCollector.untrack = false
    })

    it('effect should fire in a root context', () => {
        const spy = vi.fn()
        $root(() => {
            $effect(() => {
                spy()
            })
        })
        expect(spy).toHaveBeenCalledOnce()
    })

    describe('simple root tests', () => {
        // @ts-ignore
        let fx: Effect<any>
        // @ts-ignore
        let root: EffectRoot
        beforeEach(() => {
            root = $root(() => {
                fx = $effect(() => {})
            })
        })

        it('should have stored effect', () => {
            expect(root.effects).toContain(fx)
            // expect(root.effects.has(fx!)).true
        })

        it('should have deleted stored effect after destroying', () => {
            root.destroy()
            expect(root.effects).not.toContain(fx)
        })
    })

    describe('cleanup functions', () => {
        // @ts-ignore
        let source: Source<any>
        // @ts-ignore
        let fx: Effect<any>
        // @ts-ignore
        let root: EffectRoot
        // @ts-ignore
        let spy: Mock<any, any>
        beforeEach(() => {
            spy = vi.fn()
            source = $source(0)
            root = $root(() => {
                fx = $effect(() => {
                    $get(source)
                    return spy
                })
            })
        })

        it('should not call cleanup if nothing changes', () => {
            expect(spy).not.toHaveBeenCalled()
        })

        it('should call cleanup after source changes with destroy set to false', () => {
            $set(source, 1)
            expect(spy).toHaveBeenNthCalledWith(1, false)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('should still call only once if source is the same value', () => {
            $set(source, 1)
            $set(source, 1)
            expect(spy).toHaveBeenNthCalledWith(1, false)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('should call twice when value changes twice', () => {
            $set(source, 1)
            $set(source, 2)
            expect(spy).toHaveBeenNthCalledWith(1, false)
            expect(spy).toHaveBeenNthCalledWith(2, false)
            expect(spy).toHaveBeenCalledTimes(2)
        })

        it('should call with destroy function set to true', () => {
            root.destroy()
            expect(spy).toHaveBeenNthCalledWith(1, true)
            expect(spy).toHaveBeenCalledTimes(1)
        })
    })

    describe('nested roots', () => {
        // @ts-ignore
        let fx: Effect<any>
        // @ts-ignore
        let root: EffectRoot
        // @ts-ignore
        let nestedRoot: EffectRoot
        // @ts-ignore
        let fx2: Effect<any>

        beforeEach(() => {
            root = $root(() => {
                fx = $effect(() => {
                    nestedRoot = $root(() => {
                        fx2 = $effect(() => {})
                    })
                })
            })
        })

        it('root should not contain nested fx', () => {
            expect(root.effects).not.toContain(fx2)
        })

        it('nested root to contain nested effect', () => {
            expect(nestedRoot.effects).toContain(fx2)
        })
    })

    describe('basic reactivity', () => {
        // @ts-ignore
        let fx: Effect<any>
        // @ts-ignore
        let root: EffectRoot
        // @ts-ignore
        let spy: Mock<any, any>
        // @ts-ignore
        let count: Source<number>
        beforeEach(() => {
            spy = vi.fn()
            count = $source(0)
            root = $root(() => {
                fx = $effect(() => {
                    spy($get(count))
                })
            })
        })

        it('source should have effect', () => {
            expect(count.rx).toContain(fx)
        })

        it('effect should reference source', () => {
            expect(fx.deps).toContain(count)
        })

        it('should be called once to start', () => {
            expect(spy).toHaveBeenNthCalledWith(1, 0)
        })

        it('should be called twice after a change', () => {
            $set(count, 1)
            expect(spy).toHaveBeenNthCalledWith(2, 1)
        })

        describe('disposal', () => {
            it('should disconnect after destruction of effect', () => {
                fx.destroy()
                expect(fx.deps).not.toContain(count)
                expect(count.rx).not.toContain(fx)
            })

            it('should disconnect after destruction of root node', () => {
                root.destroy()
                expect(fx.deps).not.toContain(count)
                expect(count.rx).not.toContain(fx)
            })
        })
    })

    it('roots are not there for you and you only', () => {})

    describe('batch tests', () => {
        it('non-batched should fire multiple times', () => {
            const spy = vi.fn()
            const a = $source(1)
            const b = $source(1)

            $root(() => {
                $effect(() => {
                    spy($get(a) + $get(b))
                })
            })

            $set(a, 2)
            $set(b, 2)

            expect(spy).toHaveBeenNthCalledWith(1, 2) // First initial call when a = 1, b = 1
            expect(spy).toHaveBeenNthCalledWith(2, 3) // Second call when a = 2, b = 1
            expect(spy).toHaveBeenNthCalledWith(3, 4) // Third call when a = 2, b = 2
            expect(spy).toHaveBeenCalledTimes(3)
        })

        it('batched should fire once', () => {
            const spy = vi.fn()
            const a = $source(1)
            const b = $source(1)

            $root(() => {
                $effect(() => {
                    spy($get(a) + $get(b))
                })
            })

            $batch(() => {
                $set(a, 2)
                $set(b, 2)
            })

            expect(spy).toHaveBeenNthCalledWith(1, 2) // First initial call when a = 1, b = 1
            expect(spy).toHaveBeenNthCalledWith(2, 4) // Third call when a = 2, b = 2
            expect(spy).toHaveBeenCalledTimes(2)
        })

        it('deriveds should fire once after', () => {
            const spy = vi.fn()
            const a = $source(1)
            const b = $source(1)
            const c = $derived(() => $get(a) + $get(b))

            $root(() => {
                $effect(() => {
                    spy(`${$get(a)} ${$get(b)} ${$get(c)}`)
                })
            })

            $batch(() => {
                $set(a, 2)
                $set(b, 2)
            })

            expect(spy).toHaveBeenNthCalledWith(1, '1 1 2') // First initial call when a = 1, b = 1, c = 2
            expect(spy).toHaveBeenNthCalledWith(2, '2 2 4') // Third call when a = 2, b = 2
            expect(spy).toHaveBeenCalledTimes(2)
        })
    })
})

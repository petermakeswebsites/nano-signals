import { $effect, _reset_all_global_trackers, $get, $set } from './effect.ts'
import { describe, beforeEach, vi, it, expect, Mock } from 'vitest'
import { $source, Source } from './source.ts'
import { DepCollector } from './collector.ts'
import { _kill_all_microtasks, tick } from './microtask.ts'

describe('reactivity tests', () => {
    beforeEach(() => {
        _reset_all_global_trackers()
        DepCollector.currentCollecting = undefined
        DepCollector.untrack = false
        _kill_all_microtasks()
    })

    it('pre-effect should fire in a root context', () => {
        const spy = vi.fn()
        $effect.root(() => {
            $effect.pre(() => {
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
            root = $effect.root(() => {
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
            root = $effect.root(() => {
                fx = $effect(() => {
                    $get(source)
                    return spy
                })
            })
        })

        it('should not call cleanup if nothing changes', () => {
            expect(spy).not.toHaveBeenCalled()
        })

        it('should call cleanup after source changes with destroy set to false', async () => {
            $set(source, 1)
            await tick()
            expect(spy).toHaveBeenNthCalledWith(1, false)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('should still call only once if source is the same value', async () => {
            $set(source, 1)
            $set(source, 1)
            await tick()
            expect(spy).toHaveBeenNthCalledWith(1, false)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('should call once when value changes twice, but not cleanup', async () => {
            $set(source, 1)
            $set(source, 2)
            await tick()
            expect(spy).toHaveBeenNthCalledWith(1, false)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('destruction should be synchronous', () => {
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
            root = $effect.root(() => {
                fx = $effect(() => {
                    nestedRoot = $effect.root(() => {
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

    describe('basic reactivity for sync (pre) effects', () => {
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
            root = $effect.root(() => {
                fx = $effect.pre(() => {
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

        it('should only be called once after a change without tick()', () => {
            $set(count, 1)
            expect(spy).toHaveBeenNthCalledWith(1, 0)
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
})

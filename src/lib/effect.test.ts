import {
    $effect,
    _resetAllGlobalTrackers,
    $get,
    $set,
    $root,
} from './effect.ts'
import { describe, beforeEach, vi, it, expect, Mock } from 'vitest'
import { $source, Source } from './source.ts'

describe('reactivity tests', () => {
    beforeEach(() => {
        _resetAllGlobalTrackers()
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

        it('parent root should contain nested root', () => {
            expect(root.subroots).toContain(nestedRoot)
        })

        it('nested root to contain nested effect', () => {
            expect(nestedRoot.effects).toContain(fx2)
        })

        it('nested root should be destroyed when parent root is destroyed', () => {
            root.destroy()
            expect(root.subroots).not.toContain(nestedRoot)
            expect(nestedRoot.destroyed).true
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
})

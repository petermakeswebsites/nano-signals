import { RefdItem } from '../lib/inspect.ts'

export const VisualiserList = new (class {
    makeUniqueID(): string {
        let result = ''
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        let counter = 0
        while (counter < 10) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength),
            )
            counter += 1
        }
        return [...this.#list.values()].includes(result)
            ? this.makeUniqueID()
            : result
    }

    #list = new Map<RefdItem<any>, string>()
    create(item: RefdItem<any>) {
        if (this.#list.has(item)) throw new Error(`Item already exists!`)
        const id = this.makeUniqueID()
        this.#list.set(item, id)
        return id
    }

    getID(item: RefdItem<any>) {
        const id = this.#list.get(item)
        if (id === undefined) throw new Error(`Item is undefined`)
        return id
    }

    remove(item: RefdItem<any>) {
        if (!this.#list.delete(item))
            throw new Error(`Attempted to remove item but it didn't exist`)
    }
})()

import {
    $child,
    $children,
    $component,
    create,
    $derived,
    $effect,
    $get,
    $innertext,
    $set,
    $source,
    Derived,
    Source,
} from '../lib'

export class Car {
    readonly name: string
    fuel: Source<number>
    lowFuel: Derived<boolean>
    message
    constructor(name: string, startingFuel = 50) {
        this.name = name
        this.fuel = $source(startingFuel, 'fuel')
        this.lowFuel = $derived(() => $get(this.fuel) < 40, 'fuel < 40')
        this.message = $derived(() => ($get(this.lowFuel) ? 'holy moly fill it up!' : 'no need to fill'), 'msg')
    }

    drive(km: number) {
        $set(this.fuel, $get(this.fuel) - km)
    }

    refuel() {
        $set(this.fuel, 100)
    }
}

export const CarList = $component<{ cars: Car[] }>((node: Element, { cars }) => {
    const ul = create('ul')

    // Created an isolated reactive context
    $effect.pre(() => {
        cars.map((car) => {
            return CarView(ul, { car })
        })
    }, 'car ul')

    // Mount to parent node
    return $child(node, ul)
}, 'car list')

export const CarView = $component<{ car: Car }>((node, { car }) => {
    const h3 = create('h3')
    $innertext(h3, car.name)
    const p = create('p')
    $effect.pre(() => {
        $innertext(p, 'Fuel level: ' + $get(car.fuel))
    }, 'car fuel gage')
    return $children(node, h3, p)
})

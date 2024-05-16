import {
    $child,
    $children,
    $component,
    create,
    $derived,
    $effect,
    $get,
    $set,
    $source,
    Derived,
    Source,
    html,
    $bind,
} from '../lib'

export class Car {
    readonly name: string
    fuel: Source<number>
    lowFuel: Derived<boolean>

    constructor(name: string, startingFuel = 50) {
        this.name = name
        this.fuel = $source(startingFuel, 'fuel')
        this.lowFuel = $derived(() => $get(this.fuel) < 40, 'fuel < 40')
    }

    drive(km: number) {
        $set(this.fuel, $get(this.fuel) - km)
    }

    refuel() {
        $set(this.fuel, 100)
    }
}

export const list = $source<Car[]>([new Car('toyota')], 'car list')

export const CarListView = $component((node) => {
    const { childNodes, $ } = html(`
        <p>Cars: <span></span></p>
        <div></div>
        <form>
            <input type="text" placeholder="toyota?" />
            <button type="submit">+ Add Car</button>
        </form>
    `)

    const numCars = $('span')!
    const newName = $source('', 'new car name')
    $bind($('input')!, newName)
    const div = $('div')!
    $effect(() => {
        div.innerHTML = $get(newName)
    }, 'write html')

    $('form')!.addEventListener('submit', (e) => {
        e.preventDefault()
        $set(list, [...$get(list), new Car('' + $get(newName))])
    })

    $effect.pre(() => {
        numCars!.innerText = $get(list)
            .map((car) => car.name)
            .join()
    }, 'names')

    $children(node, ...childNodes)

    $effect.pre(() => {
        CarList(node, {
            cars: $get(list),
            del: (car) => {
                $set(
                    list,
                    $get(list).filter((d) => d != car),
                )
            },
        })
    }, 'car list')
}, 'main car view')

export const CarList = $component<{ cars: Car[]; del: (car: Car) => void }>((node: Element, { cars, del }) => {
    const ul = create('ul')

    // Created an isolated reactive context
    $effect.pre(() => {
        cars.map((car) => {
            return CarView(ul, {
                car,
                del: () => {
                    del(car)
                },
            })
        })
    }, 'car ul')

    // Mount to parent node
    return $child(node, ul)
}, 'car list')

export const CarView = $component<{ car: Car; del: () => void }>((node, { car, del }) => {
    const { childNodes, $, $all } = html(`
        <h3>${car.name}</h3>
        <p></p>
        <div></div>
        <button>Delete</button>
        <button>Refuel</button>
        <button>Drive 10km</button>
    `)

    const p = $('p')!
    const [deleteBtn, addBtn, subBtn] = $all('button')

    $effect.pre(() => {
        p.innerText = 'Fuel level: ' + $get(car.fuel)
    }, 'car fuel gage')

    const fuelGauge = $('div')!
    $effect.pre(() => {
        if ($get(car.lowFuel)) {
            fuelGauge.innerText = 'low fuel!'
        } else {
            fuelGauge.innerText = 'enough fuel!'
        }
    }, 'render is enough fuel')

    deleteBtn!.addEventListener('click', del)
    subBtn!.addEventListener('click', () => car.drive(10))
    addBtn!.addEventListener('click', () => car.refuel())

    return $children(node, ...childNodes)
}, 'car view')

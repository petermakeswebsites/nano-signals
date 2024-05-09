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
    $if,
} from '../lib'
import { button, form, textInput } from '../ui/form-elements.ts'

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
    form(node, {
        onsubmit: (e) => {
            e.preventDefault()
            // @ts-ignore
            const formData = new FormData(e!.target!) // Create FormData object from the form
            const name = formData.get('name')!
            $set(list, [...$get(list), new Car('' + name)])
        },
        children: (node) => {
            const h1 = create('h1')
            $child(node, h1)
            $effect.pre(() => {
                $innertext(
                    h1,
                    'Cars:' +
                        $get(list)
                            .map((car) => car.name)
                            .join(),
                )
            }, 'h1 text')

            textInput(node, { placeholder: 'hello', name: 'name' })
            button(node, {
                text: 'create',
                click: () => {},
            })
            return () => {}
        },
    })

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

    // const ul = create('ul')
    //
    // $effect.pre(() => {
    //     $get(list).forEach((car) => {
    //         const li = create('li')
    //         CarView(li, { car })
    //         return $child(ul, li)
    //     })
    // }, 'car list')
    // return $child(app, ul)
})

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
    const h3 = create('h3')
    $innertext(h3, car.name)
    const p = create('p')
    $effect.pre(() => {
        $innertext(p, 'Fuel level: ' + $get(car.fuel))
    }, 'car fuel gage')

    const div = create('div')
    $if(
        div,
        () => $get(car.lowFuel),
        (node) => $innertext(node, 'low fuel!'),
        (node) => $innertext(node, 'enough fuel'),
        'fuel test',
    )

    button(node, { text: 'delete', click: del })

    return $children(node, h3, p, div)
}, 'car view')

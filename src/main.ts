import './style.css'
import {
    $effect,
    $get,
    $set,
    Derived,
    untrack,
    $each,
    $innertext,
    $if,
    NanoComponent,
    $source,
    type Source,
    $create,
    $child,
    $children,
    $class,
    $destroyer,
    $derived,
} from './lib/'
import { button } from './html-helpers.ts'
import { $text } from './lib/helpers.ts'
import './transform-inspector.ts'

class Car {
    fuel: Source<number>
    name: Source<string>

    constructor(name: string) {
        this.fuel = $source(50, name + '/fuel')
        this.name = $source(name, 'name')
        this.message = $derived(
            () => ($get(this.fuel) < 50 ? 'Time to refuel!' : 'Were good'),
            'time to refuel?',
        )
    }

    message: Derived<string>
}

const cars = $source<Car[]>([], 'car list')
const favCars = $derived(
    () => $get(cars).filter((n) => $get(n.name).startsWith('t')),
    'fav cars',
)

function addCar(name: string) {
    const newCars = untrack(() => [...$get(cars)])

    newCars.push(new Car(name))
    $set(cars, newCars)
}

function deleteCar(car: Car) {
    $set(
        cars,
        untrack(() => [...$get(cars)]).filter((c) => c !== car),
    )
}

class CarDisplay<T extends Element> extends NanoComponent<T> {
    constructor(
        element: T,
        public readonly car: Car,
    ) {
        super(
            element,
            (node) => {
                const div = $create('div')
                const li = $create('li')
                const heading = $create('h2')
                $class(div, 'header')
                const btn = $create('button')
                btn.addEventListener('click', () => deleteCar(car))
                btn.innerText = 'delete'
                $children(div, heading, $text('\u00A0'), btn)
                $child(li, div)
                $effect(
                    () => $innertext(heading, $get(car.name)),
                    'car name heading',
                )
                const gage = new FuelGage(li, car)
                const attach = $child(node, li)
                return () => {
                    attach()
                    gage.destroy()
                }
            },
            'car display component',
        )
    }
}

const app = document.querySelector<HTMLDivElement>('#app')!

class FuelGage<T extends Element> extends NanoComponent<T> {
    constructor(element: T, car: Car) {
        super(
            element,
            (node) => {
                const div = $create('div')
                const span = $create('span')

                $effect(
                    () => $innertext(span, 'Fuel amount: ' + $get(car.fuel)),
                    'render fuel amount',
                )
                div.appendChild(span)

                const btn1 = button('Refill', () => $set(car.fuel, 100))
                const btn2 = button('Drive 10mil', () =>
                    $set(car.fuel, $get(car.fuel) - 10),
                )
                $children(div, $create('br'), btn1, btn2)

                const p = $create('p')
                $effect(
                    () => $innertext(p, $get(car.message)),
                    'write car message',
                )

                $if(
                    div,
                    () => $get(car.fuel) < 30,
                    (node) => {
                        const popup = new WarningPopup(node, car.fuel)
                        return () => popup.destroy()
                    },
                    (node) => {
                        const text = document.createTextNode(
                            'yeah its good enough',
                        )
                        node.appendChild(text)
                        return () => node.removeChild(text)
                    },
                    'fuel < 30',
                )

                return $child(node, div)
            },
            'fuel gage comp',
        )
    }
}

class AddCar<T extends Element> extends NanoComponent<T> {
    constructor(element: T) {
        super(
            element,
            (node) => {
                const input1 = $create('input')
                input1.placeholder = 'Name of car'
                const submit = $create('button')
                submit.type = 'submit'
                const form = $create('form')
                form.addEventListener('submit', (e) => {
                    e.preventDefault()
                    addCar(input1.value)
                })
                $innertext(submit, 'Add a car')
                $children(form, input1, submit)
                return $children(node, form)
            },
            'AddCar root',
        )
    }
}

new NanoComponent(
    app,
    (node) => {
        // new AddCar(node)
        $effect(() => $destroyer(new AddCar(node)), 'add car mounter/destroyer')

        const favourites = $create('span')
        $effect(
            () => $innertext(favourites, JSON.stringify($get(favCars))),
            'write favourites to dom',
        )

        $child(node, favourites)

        const h1 = $create('h1')
        $effect(() => $child(node, h1), 'amount of cars')

        $child(node, $create('hr'))
        const list = $create('ul')
        $child(node, list)

        $each(list, cars, (car, _, node) => {
            const carDisplay = new CarDisplay(node, car)
            return () => carDisplay.destroy()
        })
    },
    'Base App root',
)

class WarningPopup<T extends Element> extends NanoComponent<T> {
    constructor(
        element: T,
        public readonly fuelLevel: Source<number>,
    ) {
        super(
            element,
            (node) => {
                const div = $create('div')
                $class(div, 'warning')
                $effect(
                    () =>
                        $innertext(
                            div,
                            `Holy moly! ${$get(fuelLevel)} gallons left!`,
                        ),
                    'emergency fuel prompt',
                )
                return $child(node, div)
            },
            'warning popup root',
        )
    }
}

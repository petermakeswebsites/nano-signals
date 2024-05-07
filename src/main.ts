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
} from './lib/'
import { button } from './html-helpers.ts'
import { $text } from './lib/helpers.ts'

class Car {
    fuel = $source(50)
    name: Source<string>

    constructor(name: string) {
        this.name = $source(name)
    }

    message = new Derived(() =>
        $get(this.fuel) < 50 ? 'Time to refuel!' : 'Were good',
    )
}

const cars = $source<Car[]>([new Car('Honda')])

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
        super(element, (node) => {
            const div = $create('div')
            const li = $create('li')
            const heading = $create('h2')
            $class(div, 'header')
            const btn = $create('button', undefined, {
                click: () => deleteCar(car),
            })
            btn.innerText = 'delete'
            $children(div, heading, $text('\u00A0'), btn)
            $child(li, div)
            $effect(() => $innertext(heading, $get(car.name)))
            new FuelGage(li, car)
            return $child(node, li)
        })
    }
}

const app = document.querySelector<HTMLDivElement>('#app')!

class FuelGage<T extends Element> extends NanoComponent<T> {
    constructor(element: T, car: Car) {
        super(element, (node) => {
            const div = document.createElement('div')
            const span = document.createElement('span')

            $effect(() => $innertext(span, 'Fuel amount: ' + $get(car.fuel)))
            div.appendChild(span)

            const btn1 = button('Refill', () => $set(car.fuel, 100))
            const btn2 = button('Drive 10mil', () =>
                $set(car.fuel, $get(car.fuel) - 10),
            )
            div.appendChild($create('br'))
            div.appendChild(btn1)
            div.appendChild(btn2)

            $if(
                div,
                () => $get(car.fuel) < 30,
                (node) => {
                    const popup = new WarningPopup(node, car.fuel)
                    return () => popup.destroy()
                },
                (node) => {
                    const text = document.createTextNode('yeah its good enough')
                    node.appendChild(text)
                    return () => node.removeChild(text)
                },
            )

            node.appendChild(div)
            return () => {
                node.removeChild(div)
            }
        })
    }
}

class AddCar<T extends Element> extends NanoComponent<T> {
    constructor(element: T) {
        super(element, (node) => {
            const svg = $create('svg', {
                viewBox: '0 0 100 100',
                width: '100',
                height: '100',
            })
            const input1 = $create('input', { placeholder: 'Name of car' })
            const submit = $create('button', { type: 'submit' })
            const form = $create('form', undefined, {
                submit: (e) => {
                    e.preventDefault()
                    addCar(input1.value)
                },
            })
            $innertext(submit, 'Add a car')
            $children(form, input1, submit)
            return $children(node, svg, form)
        })
    }
}

new NanoComponent(app, (node) => {
    new AddCar(node)

    const h1 = $create('h1')
    $effect(() => {
        h1.innerText = $get(cars).length.toString()
    })

    $child(node, $create('hr'))
    const list = $create('ul')
    $child(node, list)

    $each(list, cars, (car, _, node) => {
        const carDisplay = new CarDisplay(node, car)
        return () => carDisplay.destroy()
    })
})

class WarningPopup<T extends Element> extends NanoComponent<T> {
    constructor(
        element: T,
        public readonly fuelLevel: Source<number>,
    ) {
        super(element, (node) => {
            const div = $create('div')
            $class(div, 'warning')
            $effect(() =>
                $innertext(div, `Holy moly! ${$get(fuelLevel)} gallons left!`),
            )
            return $child(node, div)
        })
    }
}

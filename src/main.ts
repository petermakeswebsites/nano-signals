import './style.css';
import {effect, Source, $get, $set, Derived, untrack} from './lib/';
import {$each, $if, $text} from "./helpers.ts";
import {Component} from "./component.ts";
import {button} from "./html-helpers.ts";

class Car {
    fuel = new Source(50);
    name: Source<string>

    constructor(name: string) {
        this.name = new Source(name);
    }

    message = new Derived(() =>
        $get(this.fuel) < 50 ? 'Time to refuel!' : 'Were good'
    );
}


const cars = new Source<Car[]>([new Car("Honda")])

function addCar(name: string) {
    const newCars = untrack(() =>
        [...$get(cars)]
    )

    newCars.push(new Car(name))
    $set(cars, newCars)
}

function deleteCar(car : Car) {
    $set(cars, untrack(() => [...$get(cars)]).filter(c => c !== car))
}

const app = document.querySelector<HTMLDivElement>('#app')!;

class FuelGage<T extends Element> extends Component<T> {
    constructor(element: T, car : Car) {
        super(element, (node) => {
            const div = document.createElement("div");
            const span = document.createElement("span");

            effect(() => $text(span, 'Fuel amount: ' + $get(car.fuel)))
            div.appendChild(span)

            const btn1 = button("Refill", () => $set(car.fuel,100))
            const btn2 = button("Drive 10mil", () => $set(car.fuel,$get(car.fuel) - 10))
            div.appendChild(btn1)
            div.appendChild(btn2)

            $if(div, () => $get(car.fuel) < 30, (node) => {
                new WarningPopup(node, car.fuel)
            })

            node.appendChild(div)
            return () => {
                node.removeChild(div)
            }
        })
    }
}

class AddCar<T extends Element> extends Component<T> {
    constructor(element: T) {
        super(element, (node) => {
            const form = document.createElement("form");
            const input1 = document.createElement("input");
            const submit = document.createElement("button");
            submit.type = 'submit'
            input1.placeholder = "Name of car"
            submit.innerText = 'Add a car'
            form.appendChild(input1)
            form.appendChild(submit)
            node.appendChild(form)
            form.onsubmit = (e) => {
                e.preventDefault()
                addCar(input1.value)
            }
            return () => {
                node.removeChild(form)
            }
        })
    }
}

new Component(app, (node) => {


    new AddCar(node)

    const list = document.createElement("ul")
    node.appendChild(list)
    $each(list, cars, (car, _, node) => {
        const li = document.createElement("li");
        const btn = button("delete", () => deleteCar(car))
        const div = document.createElement("div");
        div.classList.add("header")
        const heading = document.createElement("h2");
        div.appendChild(heading)
        div.appendChild(new Text('\u00A0'))
        div.appendChild(btn)
        li.appendChild(div)
        node.appendChild(li)
        effect(() => $text(heading, $get(car.name)))
        new FuelGage(li, car)
        return () => {
            node.removeChild(li)
        }
    })

});



class WarningPopup<T extends Element> extends Component<T> {
    constructor(element: T, public readonly fuelLevel: Source<number>) {
        super(element, (node) => {
            const div = document.createElement('div');
            div.classList.add('warning');
            node.appendChild(div);
            effect(() => $text(div, `Holy moly! ${$get(fuelLevel)} gallons left!`))
            return () => {
                node.removeChild(div);
            };
        });
    }
}

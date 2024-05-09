import './style.css'
import './transform-inspector.ts'
import { Car } from './examples/cars.ts'
import { $effect, $get, $root } from './lib'

// export const List = $source<Car[]>([new Car('toyota')], 'car list')

const car = new Car('name', 40)
$root(() => {
    $effect(() => {
        console.log($get(car.lowFuel) ? 'low fuel!' : 'high fuel!')
        $effect(() => {
            console.log($get(car.lowFuel) ? 'i said low fuel!' : 'i said high fuel!')
        }, 'more intense console log')
    }, 'print to console')
}, 'root')

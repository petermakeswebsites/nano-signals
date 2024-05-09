import './style.css'
import './transform-inspector.ts'
import { Car } from './examples/cars.ts'
import { $child, $derived, $effect, $get, $innertext, $root, $set, $source, create, Inspector } from './lib'
import { button, form, textInput } from './ui/form-elements.ts'
// Inspector.forceNames = true

// export const List = $source<Car[]>([new Car('toyota')], 'car list')

const a = $source(1, 'a')
const b = $source(2, 'b')
const c = $source(3, 'c')

const x = $derived(() => $get(a) + $get(b), 'x = a + b') // 1 + 2 = 3
const y = $derived(() => $get(b) * $get(c), 'y = b + c') // 2 * 3 = 6

const end = $derived(() => $get(x) > $get(y), 'x > y ?') // 3 > 6 == false
$root(() => {
    $effect.pre(() => {
        console.log('answer', $get(end))
    }, 'print')
})

// const car = new Car('name', 40)
//
// $root(() => {
//     $effect(() => {
//         console.log($get(car.lowFuel) ? 'low fuel!' : 'high fuel!')
//         $effect(() => {
//             console.log($get(car.message))
//         }, 'more intense console log')
//     }, 'print to console')
// }, 'print root')

// document.addEventListener('DOMContentLoaded', () => {
//     const app = document.getElementById('app')!
//     $root(() => {
//         form(app, {
//             onsubmit: (e) => {
//                 e.preventDefault()
//                 const formData = new FormData(e!.target!) // Create FormData object from the form
//                 const fuel = formData.get('fuel')!
//                 $set(car.fuel, +fuel)
//             },
//             children: (node) => {
//                 const h1 = create('h1')
//                 $child(node, h1)
//                 $effect.pre(() => {
//                     $innertext(h1, 'car fuel:' + $get(car.fuel))
//                 }, 'h1 text')
//
//                 textInput(node, { placeholder: 'hello', name: 'fuel' })
//                 button(node, {
//                     text: 'create',
//                     click: () => {},
//                 })
//                 return () => {}
//             },
//         })
//     }, 'display root')
// })

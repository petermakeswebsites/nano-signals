# Nano Signals

I made Nano Signals to explain in simpler terms how Svelte 5 works under the hood. But you might find this useful in
some circumstances anyway as a tiny reactive framework.

Nano Signals is a lightweight TypeScript library designed for efficient and reactive state management. It enables
fine-grained reactivity through sources, effects, and derived values, making it ideal for complex state management
scenarios in modern web applications.

## Features

- **Reactive Effects**: Define reactive effects that automatically update when their dependencies change.
- **Effect Contexts**: Manage effect contexts to control the lifecycle and reactivity scope.
- **Sources and Derived Values**: Utilize sources for state management and derived values to compute reactive data.

## Installation

Install Nano Signals using npm:

```bash
npm install nano-signals
```

Or using yarn:

```bash
yarn add nano-signals
```

## Usage

### Creating Effects

Define an effect that reacts to changes in dependencies:

```typescript
import {Effect, Source, effect} from 'nano-signals';

const mySource = new Source(0);

const myEffect = effect(() => {
    console.log(`The new value is ${mySource.value}`);
});

// Later in your code
mySource.value = 10;  // This will trigger the effect and log "The new value is 10"
```

### Managing Effect Contexts

You can manage contexts to control the lifecycle of effects:

```typescript
import {EffectRoot} from 'nano-signals';

new EffectRoot(() => {
    // Effects created here will be linked to this root context
});
```

### Working with Derived Values

Create derived values that automatically update based on other reactive sources:

```typescript
import {Derived, $get} from 'nano-signals';

const baseValue = new Source(5);
const derivedValue = new Derived(() => $get(baseValue) * 2);

console.log(derivedValue.value);  // Outputs 10
```

## API Reference

Refer to the type definitions within the library for detailed API information. Key classes and functions
include `Source`, `Derived`, `Effect`, `EffectRoot`, `$get`, and `$set`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.

## License

Nano Signals is [MIT licensed](./LICENSE).

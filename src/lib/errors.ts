export class AlreadyDestroyedError extends Error {
    constructor() {
        // Call the base class constructor with the message
        super('This item (component, effect, or root) has already been destroyed')

        // Set the name of the error to the class name
        this.name = this.constructor.name
    }
}

export class DebounceTimer {
    private timerId: number | null = null

    // Method to handle debouncing
    debounce(callback: () => void, delay: number): void {
        // Clears the existing timer if it exists, ensuring that function calls are debounced
        if (this.timerId !== null) {
            clearTimeout(this.timerId)
        }

        // Sets a new timer
        this.timerId = setTimeout(() => {
            callback()
            this.timerId = null // Reset the timerId after execution
        }, delay)
    }

    // Method to clear the timer
    clear(): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }
    }
}

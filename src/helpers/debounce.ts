export class DebounceTimer {
    private timerId: number | null = null
    debounce(callback: () => void, delay: number): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId)
        }

        this.timerId = setTimeout(() => {
            callback()
            this.timerId = null
        }, delay)
    }
    clear(): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }
    }
}

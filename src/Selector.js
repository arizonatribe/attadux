export default class Selector {
    constructor(func) {
        this.func = func
    }

    extractFunction(selectors) {
        return this.func(selectors)
    }
}

interface OPT<T> {
    [key: string]: T
}

interface OPTS {
    el: string,
    data: OPT<any>,
    methods: OPT<(...arfv: any[]) => void>
}

const watchers: watcher[] = []
const push = (w: watcher) => {
    watchers.push(w)
    Dep.target = w

}
const pop = (w: watcher) => {
    watchers.pop()
    Dep.target = null
}

class watcher {
    private value: any
    private vm: V2
    private callback: (value: any, oldValue: any) => any
    private expression: string

    constructor(vm: V2, expression: string, callback: (value: any, oldValue: any) => any) {
        this.vm = vm
        this.expression = expression
        this.callback = callback
        push(this)
        this.value = this.getValue()
        pop(this)
    }

    getValue(): any {
        return this.vm.$data[this.expression]
    }

    addSub(dep: Dep) {
        dep.subs.push(this)
    }

    update() {
        const oldValue = this.value
        this.value = this.getValue()
        this.callback(this.value, oldValue)
    }
}

class Dep {
    static target: watcher | null
    subs: watcher[] = []

    recive() {
        if (Dep.target) {
            Dep.target.addSub(this)
        }
    }

    notfiy() {
        this.subs.forEach(watch => {
            watch.update()
        })
    }
}


class baseClass {
    constructor(opts: OPTS) {

    }

    toObserver<T extends object>(data: T) {
        const dep = new Dep()
        return new Proxy(data, {
            get(target: T, p: string, receiver: any) {
                dep.recive()
                return (target as any)[p]
            },
            set(target: OPT<any>, p: string | number | symbol, value: any, receiver: any): boolean {
                const oldValue = Reflect.get(target, p, receiver)
                const result = Reflect.set(target, p, value, receiver)
                if (oldValue !== value) {
                    dep.notfiy()
                }
                return result
            }
        })
    }


    compile() {

    }
}

class V2 extends baseClass {
    $el: HTMLElement | null
    $data: OPTS['data']

    constructor(opts: OPTS) {
        super(opts)
        const {el, data = {}, methods = {}} = opts
        this.$el = document.querySelector(el)
        this.$data = this.toObserver(data)
        this.compile()
        this.watch("age", (value, oldValue) => {
            console.log("age:", oldValue);
            console.log("age:", value);
        })
        this.watch("name", (value, oldValue) => {
            console.log("name:", oldValue);
            console.log("name:", value);
        })
    }

    watch(expression: string, cb: (value: any, oldValue: any) => any) {
        return new watcher(this, expression, cb)
    }
}

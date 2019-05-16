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
    private eKeys: string[]
    private vm: V2
    private callback: (value: any, oldValue: any) => any
    public expression: string

    constructor(vm: V2, expression: string, callback: (value: any, oldValue: any) => any) {
        this.vm = vm
        this.eKeys = expression.split(".").filter(item => item.trim())
        this.expression = this.eKeys[this.eKeys.length - 1]
        this.callback = callback

        this.value = this.getValue(exp => {
            push(this)
            exp()
            pop(this)
        })

    }

    getValue(fn: (exp: () => void) => void | undefined): any {
        let value = this.vm.$data
        this.eKeys.forEach((key, index) => {
            if (index === this.eKeys.length - 1 && fn) {
                return fn(() => {
                    value = value[key]
                })
            }
            value = value[key]

        })
        return value
    }

    addSub(dep: Dep) {
        dep.subs.push(this)
    }

    update() {
        const oldValue = this.value
        this.value = this.getValue(exp => exp())
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

    notfiy(key: string) {
        this.subs.filter(watch => watch.expression === key).forEach(watch => {
            watch.update()
        })
    }
}


class baseClass {
    constructor(opts: OPTS) {

    }

    private proxySet = new WeakSet();

    toObserver<T extends object>(data: T): any {
        if (!(typeof data === 'object' && !(this.proxySet.has(data)))) {
            return data
        }
        const dep = new Dep()
        const that = this
        const proxy = new Proxy(data, {
            get(target: T, p: string, receiver: any) {
                (target as any)[p] = that.toObserver((target as any)[p])
                dep.recive()
                return (target as any)[p]
            },
            set(target: OPT<any>, p: string | number | symbol, value: any, receiver: any): boolean {
                const oldValue = Reflect.get(target, p, receiver)
                const result = Reflect.set(target, p, value, receiver)
                if (oldValue !== value) {
                    dep.notfiy(p as string)
                }
                return result
            }
        })
        that.proxySet.add(proxy)
        return proxy
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
        this.watch("test.age", (value, oldValue) => {
            console.log("age:", oldValue);
            console.log("age:", value);
        })
        this.watch("name", (value, oldValue) => {
            console.log("name:", oldValue);
            console.log("name:", value);
        })
        this.$data.test.age = 222;
    }

    watch(expression: string, cb: (value: any, oldValue: any) => any) {
        return new watcher(this, expression, cb)
    }
}

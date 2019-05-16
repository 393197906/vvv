type DirectiveFunction = (el: any, value: any) => void
type DirectiveObject = {
    eventName: string
}

interface Directive {
    [key: string]: DirectiveFunction | DirectiveObject
}

const DIRECTIVES: Directive = {
    "text": function (el, value) {
        el.textContent = value || ""
    },
    "value": function (el, value) {
        el.value = value || ""
    },
    "onclick": {
        eventName: "click"
    },
    "oninput": {
        eventName: "input"
    }
}

const prefix = "v-"
const directiveNames: string = Object.keys(DIRECTIVES).map(key => `[${prefix}${key}]`).join()

interface Attributes<T> {
    [key: string]: T
}

interface Opts {
    el: string,
    data: Attributes<any>,
    methods: Attributes<() => any>
}

interface Bind {
    [key: string]: string[] | HTMLElement
}

const VVV = class {
    $el: HTMLElement | null
    $methods: Opts['methods']
    $els: NodeListOf<HTMLElement>
    $binds: Bind[]
    $data: Opts['data']

    constructor(opts: Opts) {
        this.$el = opts.el ? document.querySelector(opts.el) : null
        this.$methods = opts.methods
        if (!this.$el) throw new Error("error")
        this.$els = this.$el.querySelectorAll(directiveNames)

        this.$binds = []
        const that = this
        this.$data = new Proxy({}, {
            get(target, key, receiver) {
                return target[key]
            },
            set(target, key, value, receiver) {
                const binds = that.$binds.filter(item => {
                    return Object.keys(item).find(k => k === key)
                })
                if (!binds.length) return target[key] = value
                binds.forEach(bind => {
                    const bindDirectives = bind[key as string] as string[]
                    bindDirectives.forEach(item => {
                        const name = item.split(prefix)[item.split(prefix).length - 1]
                        const directive = DIRECTIVES[name]
                        if (!directive) return
                        if (typeof directive === 'function') directive(bind.el, value)
                    })
                })
                return target[key] = value
            }
        } as ProxyHandler<any>);

        this.$binds = Array.prototype.map.call(this.$els, (item: HTMLElement) => {
            const {attributes} = item
            const result: Bind = {
                el: item,
            }
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i]
                if (attr.name.indexOf(`${prefix}on`) > -1) {
                    const methodsName = attr.value
                    if (this.$methods[methodsName]) {
                        const name = attr.name.split(prefix)[attr.name.split(prefix).length - 1]
                        DIRECTIVES[name] && item.addEventListener((DIRECTIVES[name] as DirectiveObject).eventName, this.$methods[methodsName].bind(this.$data))
                    }
                    break
                }
                result[attr.value] = Array.isArray(result[attr.value]) ? [...(result[attr.value] as string[]), attr.name] : [attr.name]
            }
            return result
        }) as Bind[]
        for (let key in opts.data || {}) {
            this.$data[key] = opts.data[key]
        }
    }
}

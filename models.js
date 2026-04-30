class Count {
    constructor(cant, date = new Date()) {
        this.cant = cant;
        this.date = date;
    }

    toJson() {
        return { cant: this.cant, date: new Date(this.date).toISOString() };
    }

    static fromJson(obj) {
        return new Count(obj.cant, new Date(obj.date));
    }
}

class Counter {
    constructor(name) {
        this.name = name;
        this.counts = [];
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            counts: this.counts.map(c => c.toJson())
        };
    }

    static fromJson(obj) {
        const counter = new Counter(obj.name);
        counter.id = obj.id;
        counter.counts = (obj.counts || []).map(c => Count.fromJson(c));
        return counter;
    }
}

class State {
    constructor() {
        this.currentPanel = 'conteos';
    }

    toJson() {
        return { currentPanel: this.currentPanel };
    }

    static fromJson(obj) {
        const s = new State();
        s.currentPanel = obj.currentPanel || 'conteos';
        return s;
    }
}

class Category {
    constructor(name, parent = null) {
        this.name = name;
        this.parent = parent;
        this.counters = [];
        this.state_gestor = 'collapsed';
        this.state_conteos = 'collapsed';
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            parentId: this.parentId || null,
            state_gestor: this.state_gestor,
            state_conteos: this.state_conteos,
            counters: this.counters.map(c => c.toJson())
        };
    }

    static fromJson(obj) {
        const cat = new Category(obj.name);
        cat.id = obj.id;
        cat.parentId = obj.parentId || null;
        cat.state_gestor = obj.state_gestor || 'collapsed';
        cat.state_conteos = obj.state_conteos || 'collapsed';
        cat.counters = (obj.counters || []).map(c => Counter.fromJson(c));
        return cat;
    }
}

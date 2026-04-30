let categories = [];
let fileHandle = null;

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function getTodayCount(counter) {
    const today = new Date();
    return counter.counts.find(c => isSameDay(new Date(c.date), today)) || null;
}

function getTodayTotal(counter) {
    const tc = getTodayCount(counter);
    return tc ? tc.cant : 0;
}

// --- Serialización ---

function stateToJson() {
    return { categories: categories.map(c => c.toJson()) };
}

function loadFromJson(data) {
    categories = (data.categories || []).map(c => Category.fromJson(c));
}

// --- Persistencia ---

function loadState() {
    const saved = localStorage.getItem('contador-state');
    if (saved) loadFromJson(JSON.parse(saved));
}

function persistState() {
    localStorage.setItem('contador-state', JSON.stringify(stateToJson()));
}

async function saveToFile() {
    const data = stateToJson();
    const json = JSON.stringify(data, null, 2);

    if (window.showSaveFilePicker || window.showOpenFilePicker) {
        // File System Access API disponible
        if (!fileHandle) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'contador.json',
                    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
                });
            } catch (e) {
                if (e.name === 'AbortError') return;
                throw e;
            }
        }
        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();
    } else {
        // Fallback: descarga
        _downloadFallback(json, fileHandle ? fileHandle.name : 'contador.json');
    }
}

async function openFile() {
    if (window.showOpenFilePicker) {
        let handle;
        try {
            [handle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
        } catch (e) {
            if (e.name === 'AbortError') return null;
            throw e;
        }
        const file = await handle.getFile();
        const text = await file.text();
        fileHandle = handle;
        loadFromJson(JSON.parse(text));
        persistState();
        return handle.name;
    }
    // Fallback: dispara el input[type=file] oculto
    return new Promise(resolve => {
        const input = document.getElementById('fileInput');
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) { resolve(null); return; }
            const text = await file.text();
            loadFromJson(JSON.parse(text));
            persistState();
            input.value = '';
            resolve(file.name);
        };
        input.click();
    });
}

function newFile() {
    fileHandle = null;
    categories = [];
    persistState();
}

function _downloadFallback(json, filename) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// --- CRUD ---

function addCategory(name, parentId = null) {
    const cat = new Category(name);
    cat.id = genId();
    cat.parentId = parentId;
    cat.counters = [];
    categories.push(cat);
    persistState();
}

function editCategory(id, name, parentId) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    cat.name = name;
    cat.parentId = parentId;
    persistState();
}

function deleteCategory(id) {
    const idx = categories.findIndex(c => c.id === id);
    if (idx !== -1) categories.splice(idx, 1);
    persistState();
}

function addCounter(catId, name) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const counter = new Counter(name);
    counter.id = genId();
    cat.counters.push(counter);
    persistState();
}

function deleteCounter(catId, counterId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    cat.counters = cat.counters.filter(c => c.id !== counterId);
    persistState();
}

function getTree() {
    categories.forEach(c => { c.children = []; });
    const map = {};
    categories.forEach(c => { map[c.id] = c; });
    const roots = [];
    categories.forEach(c => {
        if (c.parentId && map[c.parentId]) {
            map[c.parentId].children.push(c);
        } else {
            roots.push(c);
        }
    });
    return roots;
}

function adjustCount(catId, counterId, delta) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const counter = cat.counters.find(c => c.id === counterId);
    if (!counter) return;
    let todayCount = getTodayCount(counter);
    if (!todayCount) {
        todayCount = new Count(0, new Date());
        counter.counts.push(todayCount);
    }
    todayCount.cant = Math.max(0, todayCount.cant + delta);
}

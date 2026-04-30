function catSummary(cat) {
    const parts = [];
    if (cat.counters.length > 0) parts.push(`${cat.counters.length} contador${cat.counters.length !== 1 ? 'es' : ''}`);
    if (cat.children && cat.children.length > 0) parts.push(`${cat.children.length} sub${cat.children.length !== 1 ? 'categorías' : 'categoría'}`);
    return parts.join(' · ');
}

// --- Conteos ---

function renderCatNodeConteos(cat, depth) {
    const summary = catSummary(cat);
    const children = cat.children || [];

    const expandedC = cat.state_conteos === 'expanded';
    return `
        <div class="cat-item${depth > 0 ? ' nested-cat' : ''}">
            <button class="cat-header" onclick="toggleCat('c', '${cat.id}')">
                <div class="cat-header-name">
                    <span>${cat.name}</span>
                    ${summary ? `<span class="cat-summary">${summary}</span>` : ''}
                </div>
                <i class="bi bi-chevron-down cat-chevron${expandedC ? ' open' : ''}" id="cat-icon-c-${cat.id}"></i>
            </button>
            <div class="cat-body${expandedC ? '' : ' d-none'}" id="cat-body-c-${cat.id}">
                ${cat.counters.map(counter => `
                    <div class="counter-row">
                        <button class="btn-adjust btn btn-outline-danger" onclick="onAdjust('${cat.id}','${counter.id}',-1)">
                            <i class="bi bi-dash-lg"></i>
                        </button>
                        <div class="counter-info">
                            <div class="name">${counter.name}</div>
                            <div class="today">${getTodayTotal(counter)}</div>
                        </div>
                        <button class="btn-adjust btn btn-outline-success" onclick="onAdjust('${cat.id}','${counter.id}',1)">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                `).join('')}
                ${children.map(child => renderCatNodeConteos(child, depth + 1)).join('')}
            </div>
        </div>
    `;
}

function renderConteos() {
    const list = document.getElementById('conteos-list');
    const tree = getTree();
    if (tree.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-5">No hay categorías. Creá una en Gestor.</p>';
        return;
    }
    list.innerHTML = tree.map(cat => renderCatNodeConteos(cat, 0)).join('');
}

// --- Gestor ---

function renderCatNodeGestor(cat, depth) {
    const summary = catSummary(cat);
    const children = cat.children || [];
    const emptyBody = cat.counters.length === 0 && children.length === 0;

    const expandedG = cat.state_gestor === 'expanded';
    return `
        <div class="${depth > 0 ? 'nested-cat' : ''}">
            <div class="gestor-card mb-2">
                <div class="gestor-card-header">
                    <button class="gestor-toggle" onclick="toggleCat('g', '${cat.id}')">
                        <i class="bi bi-chevron-down cat-chevron${expandedG ? ' open' : ''}" id="cat-icon-g-${cat.id}"></i>
                        <div class="cat-header-name ms-1">
                            <span>${cat.name}</span>
                            ${summary ? `<span class="cat-summary">${summary}</span>` : ''}
                        </div>
                    </button>
                    <div class="gestor-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="onOpenAddCounterModal('${cat.id}')">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="onEditCategory('${cat.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="onDeleteCategory('${cat.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div id="cat-body-g-${cat.id}" class="${expandedG ? '' : 'd-none'}">
                    ${emptyBody ? '<div class="p-2 text-muted small">Sin contenido</div>' : ''}
                    ${cat.counters.map(counter => `
                        <div class="gestor-counter-row">
                            <span>${counter.name}</span>
                            <button class="btn btn-sm btn-outline-danger" onclick="onDeleteCounter('${cat.id}','${counter.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                    ${children.map(child => renderCatNodeGestor(child, depth + 1)).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderGestor() {
    const list = document.getElementById('gestor-list');
    const tree = getTree();
    if (tree.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-4">No hay categorías aún.</p>';
        return;
    }
    list.innerHTML = tree.map(cat => renderCatNodeGestor(cat, 0)).join('');
}

// --- Calendario ---

function renderCalendario() {
    const list = document.getElementById('calendario-list');

    const events = [];
    categories.forEach(cat => {
        cat.counters.forEach(counter => {
            counter.counts.forEach(count => {
                if (count.cant > 0) {
                    events.push({
                        dateObj: new Date(count.date),
                        catName: cat.name,
                        counterName: counter.name,
                        cant: count.cant
                    });
                }
            });
        });
    });

    if (events.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-5">No hay registros aún.</p>';
        return;
    }

    const byDay = {};
    events.forEach(e => {
        const d = e.dateObj;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(e);
    });

    const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

    list.innerHTML = sortedDays.map(key => {
        const [y, m, d] = key.split('-');
        const label = new Date(y, m - 1, d).toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        return `
            <div class="cal-day-header">${label}</div>
            ${byDay[key].map(e => `
                <div class="cal-event">
                    <div>
                        <span class="fw-medium">${e.counterName}</span>
                        <span class="text-muted small ms-1">${e.catName}</span>
                    </div>
                    <span class="badge bg-primary rounded-pill">${e.cant}</span>
                </div>
            `).join('')}
        `;
    }).join('');
}

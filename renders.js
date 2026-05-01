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
                            <div class="today" ondblclick="onEditCounterValue('${cat.id}','${counter.id}',this)">${getTotalAllTime(counter)}</div>
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
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-secondary" onclick="onEditCounter('${cat.id}','${counter.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="onDeleteCounter('${cat.id}','${counter.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
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
    const { calendarYear: year, calendarMonth: month, calendarSelectedDay: selDay } = appState;

    // Días con actividad en el mes visible (para el grid)
    const activityDays = new Set();
    // Todos los eventos históricos (para la lista)
    const allEvents = [];
    categories.forEach(cat => {
        cat.counters.forEach(counter => {
            counter.counts.forEach(count => {
                if (count.cant <= 0) return;
                const d = new Date(count.date);
                if (d.getFullYear() === year && d.getMonth() === month) {
                    activityDays.add(d.getDate());
                }
                allEvents.push({ dateObj: d, day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), catName: cat.name, counterName: counter.name, cant: count.cant });
            });
        });
    });
    allEvents.sort((a, b) => b.dateObj - a.dateObj);

    // Cabecera de mes
    const monthLabel = new Date(year, month, 1)
        .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    // Grid de días
    const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
    const firstDow = new Date(year, month, 1).getDay(); // 0=Dom
    const offset = (firstDow + 6) % 7;                  // lunes=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

    const headerCells = DAY_NAMES.map(h => `<div class="cal-hcell">${h}</div>`).join('');
    let dayCells = '<div class="cal-cell-empty"></div>'.repeat(offset);
    for (let d = 1; d <= daysInMonth; d++) {
        const hasAct  = activityDays.has(d);
        const isToday = isThisMonth && d === today.getDate();
        const isSel   = d === selDay;
        const cls = ['cal-cell', hasAct ? 'has-act' : '', isToday ? 'is-today' : '', isSel ? 'is-sel' : ''].filter(Boolean).join(' ');
        dayCells += `<div class="${cls}" onclick="selectCalDay(${d})">${d}${hasAct ? '<span class="act-dot"></span>' : ''}</div>`;
    }

    // Lista: todo el historial, o solo el día seleccionado en el mes visible
    const filtered = selDay
        ? allEvents.filter(e => e.day === selDay && e.month === month && e.year === year)
        : allEvents;
    const listLabel = selDay
        ? `${selDay} de ${new Date(year, month, selDay).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`
        : 'Historial completo';

    const activityHtml = filtered.length === 0
        ? '<p class="text-muted small text-center mt-2">Sin actividad.</p>'
        : filtered.map(e => {
            const dateLabel = e.dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
            return `
            <div class="cal-event">
                <div>
                    <span class="fw-medium">${e.counterName}</span>
                    <span class="text-muted small ms-1">${e.catName}</span>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary rounded-pill">${e.cant}</span>
                    <div class="cal-event-day">${dateLabel}</div>
                </div>
            </div>`;
        }).join('');

    list.innerHTML = `
        <div class="cal-nav">
            <button class="btn btn-sm btn-outline-secondary" onclick="prevMonth()"><i class="bi bi-chevron-left"></i></button>
            <span class="cal-month-title">${monthLabel}</span>
            <button class="btn btn-sm btn-outline-secondary" onclick="nextMonth()"><i class="bi bi-chevron-right"></i></button>
        </div>
        <div class="cal-grid">
            ${headerCells}
            ${dayCells}
        </div>
        <div class="mt-3">
            <div class="cal-section-label">${listLabel}</div>
            ${activityHtml}
        </div>`;
}

const panels = ['conteos', 'gestor', 'calendario'];

function showPanel(name) {
    appState.currentPanel = name;
    persistAppState();
    panels.forEach(p => {
        document.getElementById(`panel-${p}`).classList.toggle('d-none', p !== appState.currentPanel);
        document.getElementById(`nav-${p}`).classList.toggle('active', p === appState.currentPanel);
    });
    if (appState.currentPanel === 'conteos') renderConteos();
    if (appState.currentPanel === 'gestor') renderGestor();
    if (appState.currentPanel === 'calendario') renderCalendario();
}

function toggleCat(prefix, catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const key = prefix === 'c' ? 'state_conteos' : 'state_gestor';
    cat[key] = cat[key] === 'expanded' ? 'collapsed' : 'expanded';
    persistState();
    document.getElementById(`cat-body-${prefix}-${catId}`).classList.toggle('d-none');
    document.getElementById(`cat-icon-${prefix}-${catId}`).classList.toggle('open');
}

// --- Archivo ---

let currentFileName = null;

function updateFilenameDisplay(name) {
    if (name !== undefined) {
        currentFileName = name;
        if (name) {
            localStorage.setItem('contador-filename', name);
        } else {
            localStorage.removeItem('contador-filename');
        }
    }
    const el = document.getElementById('app-filename');
    if (!currentFileName) {
        el.textContent = 'sin archivo';
    } else if (fileHandle) {
        el.textContent = currentFileName;
    } else {
        el.textContent = currentFileName + ' (local)';
    }
}

async function onNewFile() {
    if (!confirm('¿Crear nuevo? Los cambios no guardados se perderán.')) return;
    newFile();
    updateFilenameDisplay(null);
    showPanel(appState.currentPanel);
}

async function onOpenFile() {
    const name = await openFile();
    if (name === null) return;
    updateFilenameDisplay(name);
    showPanel(appState.currentPanel);
}

async function saveChanges() {
    persistState();
    await saveToFile();
    updateFilenameDisplay(); // refresca sin cambiar el nombre

    const btn = document.querySelector('.save-btn');
    btn.classList.replace('btn-primary', 'btn-success');
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Guardado';
    setTimeout(() => {
        btn.classList.replace('btn-success', 'btn-primary');
        btn.innerHTML = '<i class="bi bi-floppy me-1"></i> Save';
    }, 1500);
}

// --- Conteos ---

function onAdjust(catId, counterId, delta) {
    adjustCount(catId, counterId, delta);
    renderConteos();
}

// --- Gestor ---

function onDeleteCategory(catId) {
    if (!confirm('¿Eliminar categoría y todos sus contadores?')) return;
    deleteCategory(catId);
    renderGestor();
}

function onDeleteCounter(catId, counterId) {
    if (!confirm('¿Eliminar contador?')) return;
    deleteCounter(catId, counterId);
    renderGestor();
}

let _targetCatId = null;
let _editingCatId = null;

function onOpenAddCounterModal(catId) {
    _targetCatId = catId;
    document.getElementById('counterNameInput').value = '';
    new bootstrap.Modal(document.getElementById('counterModal')).show();
}

function _openCategoryModal(editingId = null) {
    _editingCatId = editingId;
    const editing = editingId ? categories.find(c => c.id === editingId) : null;

    document.querySelector('#categoryModal .modal-title').textContent =
        editing ? 'Editar categoría' : 'Nueva categoría';
    document.getElementById('categoryNameInput').value = editing ? editing.name : '';

    const sel = document.getElementById('categoryParentSelect');
    sel.innerHTML = '<option value="">Sin categoría padre</option>' +
        categories
            .filter(c => c.id !== editingId)
            .map(c => `<option value="${c.id}" ${editing && editing.parentId === c.id ? 'selected' : ''}>${c.name}</option>`)
            .join('');

    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

function openAddCategoryModal() { _openCategoryModal(null); }
function onEditCategory(catId)  { _openCategoryModal(catId); }

function saveCategory() {
    const name = document.getElementById('categoryNameInput').value.trim();
    if (!name) return;
    const parentId = document.getElementById('categoryParentSelect').value || null;
    if (_editingCatId) {
        editCategory(_editingCatId, name, parentId);
    } else {
        addCategory(name, parentId);
    }
    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
    renderGestor();
}

function saveCounter() {
    const name = document.getElementById('counterNameInput').value.trim();
    if (!name) return;
    addCounter(_targetCatId, name);
    bootstrap.Modal.getInstance(document.getElementById('counterModal')).hide();
    renderGestor();
}

// --- Calendario ---

function prevMonth() {
    if (appState.calendarMonth === 0) { appState.calendarMonth = 11; appState.calendarYear--; }
    else { appState.calendarMonth--; }
    appState.calendarSelectedDay = null;
    persistAppState();
    renderCalendario();
}

function nextMonth() {
    if (appState.calendarMonth === 11) { appState.calendarMonth = 0; appState.calendarYear++; }
    else { appState.calendarMonth++; }
    appState.calendarSelectedDay = null;
    persistAppState();
    renderCalendario();
}

function selectCalDay(day) {
    appState.calendarSelectedDay = appState.calendarSelectedDay === day ? null : day;
    persistAppState();
    renderCalendario();
}

// --- Teclado ---

document.getElementById('categoryNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCategory();
});
document.getElementById('counterNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCounter();
});

// --- Init ---

async function init() {
    loadAppState();
    loadState();

    // Intenta restaurar el fileHandle desde IndexedDB (desktop con File System Access API)
    if (window.showOpenFilePicker || window.showSaveFilePicker) {
        const handle = await loadFileHandle();
        if (handle) {
            fileHandle = handle;
            updateFilenameDisplay(handle.name);
        }
    }

    // Fallback: restaura solo el nombre desde localStorage (móvil)
    if (!currentFileName) {
        const saved = localStorage.getItem('contador-filename');
        if (saved && categories.length > 0) updateFilenameDisplay(saved);
    }

    showPanel(appState.currentPanel);
}

init();

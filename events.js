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
let isDirty = false;

function _isMobile() {
    return !window.showSaveFilePicker && !window.showOpenFilePicker;
}

function markDirty() {
    isDirty = true;
    updateSaveBtn();
}

function updateSaveBtn() {
    const btn = document.getElementById('save-btn');
    if (!btn) return;
    const showDownload = _isMobile() && !isDirty;
    btn.classList.toggle('btn-primary', !showDownload);
    btn.classList.toggle('btn-secondary', showDownload);
    btn.innerHTML = showDownload
        ? '<i class="bi bi-download me-1"></i> Download'
        : '<i class="bi bi-floppy me-1"></i> Save';
}

function onSaveBtnClick() {
    if (_isMobile() && !isDirty) {
        exportJson();
    } else {
        saveChanges();
    }
}

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
    const renameBtn = document.getElementById('btn-rename-file');
    if (renameBtn) renameBtn.classList.toggle('d-none', !currentFileName);
}

function onRenameFile() {
    if (!currentFileName) return;
    const newName = prompt('Nombre del archivo:', currentFileName);
    if (!newName || !newName.trim() || newName.trim() === currentFileName) return;
    updateFilenameDisplay(newName.trim());
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
    updateFilenameDisplay();
    isDirty = false;

    const btn = document.getElementById('save-btn');
    btn.classList.remove('btn-primary', 'btn-secondary');
    btn.classList.add('btn-success');
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Guardado';
    setTimeout(() => {
        btn.classList.remove('btn-success');
        updateSaveBtn();
    }, 1500);
}

// --- Conteos ---

function onAdjust(catId, counterId, delta) {
    adjustCount(catId, counterId, delta);
    markDirty();
    renderConteos();
}

function onEditCounterValue(catId, counterId, el) {
    const current = getTotalAllTime(
        categories.find(c => c.id === catId)?.counters.find(c => c.id === counterId) || { counts: [] }
    );
    el.innerHTML = `<input type="number" class="counter-edit-input" value="${current}" min="0">`;
    const input = el.querySelector('input');
    input.focus();
    input.select();

    let committed = false;
    function commit() {
        if (committed) return;
        committed = true;
        const val = parseInt(input.value);
        if (!isNaN(val) && val !== current) {
            setCount(catId, counterId, val);
            markDirty();
        }
        renderConteos();
    }
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { committed = true; renderConteos(); }
    });
    input.addEventListener('blur', commit);
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
let _editingCounterId = null;

function onOpenAddCounterModal(catId) {
    _targetCatId = catId;
    _editingCounterId = null;
    document.querySelector('#counterModal .modal-title').textContent = 'Nuevo contador';
    document.getElementById('counterNameInput').value = '';
    new bootstrap.Modal(document.getElementById('counterModal')).show();
}

function onEditCounter(catId, counterId) {
    const cat = categories.find(c => c.id === catId);
    const counter = cat.counters.find(c => c.id === counterId);
    _targetCatId = catId;
    _editingCounterId = counterId;
    document.querySelector('#counterModal .modal-title').textContent = 'Editar contador';
    document.getElementById('counterNameInput').value = counter.name;
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
    if (_editingCounterId) {
        editCounter(_targetCatId, _editingCounterId, name);
    } else {
        addCounter(_targetCatId, name);
    }
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
    updateSaveBtn();
}

init();

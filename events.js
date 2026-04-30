const panels = ['conteos', 'gestor', 'calendario'];
let currentPanel = 'conteos';

function showPanel(name) {
    currentPanel = name;
    panels.forEach(p => {
        document.getElementById(`panel-${p}`).classList.toggle('d-none', p !== name);
        document.getElementById(`nav-${p}`).classList.toggle('active', p === name);
    });
    if (name === 'conteos') renderConteos();
    if (name === 'gestor') renderGestor();
    if (name === 'calendario') renderCalendario();
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

function updateFilenameDisplay(name) {
    document.getElementById('app-filename').textContent = name || 'sin archivo';
}

async function onNewFile() {
    if (!confirm('¿Crear nuevo? Los cambios no guardados se perderán.')) return;
    newFile();
    updateFilenameDisplay(null);
    showPanel(currentPanel);
}

async function onOpenFile() {
    const name = await openFile();
    if (name === null) return;
    updateFilenameDisplay(name);
    showPanel(currentPanel);
}

async function saveChanges() {
    persistState();
    await saveToFile();
    updateFilenameDisplay(fileHandle ? fileHandle.name : null);

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

// --- Teclado ---

document.getElementById('categoryNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCategory();
});
document.getElementById('counterNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCounter();
});

// --- Init ---

loadState();
showPanel('conteos');

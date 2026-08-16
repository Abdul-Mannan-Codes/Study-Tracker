/* ==================== Study With Ease ==================== */

const STORAGE_KEY = 'studyWithEaseData';
const THEMES = [
    { id: 'paper', label: 'Paper' },
    { id: 'dark', label: 'Dark' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'rose', label: 'Rose' },
];

let state = null;          // { subjects: {id: {...}}, order: [id,...], theme: 'paper' }
let activeSubjectId = null;

/* ---------- Storage ---------- */

function uid() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultState() {
    return {
        subjects: {},
        order: [],
        theme: 'paper',
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return migrateLegacyData() || seedIfEmpty(defaultState());
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.subjects) return defaultState();
        return parsed;
    } catch (e) {
        console.error('Failed to load data, starting fresh.', e);
        return defaultState();
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save data', e);
        showToast("Couldn't save — your browser storage may be full.");
    }
}

// Best-effort pickup of data from the old, per-key localStorage format so
// nobody's existing subjects vanish when the app upgrades.
function migrateLegacyData() {
    const legacyKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === STORAGE_KEY) continue;
        try {
            const val = JSON.parse(localStorage.getItem(key));
            if (val && Array.isArray(val.topics) && Array.isArray(val.flashcards)) {
                legacyKeys.push({ key, val });
            }
        } catch (e) { /* not legacy data, skip */ }
    }
    if (legacyKeys.length === 0) return null;

    const fresh = defaultState();
    legacyKeys.forEach(({ key, val }) => {
        const id = uid();
        fresh.subjects[id] = {
            id,
            name: key,
            topics: val.topics.map(t => ({ id: uid(), text: t.topic || '', complete: !!t.isComplete })),
            flashcards: val.flashcards.map(f => ({ id: uid(), title: f.title || '', content: f.content || '' })),
        };
        fresh.order.push(id);
        localStorage.removeItem(key);
    });
    return fresh;
}

function seedIfEmpty(fresh) {
    return fresh; // start blank; empty state UI invites the first subject
}

/* ---------- Rendering ---------- */

function render() {
    renderTabs();
    renderPanels();
    document.getElementById('emptyState').hidden = state.order.length > 0;
}

function subjectProgress(subject) {
    if (subject.topics.length === 0) return 0;
    const done = subject.topics.filter(t => t.complete).length;
    return Math.round((done / subject.topics.length) * 100);
}

function renderTabs() {
    const tabsEl = document.getElementById('tabs');
    tabsEl.innerHTML = '';

    if (state.order.length > 0 && !state.subjects[activeSubjectId]) {
        activeSubjectId = state.order[0];
    }

    state.order.forEach(id => {
        const subject = state.subjects[id];
        const pct = subjectProgress(subject);

        const tab = document.createElement('button');
        tab.className = 'tab' + (id === activeSubjectId ? ' active' : '');
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', id === activeSubjectId);
        tab.title = `${subject.name} — ${pct}% complete. Double-click to rename.`;
        tab.addEventListener('click', () => { activeSubjectId = id; render(); });
        tab.addEventListener('dblclick', (e) => { e.stopPropagation(); openSubjectModal(id); });

        const ring = document.createElement('span');
        ring.className = 'progress-ring';
        ring.style.setProperty('--pct', pct);

        const name = document.createElement('span');
        name.className = 'tab-name';
        name.textContent = subject.name;

        tab.appendChild(ring);
        tab.appendChild(name);
        tabsEl.appendChild(tab);
    });

    const addTab = document.createElement('button');
    addTab.className = 'tab tab-add';
    addTab.textContent = '+ Add subject';
    addTab.addEventListener('click', () => openSubjectModal(null));
    tabsEl.appendChild(addTab);
}

function renderPanels() {
    const panelsEl = document.getElementById('panels');
    panelsEl.innerHTML = '';

    state.order.forEach(id => {
        const subject = state.subjects[id];
        const panel = buildPanel(subject);
        if (id === activeSubjectId) panel.classList.add('active');
        panelsEl.appendChild(panel);
    });
}

function buildPanel(subject) {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.dataset.subjectId = subject.id;

    const pct = subjectProgress(subject);
    const doneCount = subject.topics.filter(t => t.complete).length;

    panel.innerHTML = `
        <div class="panel-header">
            <h2>${escapeHtml(subject.name)}</h2>
            <div class="panel-header-actions">
                <button class="btn btn-sm btn-ghost" data-action="rename">Rename</button>
                <button class="btn btn-sm btn-danger" data-action="delete-subject">Delete subject</button>
            </div>
        </div>
        <p class="progress-summary">${subject.topics.length === 0 ? 'No topics yet.' : `${doneCount} of ${subject.topics.length} topics complete (${pct}%)`}</p>

        <h3 class="section-title">Topics</h3>
        <table>
            <thead>
                <tr><th>Topic</th><th class="col-complete">Complete</th><th class="col-action"></th></tr>
            </thead>
            <tbody class="topics-body"></tbody>
        </table>
        <button class="btn btn-ghost btn-sm" data-action="add-topic">+ Add topic</button>

        <h3 class="section-title">Flashcards</h3>
        <div class="flashcard-container"></div>
        <button class="btn btn-ghost btn-sm" data-action="add-flashcard">+ Add flashcard</button>
    `;

    const topicsBody = panel.querySelector('.topics-body');
    if (subject.topics.length === 0) {
        topicsBody.innerHTML = `<tr class="empty-row"><td colspan="3">Add a topic to start tracking your progress.</td></tr>`;
    } else {
        subject.topics.forEach(topic => topicsBody.appendChild(buildTopicRow(subject, topic)));
    }

    const flashcardContainer = panel.querySelector('.flashcard-container');
    if (subject.flashcards.length === 0) {
        const hint = document.createElement('p');
        hint.className = 'empty-hint';
        hint.textContent = 'No flashcards yet — add one to start reviewing.';
        flashcardContainer.appendChild(hint);
    } else {
        subject.flashcards.forEach(card => flashcardContainer.appendChild(buildFlashcard(subject, card)));
    }

    panel.querySelector('[data-action="rename"]').addEventListener('click', () => openSubjectModal(subject.id));
    panel.querySelector('[data-action="delete-subject"]').addEventListener('click', () => confirmDeleteSubject(subject.id));
    panel.querySelector('[data-action="add-topic"]').addEventListener('click', () => addTopic(subject.id));
    panel.querySelector('[data-action="add-flashcard"]').addEventListener('click', () => openFlashcardModal(subject.id, null));

    return panel;
}

function buildTopicRow(subject, topic) {
    const row = document.createElement('tr');
    if (topic.complete) row.classList.add('complete');

    const textCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'topic-input';
    input.value = topic.text;
    input.placeholder = 'Enter topic';
    input.addEventListener('input', () => {
        topic.text = input.value;
        saveState();
    });
    textCell.appendChild(input);

    const checkCell = document.createElement('td');
    checkCell.className = 'col-complete';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = topic.complete;
    checkbox.setAttribute('aria-label', 'Mark topic complete');
    checkbox.addEventListener('change', () => {
        topic.complete = checkbox.checked;
        saveState();
        renderTabs();
        const summary = row.closest('.panel').querySelector('.progress-summary');
        const doneCount = subject.topics.filter(t => t.complete).length;
        const pct = subjectProgress(subject);
        summary.textContent = `${doneCount} of ${subject.topics.length} topics complete (${pct}%)`;
        row.classList.toggle('complete', checkbox.checked);
    });
    checkCell.appendChild(checkbox);

    const actionCell = document.createElement('td');
    actionCell.className = 'col-action';
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'Delete topic';
    delBtn.addEventListener('click', () => {
        subject.topics = subject.topics.filter(t => t.id !== topic.id);
        saveState();
        render();
    });
    actionCell.appendChild(delBtn);

    row.appendChild(textCell);
    row.appendChild(checkCell);
    row.appendChild(actionCell);
    return row;
}

function buildFlashcard(subject, card) {
    const el = document.createElement('div');
    el.className = 'flashcard';
    el.innerHTML = `
        <button class="icon-btn card-delete" title="Delete flashcard">✕</button>
        <h3></h3>
        <p></p>
    `;
    el.querySelector('h3').textContent = card.title || '(untitled)';
    el.querySelector('p').textContent = card.content || '';

    el.addEventListener('click', () => openFlashcardModal(subject.id, card.id));
    el.querySelector('.card-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        subject.flashcards = subject.flashcards.filter(f => f.id !== card.id);
        saveState();
        render();
    });
    return el;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ---------- Subject actions ---------- */

function addTopic(subjectId) {
    const subject = state.subjects[subjectId];
    subject.topics.push({ id: uid(), text: '', complete: false });
    saveState();
    render();
    const panel = document.querySelector(`.panel[data-subject-id="${subjectId}"] .topics-body`);
    const lastInput = panel && panel.querySelector('tr:last-child .topic-input');
    if (lastInput) lastInput.focus();
}

function confirmDeleteSubject(subjectId) {
    const subject = state.subjects[subjectId];
    openConfirmModal(
        `Delete "${subject.name}"?`,
        'This removes its topics and flashcards permanently.',
        () => {
            delete state.subjects[subjectId];
            state.order = state.order.filter(id => id !== subjectId);
            if (activeSubjectId === subjectId) activeSubjectId = state.order[0] || null;
            saveState();
            render();
            showToast('Subject deleted.');
        }
    );
}

/* ---------- Subject modal (add / rename) ---------- */

let subjectModalEditingId = null;

function openSubjectModal(subjectId) {
    subjectModalEditingId = subjectId;
    const modal = document.getElementById('subjectModal');
    const title = document.getElementById('subjectModalTitle');
    const input = document.getElementById('subjectNameInput');

    title.textContent = subjectId ? 'Rename subject' : 'Add subject';
    input.value = subjectId ? state.subjects[subjectId].name : '';
    modal.hidden = false;
    input.focus();
}

function closeSubjectModal() {
    document.getElementById('subjectModal').hidden = true;
    subjectModalEditingId = null;
}

function saveSubjectModal() {
    const input = document.getElementById('subjectNameInput');
    const name = input.value.trim();
    if (!name) {
        input.focus();
        return;
    }

    if (subjectModalEditingId) {
        state.subjects[subjectModalEditingId].name = name;
    } else {
        const id = uid();
        state.subjects[id] = { id, name, topics: [], flashcards: [] };
        state.order.push(id);
        activeSubjectId = id;
    }
    saveState();
    closeSubjectModal();
    render();
}

/* ---------- Flashcard modal (add / edit) ---------- */

let flashcardModalContext = { subjectId: null, cardId: null };

function openFlashcardModal(subjectId, cardId) {
    flashcardModalContext = { subjectId, cardId };
    const modal = document.getElementById('flashcardModal');
    const title = document.getElementById('flashcardModalTitle');
    const titleInput = document.getElementById('flashcardTitleInput');
    const contentInput = document.getElementById('flashcardContentInput');

    if (cardId) {
        const card = state.subjects[subjectId].flashcards.find(f => f.id === cardId);
        title.textContent = 'Edit flashcard';
        titleInput.value = card.title;
        contentInput.value = card.content;
    } else {
        title.textContent = 'Add flashcard';
        titleInput.value = '';
        contentInput.value = '';
    }
    modal.hidden = false;
    titleInput.focus();
}

function closeFlashcardModal() {
    document.getElementById('flashcardModal').hidden = true;
    flashcardModalContext = { subjectId: null, cardId: null };
}

function saveFlashcardModal() {
    const titleInput = document.getElementById('flashcardTitleInput');
    const contentInput = document.getElementById('flashcardContentInput');
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title && !content) { closeFlashcardModal(); return; }

    const { subjectId, cardId } = flashcardModalContext;
    const subject = state.subjects[subjectId];

    if (cardId) {
        const card = subject.flashcards.find(f => f.id === cardId);
        card.title = title;
        card.content = content;
    } else {
        subject.flashcards.push({ id: uid(), title, content });
    }
    saveState();
    closeFlashcardModal();
    render();
}

/* ---------- Confirm modal ---------- */

let confirmModalAction = null;

function openConfirmModal(title, body, onConfirm) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalBody').textContent = body;
    confirmModalAction = onConfirm;
    document.getElementById('confirmModal').hidden = false;
}

function closeConfirmModal() {
    document.getElementById('confirmModal').hidden = true;
    confirmModalAction = null;
}

/* ---------- Theme ---------- */

function applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.getElementById('themeLabel').textContent = theme.label;
}

function cycleTheme() {
    const currentIndex = THEMES.findIndex(t => t.id === state.theme);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    state.theme = next.id;
    applyTheme(next.id);
    saveState();
}

/* ---------- Toast ---------- */

let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
}

/* ---------- Export / Import ---------- */

function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-with-ease-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            if (!parsed || typeof parsed !== 'object' || !parsed.subjects || !Array.isArray(parsed.order)) {
                throw new Error('Unrecognized file format');
            }
            openConfirmModal(
                'Replace current data?',
                'Importing will overwrite everything currently in the app with the contents of this file.',
                () => {
                    state = parsed;
                    if (!state.theme) state.theme = 'paper';
                    activeSubjectId = state.order[0] || null;
                    applyTheme(state.theme);
                    saveState();
                    render();
                    showToast('Data imported.');
                }
            );
        } catch (e) {
            showToast("That file doesn't look like a Study With Ease backup.");
        }
    };
    reader.readAsText(file);
}

/* ---------- Wiring ---------- */

function init() {
    state = loadState();
    if (!state.theme) state.theme = 'paper';
    activeSubjectId = state.order[0] || null;
    applyTheme(state.theme);
    saveState();
    render();

    document.getElementById('warningProceed').addEventListener('click', () => {
        document.getElementById('warning').style.display = 'none';
    });

    document.getElementById('theme-btn').addEventListener('click', cycleTheme);
    document.getElementById('emptyAddBtn').addEventListener('click', () => openSubjectModal(null));

    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importData(file);
        e.target.value = '';
    });

    // Subject modal
    document.getElementById('subjectModalCancel').addEventListener('click', closeSubjectModal);
    document.getElementById('subjectModalSave').addEventListener('click', saveSubjectModal);
    document.getElementById('subjectNameInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveSubjectModal();
        if (e.key === 'Escape') closeSubjectModal();
    });
    document.getElementById('subjectModal').addEventListener('click', (e) => {
        if (e.target.id === 'subjectModal') closeSubjectModal();
    });

    // Flashcard modal
    document.getElementById('flashcardModalCancel').addEventListener('click', closeFlashcardModal);
    document.getElementById('flashcardModalSave').addEventListener('click', saveFlashcardModal);
    document.getElementById('flashcardModal').addEventListener('click', (e) => {
        if (e.target.id === 'flashcardModal') closeFlashcardModal();
    });

    // Confirm modal
    document.getElementById('confirmModalCancel').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmModalOk').addEventListener('click', () => {
        if (confirmModalAction) confirmModalAction();
        closeConfirmModal();
    });
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmModal') closeConfirmModal();
    });
}

document.addEventListener('DOMContentLoaded', init);
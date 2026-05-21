// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker Registered"))
        .catch(err => console.error("Service Worker Failed", err));
}

// Navigation Logic
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const headerTitle = document.getElementById('header-title');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-target');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        headerTitle.textContent = btn.getAttribute('data-title');

        if(targetId === 'view-history') {
            renderLogs();
        }
    });
});

// Data Management: Structured by Day Keys
let dailyLogs = JSON.parse(localStorage.getItem('dailyGroupedLogs')) || {};

function saveLog(type, data, editId = null, existingDateKey = null) {
    const now = new Date();
    
    // Assign to its original day if editing, otherwise assign to today
    const dateKey = existingDateKey || now.toLocaleDateString('en-US').replace(/\//g, '-'); 
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    if (!dailyLogs[dateKey]) {
        dailyLogs[dateKey] = [];
    }

    if (editId && editId !== "") {
        // Find existing item and modify it
        const itemIndex = dailyLogs[dateKey].findIndex(item => item.id === editId);
        if (itemIndex > -1) {
            dailyLogs[dateKey][itemIndex] = {
                ...dailyLogs[dateKey][itemIndex],
                ...data,
                editedAt: timeStr
            };
        }
    } else {
        // Create new item
        const entry = {
            id: Date.now().toString(),
            type: type,
            createdAt: timeStr,
            editedAt: null,
            ...data
        };
        dailyLogs[dateKey].push(entry);
    }

    localStorage.setItem('dailyGroupedLogs', JSON.stringify(dailyLogs));
    clearAllForms();
}

function clearAllForms() {
    document.getElementById('form-food').reset();
    document.getElementById('edit-id-food').value = '';
    document.getElementById('date-key-food').value = '';

    document.getElementById('form-meds').reset();
    document.getElementById('edit-id-meds').value = '';
    document.getElementById('date-key-meds').value = '';

    document.getElementById('form-notes').reset();
    document.getElementById('edit-id-notes').value = '';
    document.getElementById('date-key-notes').value = '';
}

// Form Submissions
document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-food').value;
    const dateKey = document.getElementById('date-key-food').value;
    saveLog('food', {
        name: document.getElementById('food-name').value,
        details: document.getElementById('food-details').value
    }, editId, dateKey);
    alert('Food logged!');
});

document.getElementById('form-meds').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-meds').value;
    const dateKey = document.getElementById('date-key-meds').value;
    saveLog('meds', {
        name: document.getElementById('med-name').value,
        dosage: document.getElementById('med-dosage').value
    }, editId, dateKey);
    alert('Medication logged!');
});

document.getElementById('form-notes').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-notes').value;
    const dateKey = document.getElementById('date-key-notes').value;
    saveLog('notes', {
        text: document.getElementById('note-text').value
    }, editId, dateKey);
    alert('Note saved!');
});

// Rendering Timeline Logs
const logContainer = document.getElementById('log-container');

function renderLogs() {
    logContainer.innerHTML = '';
    const dateKeys = Object.keys(dailyLogs).sort((a, b) => new Date(b.replace(/-/g, '/')) - new Date(a.replace(/-/g, '/')));

    if (dateKeys.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#7f8c8d; padding: 2rem;">No entries found.</p>';
        return;
    }

    dateKeys.forEach(dateKey => {
        const items = dailyLogs[dateKey];
        if (items.length === 0) return;

        // Group container
        const groupDiv = document.createElement('div');
        groupDiv.className = 'day-group-container';
        
        // Header block
        const headerDiv = document.createElement('div');
        headerDiv.className = 'day-header-toggle';
        headerDiv.textContent = dateKey.replace(/-/g, '/'); // Formats back to 11/10/2026
        headerDiv.addEventListener('click', () => {
            groupDiv.classList.toggle('collapsed');
        });

        // Expanded content workspace
        const contentDiv = document.createElement('div');
        contentDiv.className = 'day-content-area';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = `log-card ${item.type}`;

            let contentHTML = '';
            if (item.type === 'food') {
                contentHTML = `<div><div class="log-title">🍏 ${item.name}</div><div class="log-detail">${item.details || ''}</div></div>`;
            } else if (item.type === 'meds') {
                contentHTML = `<div><div class="log-title">💊 ${item.name}</div><div class="log-detail">${item.dosage}</div></div>`;
            } else if (item.type === 'notes') {
                contentHTML = `<div><div class="log-title">📝 Note</div><div class="log-detail">${item.text}</div></div>`;
            }

            const editTimestamp = item.editedAt ? `<span style="color: #e67e22; font-size:0.75rem; block-size:auto;"> (Edited: ${item.editedAt})</span>` : '';

            card.innerHTML = `
                <div style="flex:1;">
                    <div class="log-meta">Added: ${item.createdAt} ${editTimestamp}</div>
                    ${contentHTML}
                </div>
                <div style="display:flex; gap: 4px;">
                    <button class="delete-btn" style="background:#3498db;" onclick="editItem('${dateKey}', '${item.id}')">✏️</button>
                    <button class="delete-btn" onclick="deleteItem('${dateKey}', '${item.id}')">X</button>
                </div>
            `;
            contentDiv.appendChild(card);
        });

        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(contentDiv);
        logContainer.appendChild(groupDiv);
    });
}

// Global actions exposed safely to window scope
window.deleteItem = function(dateKey, id) {
    if(confirm('Delete this entry?')) {
        dailyLogs[dateKey] = dailyLogs[dateKey].filter(item => item.id !== id);
        if(dailyLogs[dateKey].length === 0) {
            delete dailyLogs[dateKey];
        }
        localStorage.setItem('dailyGroupedLogs', JSON.stringify(dailyLogs));
        renderLogs();
    }
}

window.editItem = function(dateKey, id) {
    const item = dailyLogs[dateKey].find(item => item.id === id);
    if(!item) return;

    if (item.type === 'food') {
        document.querySelector('[data-target="view-food"]').click();
        document.getElementById('edit-id-food').value = item.id;
        document.getElementById('date-key-food').value = dateKey;
        document.getElementById('food-name').value = item.name;
        document.getElementById('food-details').value = item.details || '';
    } else if (item.type === 'meds') {
        document.querySelector('[data-target="view-meds"]').click();
        document.getElementById('edit-id-meds').value = item.id;
        document.getElementById('date-key-meds').value = dateKey;
        document.getElementById('med-name').value = item.name;
        document.getElementById('med-dosage').value = item.dosage;
    } else if (item.type === 'notes') {
        document.querySelector('[data-target="view-notes"]').click();
        document.getElementById('edit-id-notes').value = item.id;
        document.getElementById('date-key-notes').value = dateKey;
        document.getElementById('note-text').value = item.text;
    }
}

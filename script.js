var themeList = ["default","dark", "blue", "pink"];
var currentTheme = 0;
var root = document.querySelector(':root');
function openTab(event, tabId) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => button.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}
function proceed(){
    var warningBox = document.querySelector("#warning");
    warningBox.style.display = "none";
}
function darkTheme(){
    root.style.setProperty('--color1', '#333');
    root.style.setProperty('--color2', '#f0f4f8');
    root.style.setProperty('--color3', '#000');
    root.style.setProperty('--color4', '#007bff');
    root.style.setProperty('--color5', '#0056b3');
    root.style.setProperty('--color6', '#090909');
    root.style.setProperty('--color7', 'black');
    root.style.setProperty('--color8', '#333');
    root.style.setProperty('--color9', '#aaa');
    root.style.setProperty('--colorA', '#c82333');
    root.style.setProperty('--colorB', '#dc3545');
    root.style.setProperty('--colorC', '#555');
}
function defaultTheme(){
    root.style.setProperty('--color1', '#f0f4f8');
    root.style.setProperty('--color2', '#333');
    root.style.setProperty('--color3', '#fff');
    root.style.setProperty('--color4', '#007bff');
    root.style.setProperty('--color5', '#0056b3');
    root.style.setProperty('--color6', '#f9f9f9');
    root.style.setProperty('--color7', 'white');
    root.style.setProperty('--color8', '#ccc');
    root.style.setProperty('--color9', '#555');
    root.style.setProperty('--colorA', '#c82333');
    root.style.setProperty('--colorB', '#dc3545');
    root.style.setProperty('--colorC', '#aaa');
}
function changeTheme(){
    if(currentTheme == 0){
        currentTheme = 1;
        darkTheme();
    }
    else if(currentTheme == 1){
        currentTheme = 0;
        defaultTheme();
    }
}
function saveToLocalStorage(subject) {
    const topics = [];
    const rows = document.getElementById(`topicTable${subject}`).querySelectorAll('tbody tr');
    rows.forEach(row => {
        const topic = row.querySelector('input[type="text"]').value;
        const isComplete = row.querySelector('input[type="checkbox"]').checked;
        topics.push({ topic, isComplete });
    });

    const flashcards = [];
    const flashcardElements = document.getElementById(`flashcardContainer${subject}`).querySelectorAll('.flashcard');
    flashcardElements.forEach(card => {
        const title = card.querySelector('h3').textContent;
        const content = card.querySelector('p').textContent;
        flashcards.push({ title, content });
    });

    const subjectData = {
        topics,
        flashcards,
    };

    localStorage.setItem(subject, JSON.stringify(subjectData));
}

function loadFromLocalStorage(subject) {
    const savedData = localStorage.getItem(subject);
    if (savedData) {
        const { topics, flashcards } = JSON.parse(savedData);

        const topicTable = document.getElementById(`topicTable${subject}`).getElementsByTagName('tbody')[0];
        topicTable.innerHTML = '';
        topics.forEach(({ topic, isComplete }) => {
            const newRow = topicTable.insertRow();
            newRow.innerHTML = `<td><input type="text" value="${topic}"></td><td><input type="checkbox" ${isComplete ? 'checked' : ''}></td><td><button onclick="deleteRow(this, '${subject}')">Delete</button></td>`;
        });

        const flashcardContainer = document.getElementById(`flashcardContainer${subject}`);
        flashcardContainer.innerHTML = '';
        flashcards.forEach(({ title, content }) => {
            const flashcard = document.createElement('div');
            flashcard.className = 'flashcard';
            flashcard.innerHTML = `<h3>${title}</h3><p>${content}</p><button onclick="deleteFlashcard(this, '${subject}')">Delete</button>`;
            flashcardContainer.appendChild(flashcard);
        });
    }
}

function addTopic(tableId) {
    const table = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    newRow.innerHTML = `<td><input type="text" placeholder="Enter topic"></td><td><input type="checkbox"></td><td><button onclick="deleteRow(this, '${tableId.replace('topicTable', '')}')">Delete</button></td>`;
    saveToLocalStorage(tableId.replace('topicTable', ''));
}

function addFlashcard(containerId) {
    const container = document.getElementById(containerId);
    const flashcard = document.createElement('div');
    flashcard.className = 'flashcard';

    const title = prompt("Enter the title of the flashcard:");
    const content = prompt("Enter the content of the flashcard:");

    flashcard.innerHTML = `<h3>${title}</h3><p>${content}</p><button onclick="deleteFlashcard(this, '${containerId.replace('flashcardContainer', '')}')">Delete</button>`;
    container.appendChild(flashcard);
    saveToLocalStorage(containerId.replace('flashcardContainer', ''));
}

function deleteRow(button, subject) {
    const row = button.closest('tr');
    row.remove();
    saveToLocalStorage(subject);
}

function deleteFlashcard(button, subject) {
    const flashcard = button.closest('.flashcard');
    flashcard.remove();
    saveToLocalStorage(subject);
}

function addSubject() {
    const subjectName = document.getElementById('newSubjectName').value.trim();
    if (subjectName === '') {
        alert("Subject name cannot be empty!");
        return;
    }

    const tabsContainer = document.querySelector('.tabs');
    const newTabButton = document.createElement('button');
    newTabButton.className = 'tab-button';
    newTabButton.textContent = subjectName;
    newTabButton.onclick = function(event) { openTab(event, subjectName); };

    tabsContainer.insertBefore(newTabButton, document.querySelector('.tab-button:last-child'));

    const newTabContent = document.createElement('div');
    newTabContent.id = subjectName;
    newTabContent.className = 'tab-content';
    newTabContent.innerHTML = `
        <h2>Topics</h2>
        <table id="topicTable${subjectName}">
            <thead>
                <tr>
                    <th>Topic</th>
                    <th>Complete</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
        <button onclick="addTopic('topicTable${subjectName}')">Add Topic</button>
        <h2>Important Notes</h2>
        <div id="flashcardContainer${subjectName}" class="flashcard-container">
        </div>
        <button onclick="addFlashcard('flashcardContainer${subjectName}')">Add Flashcard</button>
        <button onclick="deleteSubject('${subjectName}')">Delete Subject</button>
    `;

    document.querySelector('.container').appendChild(newTabContent);
    openTab({currentTarget: newTabButton}, subjectName);
    saveToLocalStorage(subjectName);
}

function deleteSubject(subjectName) {
    if (confirm(`Are you sure you want to delete the subject "${subjectName}"? This action cannot be undone.`)) {
        localStorage.removeItem(subjectName);
        document.getElementById(subjectName).remove();
        document.querySelector(`.tabs .tab-button:contains("${subjectName}")`).remove();

        // Automatically open the first tab if any subjects remain
        const remainingSubjects = document.querySelectorAll('.tab-button');
        if (remainingSubjects.length > 0) {
            openTab({currentTarget: remainingSubjects[0]}, remainingSubjects[0].textContent);
        }
    }
}

function loadSubjects() {
    for (let i = 0; i < localStorage.length; i++) {
        const subject = localStorage.key(i);

        const tabsContainer = document.querySelector('.tabs');
        const newTabButton = document.createElement('button');
        newTabButton.className = 'tab-button';
        newTabButton.textContent = subject;
        newTabButton.onclick = function(event) { openTab(event, subject); };

        tabsContainer.insertBefore(newTabButton, document.querySelector('.tab-button:last-child'));

        const newTabContent = document.createElement('div');
        newTabContent.id = subject;
        newTabContent.className = 'tab-content';
        newTabContent.innerHTML = `
            <h2>Topics</h2>
            <table id="topicTable${subject}">
                <thead>
                    <tr>
                        <th>Topic</th>
                        <th>Complete</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
            <button onclick="addTopic('topicTable${subject}')">Add Topic</button>
            <h2>Important Notes</h2>
            <div id="flashcardContainer${subject}" class="flashcard-container">
            </div>
            <button onclick="addFlashcard('flashcardContainer${subject}')">Add Flashcard</button>
            <button onclick="deleteSubject('${subject}')">Delete Subject</button>
        `;

        document.querySelector('.container').appendChild(newTabContent);
        loadFromLocalStorage(subject);
    }

    if (localStorage.length > 0) {
        openTab({currentTarget: document.querySelector('.tab-button:first-child')}, localStorage.key(0));
    }
}

document.addEventListener('DOMContentLoaded', loadSubjects);

const firebaseConfig = {
  projectId: "todo-app-stitch-rv2026",
  appId: "1:111744742433:web:823efa7b1483cc6a681f60",
  storageBucket: "todo-app-stitch-rv2026.firebasestorage.app",
  apiKey: "AIzaSyDhxzGrY3IABvGxFWluaiHmog2OKrr5lG0",
  authDomain: "todo-app-stitch-rv2026.firebaseapp.com",
  messagingSenderId: "111744742433"
};

const { initializeApp, getAuth, signInAnonymously, onAuthStateChanged, getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc, serverTimestamp } = window.firebaseApp;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const taskList = document.getElementById('task-list');
const loading = document.getElementById('loading');
const fab = document.getElementById('fab');
const modal = document.getElementById('add-task-modal');
const cancelBtn = document.getElementById('cancel-btn');
const addTaskForm = document.getElementById('add-task-form');
const taskInput = document.getElementById('task-input');

let currentUser = null;
let unsubscribeSnapshot = null;

// Auth
signInAnonymously(auth).catch(error => {
    console.error("Auth error:", error);
    loading.textContent = "Failed to authenticate.";
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadTasks();
    } else {
        currentUser = null;
        if (unsubscribeSnapshot) unsubscribeSnapshot();
    }
});

// Load Tasks
function loadTasks() {
    const tasksRef = collection(db, "users", currentUser.uid, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "desc"));
    
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        loading.style.display = 'none';
        taskList.innerHTML = '';
        
        if (snapshot.empty) {
            taskList.innerHTML = '<li class="loading">No tasks yet. Add one!</li>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const task = docSnap.data();
            const id = docSnap.id;
            
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <button class="delete-btn" aria-label="Delete">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            
            // Checkbox event
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => toggleTask(id, checkbox.checked));
            
            // Delete event
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTask(id));
            
            taskList.appendChild(li);
        });
    }, (error) => {
        console.error("Firestore error:", error);
        loading.textContent = "Error loading tasks.";
        loading.style.display = 'block';
    });
}

// Add Task
async function addTask(text) {
    if (!currentUser) return;
    try {
        const tasksRef = collection(db, "users", currentUser.uid, "tasks");
        await addDoc(tasksRef, {
            text: text,
            completed: false,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error adding doc:", e);
    }
}

// Toggle Task
async function toggleTask(id, completed) {
    if (!currentUser) return;
    const taskRef = doc(db, "users", currentUser.uid, "tasks", id);
    try {
        await updateDoc(taskRef, { completed });
    } catch (e) {
        console.error("Error updating doc:", e);
    }
}

// Delete Task
async function deleteTask(id) {
    if (!currentUser) return;
    const taskRef = doc(db, "users", currentUser.uid, "tasks", id);
    try {
        await deleteDoc(taskRef);
    } catch (e) {
        console.error("Error deleting doc:", e);
    }
}

// UI Events
fab.addEventListener('click', () => {
    modal.classList.remove('hidden');
    taskInput.focus();
});

cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    addTaskForm.reset();
});

// Close modal on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        addTaskForm.reset();
    }
});

addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (text) {
        await addTask(text);
        modal.classList.add('hidden');
        addTaskForm.reset();
    }
});

// Utility
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Quizmaster dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check if logged in
    const checkResponse = await fetch('/api/auth/check');
    const checkData = await checkResponse.json();
    
    if (!checkData.logged_in) {
        window.location.href = '/quizmaster/login';
        return;
    }

    // Display user info
    if (checkData.username) {
        const userInfoDiv = document.getElementById('user-info');
        userInfoDiv.innerHTML = `<p style="color: white; text-align: right; margin-bottom: 1rem;">Logged in as: <strong>${checkData.username}</strong></p>`;
    }

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Load running quizzes
    await loadRunningQuizzes();
    
    // Load quizzes
    await loadQuizzes();

    // Create quiz button
    document.getElementById('create-quiz-btn').addEventListener('click', () => {
        window.location.href = '/quizmaster/create';
    });

    // Upload quiz button
    document.getElementById('upload-quiz-btn').addEventListener('click', () => {
        document.getElementById('upload-file').click();
    });

    document.getElementById('upload-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/quiz/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                alert('Quiz uploaded successfully!');
                await loadQuizzes();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error uploading quiz');
        }
    });

    // Create user button
    document.getElementById('create-user-btn').addEventListener('click', () => {
        const username = prompt('Enter username:');
        const password = prompt('Enter password:');
        
        if (username && password) {
            createUser(username, password);
        }
    });

    // Load users
    await loadUsers();
    await loadAccountRequests();

    // Media upload button
    document.getElementById('upload-media-btn').addEventListener('click', () => {
        document.getElementById('upload-media-file').click();
    });

    document.getElementById('upload-media-file').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('public', 'false');

            try {
                const response = await fetch('/api/media/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) {
                    alert(`Error uploading ${file.name}: ${data.error}`);
                }
            } catch (error) {
                alert(`Error uploading ${file.name}`);
            }
        }

        // Reset file input
        e.target.value = '';
        await loadMedia();
    });

    // Load media when media tab is clicked
    document.querySelector('[data-tab="media"]').addEventListener('click', async () => {
        await loadMedia();
    });
    
    // Load running quizzes when running tab is clicked
    document.querySelector('[data-tab="running"]').addEventListener('click', async () => {
        await loadRunningQuizzes();
    });
    
    // Auto-refresh running quizzes every 5 seconds
    setInterval(async () => {
        const runningTab = document.getElementById('running-tab');
        if (runningTab && runningTab.classList.contains('active')) {
            await loadRunningQuizzes();
        }
    }, 5000);
});

async function loadRunningQuizzes() {
    try {
        const response = await fetch('/api/quiz/running');
        const data = await response.json();
        
        const listDiv = document.getElementById('running-quizzes-list');
        listDiv.innerHTML = '';
        
        if (!data.running_quizzes || data.running_quizzes.length === 0) {
            listDiv.innerHTML = '<p>No running quizzes. Start a quiz to see it here!</p>';
            return;
        }
        
        data.running_quizzes.forEach(quiz => {
            const item = document.createElement('div');
            item.className = 'list-item';
            
            // Calculate time running
            const createdTime = new Date(quiz.created_at * 1000);
            const now = new Date();
            const runningTime = Math.floor((now - createdTime) / 1000); // seconds
            const hours = Math.floor(runningTime / 3600);
            const minutes = Math.floor((runningTime % 3600) / 60);
            const seconds = runningTime % 60;
            let timeString = '';
            if (hours > 0) {
                timeString = `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                timeString = `${minutes}m ${seconds}s`;
            } else {
                timeString = `${seconds}s`;
            }
            
            item.innerHTML = `
                <div style="flex: 1;">
                    <strong>${quiz.quiz_name}</strong>
                    <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
                        Room Code: <strong style="color: #4CAF50; font-size: 1.1em;">${quiz.code}</strong> | 
                        Running for: ${timeString} | 
                        Page: ${quiz.current_page + 1} | 
                        Participants: ${quiz.participant_count}
                    </div>
                </div>
                <div class="list-item-actions" style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="btn btn-small btn-primary" onclick="goToQuiz('${quiz.code}')">Go to Quiz</button>
                    <button class="btn btn-small btn-danger" onclick="endRunningQuiz('${quiz.code}', '${quiz.quiz_name}')">End Quiz</button>
                </div>
            `;
            listDiv.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading running quizzes:', error);
        const listDiv = document.getElementById('running-quizzes-list');
        listDiv.innerHTML = '<p>Error loading running quizzes. Please refresh the page.</p>';
    }
}

async function goToQuiz(roomCode) {
    // Open display page in new tab and navigate to control page
    window.open(`/display/${roomCode}`, '_blank');
    window.location.href = `/control/${roomCode}`;
}

async function endRunningQuiz(roomCode, quizName) {
    if (!confirm(`Are you sure you want to end "${quizName}" (Room: ${roomCode})?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/end/${roomCode}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Quiz ended successfully');
            await loadRunningQuizzes();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error ending quiz');
        console.error('Error ending quiz:', error);
    }
}

async function loadQuizzes() {
    try {
        const response = await fetch('/api/quiz/list');
        const data = await response.json();
        
        const listDiv = document.getElementById('quizes-list');
        listDiv.innerHTML = '';

        if (data.quizes.length === 0) {
            listDiv.innerHTML = '<p>No quizzes yet. Create one to get started!</p>';
            return;
        }

        // Get current user info
        const checkResponse = await fetch('/api/auth/check');
        const checkData = await checkResponse.json();
        const currentUsername = checkData.username;

        // Separate quizzes into my quizzes and public quizzes from others
        const myQuizzes = [];
        const publicQuizzes = [];

        data.quizes.forEach(quiz => {
            const isOwner = quiz.creator === currentUsername;
            if (isOwner) {
                myQuizzes.push(quiz);
            } else if (quiz.public) {
                publicQuizzes.push(quiz);
            }
        });

        // Display My Quizzes section
        if (myQuizzes.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'My Quizzes';
            heading.style.marginTop = '0';
            heading.style.marginBottom = '1rem';
            listDiv.appendChild(heading);

            myQuizzes.forEach(quiz => {
                const item = document.createElement('div');
                item.className = 'list-item';
                const isOwner = quiz.creator === currentUsername;
                
                item.innerHTML = `
                    <div style="flex: 1;">
                        <strong>${quiz.name}</strong>
                        <div style="color: #666; font-size: 0.9rem;">
                            ${quiz.pages_count} pages
                            ${quiz.creator ? ` | Created by: ${quiz.creator}` : ''}
                            ${quiz.public ? ' | <span style="color: green;">Public</span>' : ' | <span style="color: #666;">Private</span>'}
                        </div>
                    </div>
                    <div class="list-item-actions" style="display: flex; align-items: center; gap: 0.5rem;">
                        ${isOwner ? `<label style="display: flex; align-items: center; cursor: pointer; margin-right: 0.5rem;">
                            <input type="checkbox" ${quiz.public ? 'checked' : ''} 
                                   onchange="toggleQuizPublic('${quiz.name}', this.checked)"
                                   style="margin-right: 0.5rem;">
                            <span>Public</span>
                        </label>` : ''}
                        <button class="btn btn-small" onclick="editQuiz('${quiz.name}')">Edit</button>
                        <button class="btn btn-small" onclick="startQuiz('${quiz.name}')">Start</button>
                        <button class="btn btn-small" onclick="downloadQuiz('${quiz.name}')">Download</button>
                        ${isOwner ? `<button class="btn btn-small btn-danger" onclick="deleteQuiz('${quiz.name}')">Delete</button>` : ''}
                    </div>
                `;
                listDiv.appendChild(item);
            });
        }

        // Display Public Quizzes section
        if (publicQuizzes.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'Public Quizzes';
            heading.style.marginTop = myQuizzes.length > 0 ? '2rem' : '0';
            heading.style.marginBottom = '1rem';
            listDiv.appendChild(heading);

            publicQuizzes.forEach(quiz => {
                const item = document.createElement('div');
                item.className = 'list-item';
                const isOwner = quiz.creator === currentUsername;
                
                item.innerHTML = `
                    <div style="flex: 1;">
                        <strong>${quiz.name}</strong>
                        <div style="color: #666; font-size: 0.9rem;">
                            ${quiz.pages_count} pages
                            ${quiz.creator ? ` | Created by: ${quiz.creator}` : ''}
                            ${quiz.public ? ' | <span style="color: green;">Public</span>' : ' | <span style="color: #666;">Private</span>'}
                        </div>
                    </div>
                    <div class="list-item-actions" style="display: flex; align-items: center; gap: 0.5rem;">
                        ${isOwner ? `<label style="display: flex; align-items: center; cursor: pointer; margin-right: 0.5rem;">
                            <input type="checkbox" ${quiz.public ? 'checked' : ''} 
                                   onchange="toggleQuizPublic('${quiz.name}', this.checked)"
                                   style="margin-right: 0.5rem;">
                            <span>Public</span>
                        </label>` : ''}
                        <button class="btn btn-small" onclick="editQuiz('${quiz.name}')">Edit</button>
                        <button class="btn btn-small" onclick="startQuiz('${quiz.name}')">Start</button>
                        <button class="btn btn-small" onclick="downloadQuiz('${quiz.name}')">Download</button>
                        ${isOwner ? `<button class="btn btn-small btn-danger" onclick="deleteQuiz('${quiz.name}')">Delete</button>` : ''}
                    </div>
                `;
                listDiv.appendChild(item);
            });
        }

        // If no quizzes in either section, show message
        if (myQuizzes.length === 0 && publicQuizzes.length === 0) {
            listDiv.innerHTML = '<p>No quizzes yet. Create one to get started!</p>';
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

async function editQuiz(name) {
    window.location.href = `/quizmaster/create?quiz=${encodeURIComponent(name)}`;
}

async function startQuiz(name) {
    // Connect to WebSocket and start quiz
    const socket = io();
    
    socket.on('connect', () => {
        socket.emit('quizmaster_start_quiz', { quiz_name: name });
    });
    
    socket.on('quiz_started', (data) => {
        // Open display, control, and redirect to control page
        window.open(`/display/${data.room_code}`, '_blank');
        window.location.href = `/control/${data.room_code}`;
    });
    
    socket.on('error', (data) => {
        alert('Error: ' + data.message);
    });
}

async function downloadQuiz(name) {
    window.location.href = `/api/quiz/download/${encodeURIComponent(name)}`;
}

async function deleteQuiz(name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const response = await fetch(`/api/quiz/delete/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (response.ok) {
            alert('Quiz deleted');
            await loadQuizzes();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error deleting quiz');
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/auth/quizmasters');
        const data = await response.json();
        
        const listDiv = document.getElementById('users-list');
        listDiv.innerHTML = '<h3>All Quizmasters</h3>';

        if (data.quizmasters.length === 0) {
            listDiv.innerHTML += '<p>No quizmasters yet.</p>';
            return;
        }

        data.quizmasters.forEach(quizmaster => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div>
                    <strong>${quizmaster.username}</strong>
                    <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">
                        Quizzes Created: ${quizmaster.quizzes_created} | 
                        Quizzes Run: ${quizmaster.quizzes_run}
                    </div>
                </div>
            `;
            listDiv.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadAccountRequests() {
    try {
        const response = await fetch('/api/auth/requests');
        const data = await response.json();
        
        const requestsDiv = document.getElementById('account-requests');
        requestsDiv.innerHTML = '<h3>Account Requests</h3>';

        if (data.requests.length === 0) {
            requestsDiv.innerHTML += '<p>No pending requests</p>';
            return;
        }

        data.requests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div>
                    <strong>${req.username}</strong>
                    <div style="color: #666; font-size: 0.9rem;">Requested: ${new Date(req.created_at).toLocaleString()}</div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-small btn-primary" onclick="approveRequest('${req.id}')">Approve</button>
                    <button class="btn btn-small btn-danger" onclick="rejectRequest('${req.id}')">Reject</button>
                </div>
            `;
            requestsDiv.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

async function approveRequest(requestId) {
    try {
        const response = await fetch('/api/auth/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Request approved');
            await loadAccountRequests();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error approving request');
    }
}

async function rejectRequest(requestId) {
    try {
        const response = await fetch('/api/auth/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Request rejected');
            await loadAccountRequests();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error rejecting request');
    }
}

async function createUser(username, password) {
    try {
        const response = await fetch('/api/auth/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            alert('User created successfully');
            await loadUsers();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error creating user');
    }
}

async function toggleQuizPublic(quizName, isPublic) {
    try {
        const response = await fetch(`/api/quiz/toggle-public/${encodeURIComponent(quizName)}`, {
            method: 'POST'
        });

        const data = await response.json();
        if (response.ok) {
            await loadQuizzes();
        } else {
            alert('Error: ' + data.error);
            await loadQuizzes(); // Reload to reset checkbox
        }
    } catch (error) {
        alert('Error toggling public status');
        await loadQuizzes(); // Reload to reset checkbox
    }
}

async function loadMedia() {
    try {
        const response = await fetch('/api/media/list');
        const data = await response.json();
        
        const listDiv = document.getElementById('media-list');
        listDiv.innerHTML = '';

        if (data.files.length === 0) {
            listDiv.innerHTML = '<p>No media files yet. Upload some to get started!</p>';
            return;
        }

        // Get current user info
        const checkResponse = await fetch('/api/auth/check');
        const checkData = await checkResponse.json();
        const currentUsername = checkData.username;

        data.files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const isOwner = file.creator === currentUsername;
            const fileSize = formatFileSize(file.size);
            const fileType = getFileType(file.filename);
            
            item.innerHTML = `
                <div style="flex: 1;">
                    <strong>${file.original_name}</strong>
                    <div style="color: #666; font-size: 0.9rem;">
                        ${fileType} | ${fileSize}
                        ${file.creator ? ` | Created by: ${file.creator}` : ''}
                        ${file.public ? ' | <span style="color: green;">Public</span>' : ' | <span style="color: #666;">Private</span>'}
                    </div>
                </div>
                <div class="list-item-actions" style="display: flex; align-items: center; gap: 0.5rem;">
                    ${isOwner ? `<label style="display: flex; align-items: center; cursor: pointer; margin-right: 0.5rem;">
                        <input type="checkbox" ${file.public ? 'checked' : ''} 
                               onchange="toggleMediaPublic('${file.filename}', this.checked)"
                               style="margin-right: 0.5rem;">
                        <span>Public</span>
                    </label>` : ''}
                    <button class="btn btn-small" onclick="downloadMedia('${file.filename}')">Download</button>
                    ${isOwner ? `<button class="btn btn-small btn-danger" onclick="deleteMedia('${file.filename}')">Delete</button>` : ''}
                </div>
            `;
            listDiv.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading media:', error);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'Image';
    if (['mp4', 'webm'].includes(ext)) return 'Video';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return 'Audio';
    if (ext === 'pdf') return 'PDF';
    return 'File';
}

async function downloadMedia(filename) {
    window.location.href = `/api/media/download/${encodeURIComponent(filename)}`;
}

async function deleteMedia(filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
        const response = await fetch(`/api/media/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (response.ok) {
            alert('File deleted');
            await loadMedia();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error deleting file');
    }
}

async function toggleMediaPublic(filename, isPublic) {
    try {
        const response = await fetch(`/api/media/toggle-public/${encodeURIComponent(filename)}`, {
            method: 'POST'
        });

        const data = await response.json();
        if (response.ok) {
            await loadMedia();
        } else {
            alert('Error: ' + data.error);
            await loadMedia(); // Reload to reset checkbox
        }
    } catch (error) {
        alert('Error toggling public status');
        await loadMedia(); // Reload to reset checkbox
    }
}


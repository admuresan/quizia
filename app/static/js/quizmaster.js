// Quizmaster dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check if logged in
    const checkResponse = await fetch('/api/auth/check');
    const checkData = await checkResponse.json();
    
    if (!checkData.logged_in) {
        try {
            const input = '/quizmaster/login';
            const appSlug = window.__APP_MANAGER_APP_SLUG || '';
            const expected = appSlug ? (appSlug + input) : input;
            console.log('[BG TRACE][quizia] redirect.not_logged_in', { input, expected, actual: input, appSlug });
        } catch (e) {}
        window.location.href = '/quizmaster/login';
        return;
    }

    // Display user info
    if (checkData.username) {
        const userInfoDiv = document.getElementById('user-info');
        userInfoDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div></div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <p style="color: white; margin: 0;">Logged in as: <strong>${checkData.username}</strong></p>
                    <button id="logout-btn" class="btn btn-small" style="background-color: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Logout</button>
                </div>
            </div>
        `;
        
        // Add logout button handler
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    try {
                        const input = '/quizmaster/login';
                        const appSlug = window.__APP_MANAGER_APP_SLUG || '';
                        const expected = appSlug ? (appSlug + input) : input;
                        console.log('[BG TRACE][quizia] redirect.logout', { input, expected, actual: input, appSlug });
                    } catch (e) {}
                    window.location.href = '/quizmaster/login';
                } else {
                    alert('Error logging out. Please try again.');
                }
            } catch (error) {
                console.error('Error logging out:', error);
                alert('Error logging out. Please try again.');
            }
        });
    }

    // Check if running on server and show warning
    try {
        const localhostCheck = await fetch('/api/quiz/check-localhost');
        const localhostData = await localhostCheck.json();
        const isLocalhost = localhostData.is_localhost;
        
        const warningDiv = document.getElementById('server-warning');
        if (warningDiv) {
            // Show warning only if NOT on localhost (i.e., on server)
            if (!isLocalhost) {
                warningDiv.style.display = 'block';
            }
        }
    } catch (error) {
        // If check fails, assume server and show warning for safety
        const warningDiv = document.getElementById('server-warning');
        if (warningDiv) {
            warningDiv.style.display = 'block';
        }
    }

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Restore saved tab on page load
    const savedTab = localStorage.getItem('quizmaster_active_tab');
    if (savedTab) {
        const savedTabBtn = document.querySelector(`[data-tab="${savedTab}"]`);
        const savedTabContent = document.getElementById(`${savedTab}-tab`);
        if (savedTabBtn && savedTabContent) {
            // Remove active from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            // Set active on saved tab
            savedTabBtn.classList.add('active');
            savedTabContent.classList.add('active');
        }
    }
    
    // Function to load data for a specific tab
    async function loadTabData(tab) {
        switch(tab) {
            case 'running':
                await loadRunningQuizzes();
                break;
            case 'quizes':
                await loadQuizzes();
                break;
            case 'media':
                await loadMedia();
                break;
            case 'users':
                await loadUsers();
                await loadAccountRequests();
                break;
        }
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
            // Save active tab to localStorage
            localStorage.setItem('quizmaster_active_tab', tab);
            // Reload data for the active tab
            await loadTabData(tab);
        });
    });
    
    // Load data for the initial active tab
    const initialTab = savedTab || 'quizes';
    await loadTabData(initialTab);

    // Initial data loading handled by loadTabData after tab restoration

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

    // User data loading handled by loadTabData when users tab is clicked

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

    // Media subtab switching
    const mediaSubtabBtns = document.querySelectorAll('.media-subtab-btn');
    mediaSubtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mediaSubtabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadMedia();
        });
    });

    // Media search filter
    const mediaSearchFilter = document.getElementById('media-search-filter');
    if (mediaSearchFilter) {
        mediaSearchFilter.addEventListener('input', () => {
            filterMediaList();
        });
    }

    // Tab data loading is now handled in the main tab click handler above
    
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
                    <label style="display: flex; align-items: center; cursor: pointer; margin-right: 0.5rem;">
                        <input type="checkbox" ${quiz.public ? 'checked' : ''} 
                               onchange="toggleRunningQuizPublic('${quiz.code}', this.checked)"
                               style="margin-right: 0.5rem;">
                        <span>Publish</span>
                    </label>
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

async function toggleRunningQuizPublic(roomCode, isPublic) {
    try {
        const response = await fetch(`/api/quiz/running/toggle-public/${roomCode}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (response.ok) {
            // Optionally reload to ensure UI is in sync
            // await loadRunningQuizzes();
        } else {
            alert('Error: ' + data.error);
            // Reload to reset checkbox on error
            await loadRunningQuizzes();
        }
    } catch (error) {
        alert('Error toggling publish status');
        console.error('Error toggling publish status:', error);
        // Reload to reset checkbox on error
        await loadRunningQuizzes();
    }
}

async function loadQuizzes() {
    /**
     * Load quizzes from the backend.
     * IMPORTANT: Each quiz object includes an 'id' field which MUST be used for all
     * operations (start, edit, delete, etc.). Never use quiz.name for lookups as
     * multiple quizzes can have the same name.
     */
    try {
        const response = await fetch('/api/quiz/list');
        const data = await response.json();
        
        const listDiv = document.getElementById('quizes-list');
        listDiv.innerHTML = '';

        if (data.quizes.length === 0) {
            listDiv.innerHTML = '<p>No quizzes yet. Create one to get started!</p>';
            return;
        }

        // Check if running on localhost
        const localhostCheck = await fetch('/api/quiz/check-localhost');
        const localhostData = await localhostCheck.json();
        const isLocalhost = localhostData.is_localhost;

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
                                   onchange="toggleQuizPublic('${quiz.id}', this.checked)"
                                   style="margin-right: 0.5rem;">
                            <span>Public</span>
                        </label>` : ''}
                        <button class="btn btn-small" onclick="editQuiz('${quiz.id}')">Edit</button>
                        <button class="btn btn-small" onclick="startQuiz('${quiz.id}')">Start</button>
                        <button class="btn btn-small" onclick="downloadQuiz('${quiz.id}')">Download</button>
                        ${isOwner && isLocalhost ? `<button class="btn btn-small" style="background-color: #17a2b8; color: white;" onclick="showMigrateModal('${quiz.id}', '${quiz.name.replace(/'/g, "\\'")}')">Migrate</button>` : ''}
                        ${isOwner ? `<button class="btn btn-small btn-danger" onclick="deleteQuiz('${quiz.id}')">Delete</button>` : ''}
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
                        <button class="btn btn-small" onclick="copyQuiz('${quiz.id}')">Copy</button>
                        <button class="btn btn-small" onclick="startQuiz('${quiz.id}')">Start</button>
                        <button class="btn btn-small" onclick="downloadQuiz('${quiz.id}')">Download</button>
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

async function editQuiz(quizId) {
    window.location.href = `/quizmaster/create?quiz=${encodeURIComponent(quizId)}`;
}

async function startQuiz(quizId) {
    /**
     * Start a quiz session.
     * @param {string} quizId - The unique quiz ID (from quiz.id field, NOT quiz.name)
     *                          Multiple quizzes can have the same name, so ID is required.
     */
    console.log('[Start Quiz] Starting quiz with ID:', quizId);
    
    // Connect to WebSocket and start quiz
    const socket = io({ transports: ['polling', 'websocket'], upgrade: true, reconnection: true });
    
    let quizStarted = false;
    let responseReceived = false;
    
    // Function to emit the start quiz event
    const emitStartQuiz = () => {
        if (!quizStarted && socket.connected) {
            console.log('[Start Quiz] Emitting quizmaster_start_quiz with quiz_id:', quizId);
            socket.emit('quizmaster_start_quiz', { quiz_id: quizId });
            quizStarted = true;
        }
    };
    
    // Set up all event listeners first
    socket.on('connect', () => {
        console.log('[Start Quiz] Socket connected');
        emitStartQuiz();
    });
    
    socket.on('quiz_started', (data) => {
        console.log('[Start Quiz] Quiz started with room_code:', data.room_code);
        responseReceived = true;
        
        // Open display page in new tab
        window.open(`/display/${data.room_code}`, '_blank');
        
        // Open control page in new window
        window.open(`/control/${data.room_code}`, '_blank', 'width=1400,height=900');
        
        // Clean up socket
        socket.disconnect();
    });
    
    socket.on('error', (data) => {
        console.error('[Start Quiz] Error:', data.message);
        responseReceived = true;
        alert('Error: ' + data.message);
        socket.disconnect();
    });
    
    socket.on('connect_error', (error) => {
        console.error('[Start Quiz] Connection error:', error);
        responseReceived = true;
        alert('Failed to connect to server. Please try again.');
        socket.disconnect();
    });
    
    // Check if already connected (after setting up listeners to avoid race condition)
    // Use setTimeout to ensure listeners are registered first
    setTimeout(() => {
        if (socket.connected && !quizStarted) {
            console.log('[Start Quiz] Socket already connected, emitting immediately');
            emitStartQuiz();
        }
    }, 0);
    
    // Clean up socket after a timeout if no response
    setTimeout(() => {
        if (!responseReceived) {
            console.warn('[Start Quiz] Timeout waiting for response');
            alert('No response from server. Please check your connection and try again.');
            socket.disconnect();
        }
    }, 10000);
}

async function downloadQuiz(quizId) {
    window.location.href = `/api/quiz/download/${encodeURIComponent(quizId)}`;
}

async function deleteQuiz(quizId) {
    // Get quiz name for confirmation
    try {
        const response = await fetch(`/api/quiz/load/${encodeURIComponent(quizId)}`);
        const data = await response.json();
        const quizName = data.quiz ? data.quiz.name : 'this quiz';
        
        if (!confirm(`Are you sure you want to delete "${quizName}"?`)) return;

        const deleteResponse = await fetch(`/api/quiz/delete/${encodeURIComponent(quizId)}`, {
            method: 'DELETE'
        });

        const deleteData = await deleteResponse.json();
        if (deleteResponse.ok) {
            alert('Quiz deleted');
            await loadQuizzes();
        } else {
            alert('Error: ' + deleteData.error);
        }
    } catch (error) {
        alert('Error deleting quiz');
    }
}

async function copyQuiz(quizId) {
    try {
        const response = await fetch(`/api/quiz/copy/${encodeURIComponent(quizId)}`, {
            method: 'POST'
        });

        const data = await response.json();
        if (response.ok) {
            alert(`Quiz "${data.name}" copied successfully! You can now edit it in My Quizzes.`);
            await loadQuizzes();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error copying quiz');
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

async function toggleQuizPublic(quizId, isPublic) {
    try {
        const response = await fetch(`/api/quiz/toggle-public/${encodeURIComponent(quizId)}`, {
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

// Store current media data for filtering
let currentMediaData = {
    myMedia: [],
    publicMedia: [],
    currentUsername: '',
    mediaType: 'images'
};

async function loadMedia(preserveScroll = false) {
    try {
        // Save scroll position if we want to preserve it
        const mediaTab = document.getElementById('media-tab');
        let scrollPosition = 0;
        if (preserveScroll && mediaTab) {
            scrollPosition = window.scrollY || document.documentElement.scrollTop;
        }
        
        const response = await fetch('/api/media/list');
        const data = await response.json();
        
        const listDiv = document.getElementById('media-list');
        listDiv.innerHTML = '';

        // Get current active media type subtab
        const activeSubtab = document.querySelector('.media-subtab-btn.active');
        const mediaType = activeSubtab ? activeSubtab.dataset.mediaType : 'images';
        currentMediaData.mediaType = mediaType;
        
        // Define file type mappings
        const fileTypes = {
            images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            audio: ['mp3', 'wav', 'ogg'],
            video: ['mp4', 'webm']
        };

        // Filter files by media type
        const filteredFiles = data.files.filter(file => {
            const ext = file.filename.split('.').pop().toLowerCase();
            return fileTypes[mediaType].includes(ext);
        });

        // Get current user info
        const checkResponse = await fetch('/api/auth/check');
        const checkData = await checkResponse.json();
        const currentUsername = checkData.username;
        currentMediaData.currentUsername = currentUsername;

        // Separate files into "My Media" (user's own files, even if public) and "Public" (other users' public files)
        const myMedia = filteredFiles.filter(file => file.creator === currentUsername);
        const publicMedia = filteredFiles.filter(file => file.public && file.creator !== currentUsername);
        
        // Store for filtering
        currentMediaData.myMedia = myMedia;
        currentMediaData.publicMedia = publicMedia;

        // Clear search filter when switching media types
        const searchInput = document.getElementById('media-search-filter');
        if (searchInput) {
            searchInput.value = '';
        }

        renderMediaSections(preserveScroll ? scrollPosition : undefined);
    } catch (error) {
        console.error('Error loading media:', error);
    }
}

function renderMediaSections(scrollPosition) {
    const listDiv = document.getElementById('media-list');
    listDiv.innerHTML = '';

    const searchInput = document.getElementById('media-search-filter');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    // Filter media by search term
    const filteredMyMedia = currentMediaData.myMedia.filter(file => {
        if (!searchTerm) return true;
        return file.original_name.toLowerCase().includes(searchTerm) ||
               (file.creator && file.creator.toLowerCase().includes(searchTerm));
    });
    
    const filteredPublicMedia = currentMediaData.publicMedia.filter(file => {
        if (!searchTerm) return true;
        return file.original_name.toLowerCase().includes(searchTerm) ||
               (file.creator && file.creator.toLowerCase().includes(searchTerm));
    });

    if (filteredMyMedia.length === 0 && filteredPublicMedia.length === 0) {
        const searchMsg = searchTerm ? `No ${currentMediaData.mediaType} files match "${searchTerm}"` : `No ${currentMediaData.mediaType} files yet. Upload some to get started!`;
        listDiv.innerHTML = `<p>${searchMsg}</p>`;
        return;
    }

    // Display "My Media" section with collapse functionality
    if (filteredMyMedia.length > 0) {
        const myMediaSection = document.createElement('div');
        myMediaSection.className = 'media-section';
        myMediaSection.dataset.section = 'my-media';
        myMediaSection.style.cssText = 'margin-bottom: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; padding: 1rem;';
        
        const myMediaHeading = document.createElement('h3');
        myMediaHeading.className = 'collapsible-section-header';
        myMediaHeading.dataset.collapsed = 'false';
        myMediaHeading.style.cssText = 'margin-top: 0; margin-bottom: 1rem; padding: 0.75rem; background: #e8f4f8; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; border: 1px solid #b3d9e6;';
        myMediaHeading.innerHTML = `
            <span style="font-weight: bold; color: #1976d2;">My Media <span style="color: #666; font-weight: normal;">(${filteredMyMedia.length})</span></span>
            <span class="collapse-icon" style="font-size: 1.2rem; transition: transform 0.3s; color: #1976d2;">▼</span>
        `;
        myMediaHeading.onclick = () => toggleSection('my-media');
        
        const myMediaContent = document.createElement('div');
        myMediaContent.className = 'media-section-content';
        myMediaContent.id = 'my-media-content';
        myMediaContent.style.cssText = 'padding: 0.5rem; background: white; border-radius: 6px; border: 1px solid #e0e0e0;';
        
        // Create select all checkbox and bulk actions container (inside My Media section)
        const selectAllDiv = document.createElement('div');
        selectAllDiv.style.cssText = 'margin-bottom: 1rem; padding: 0.75rem; display: flex; align-items: center; gap: 0.5rem; background: #f5f5f5; border-radius: 4px;';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'select-all-media';
        selectAllCheckbox.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
        selectAllCheckbox.onchange = function() {
            const checkboxes = document.querySelectorAll('.media-select-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
            updateBulkActions();
        };
        
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'select-all-media';
        selectAllLabel.textContent = 'Select All';
        selectAllLabel.style.cssText = 'cursor: pointer; font-weight: bold;';
        
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);
        myMediaContent.appendChild(selectAllDiv);
        
        // Create bulk actions container
        const bulkActionsDiv = document.createElement('div');
        bulkActionsDiv.id = 'media-bulk-actions';
        bulkActionsDiv.style.cssText = 'margin-bottom: 1rem; padding: 1rem; background: #fff3cd; border-radius: 6px; display: none; align-items: center; gap: 1rem; border: 1px solid #ffc107;';
        
        const selectedCountSpan = document.createElement('span');
        selectedCountSpan.id = 'selected-count';
        selectedCountSpan.style.fontWeight = 'bold';
        
        const bulkDeleteBtn = document.createElement('button');
        bulkDeleteBtn.className = 'btn btn-small btn-danger';
        bulkDeleteBtn.textContent = 'Delete Selected';
        bulkDeleteBtn.onclick = bulkDeleteMedia;
        
        const bulkMakePublicBtn = document.createElement('button');
        bulkMakePublicBtn.className = 'btn btn-small';
        bulkMakePublicBtn.textContent = 'Make Public';
        bulkMakePublicBtn.onclick = () => bulkToggleMediaPublic(true);
        
        const bulkMakePrivateBtn = document.createElement('button');
        bulkMakePrivateBtn.className = 'btn btn-small';
        bulkMakePrivateBtn.textContent = 'Make Private';
        bulkMakePrivateBtn.onclick = () => bulkToggleMediaPublic(false);
        
        bulkActionsDiv.appendChild(selectedCountSpan);
        bulkActionsDiv.appendChild(bulkDeleteBtn);
        bulkActionsDiv.appendChild(bulkMakePublicBtn);
        bulkActionsDiv.appendChild(bulkMakePrivateBtn);
        myMediaContent.appendChild(bulkActionsDiv);
        
        filteredMyMedia.forEach(file => {
            const item = createMediaItem(file, currentMediaData.currentUsername, true);
            myMediaContent.appendChild(item);
        });
        
        myMediaSection.appendChild(myMediaHeading);
        myMediaSection.appendChild(myMediaContent);
        listDiv.appendChild(myMediaSection);
    }

    // Display "Public" section with collapse functionality
    if (filteredPublicMedia.length > 0) {
        const publicMediaSection = document.createElement('div');
        publicMediaSection.className = 'media-section';
        publicMediaSection.dataset.section = 'public-media';
        publicMediaSection.style.cssText = 'margin-bottom: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; padding: 1rem;';
        
        const publicMediaHeading = document.createElement('h3');
        publicMediaHeading.className = 'collapsible-section-header';
        publicMediaHeading.dataset.collapsed = 'false';
        publicMediaHeading.style.cssText = 'margin-top: 0; margin-bottom: 1rem; padding: 0.75rem; background: #f3e5f5; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; border: 1px solid #ce93d8;';
        publicMediaHeading.innerHTML = `
            <span style="font-weight: bold; color: #7b1fa2;">Public <span style="color: #666; font-weight: normal;">(${filteredPublicMedia.length})</span></span>
            <span class="collapse-icon" style="font-size: 1.2rem; transition: transform 0.3s; color: #7b1fa2;">▼</span>
        `;
        publicMediaHeading.onclick = () => toggleSection('public-media');
        
        const publicMediaContent = document.createElement('div');
        publicMediaContent.className = 'media-section-content';
        publicMediaContent.id = 'public-media-content';
        publicMediaContent.style.cssText = 'padding: 0.5rem; background: white; border-radius: 6px; border: 1px solid #e0e0e0;';
        
        filteredPublicMedia.forEach(file => {
            const item = createMediaItem(file, currentMediaData.currentUsername, false);
            publicMediaContent.appendChild(item);
        });
        
        publicMediaSection.appendChild(publicMediaHeading);
        publicMediaSection.appendChild(publicMediaContent);
        listDiv.appendChild(publicMediaSection);
    }
    
    // Restore scroll position if provided
    if (scrollPosition !== undefined) {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
        });
    }
}

function toggleSection(sectionName) {
    const section = document.querySelector(`[data-section="${sectionName}"]`);
    if (!section) return;
    
    const header = section.querySelector('.collapsible-section-header');
    const content = section.querySelector('.media-section-content');
    const icon = header.querySelector('.collapse-icon');
    const isCollapsed = header.dataset.collapsed === 'true';
    
    if (isCollapsed) {
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
        header.dataset.collapsed = 'false';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
        header.dataset.collapsed = 'true';
    }
}

function filterMediaList() {
    renderMediaSections();
}

function createMediaItem(file, currentUsername, isMyMedia) {
    const item = document.createElement('div');
    item.className = 'list-item';
    const isOwner = file.creator === currentUsername;
    const fileSize = formatFileSize(file.size);
    const fileType = getFileType(file.filename);
    const ext = file.filename.split('.').pop().toLowerCase();
    const mediaUrl = `/api/media/serve/${file.filename}`;
    const referenceCount = file.reference_count || 0;
    
    // Determine media type and create preview
    let previewHtml = '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        // Image thumbnail
        previewHtml = `<img src="${mediaUrl}" alt="${file.original_name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; margin-right: 1rem; flex-shrink: 0;">`;
    } else if (['mp4', 'webm'].includes(ext)) {
        // Video thumbnail - show first frame
        previewHtml = `<video src="${mediaUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; margin-right: 1rem; flex-shrink: 0; pointer-events: none;" preload="metadata" muted playsinline></video>`;
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
        // Audio icon
        previewHtml = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #e0e0e0; border-radius: 4px; margin-right: 1rem; flex-shrink: 0; font-size: 2rem;">🔊</div>`;
    } else {
        // Default file icon
        previewHtml = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #e0e0e0; border-radius: 4px; margin-right: 1rem; flex-shrink: 0; font-size: 1.5rem;">📄</div>`;
    }
    
    // Escape filename for use in HTML attributes and JavaScript
    const escapedFilenameJs = file.filename.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedFilename = file.filename.replace(/"/g, '&quot;');
    const escapedOriginalName = file.original_name.replace(/"/g, '&quot;');
    
    // For My Media: show checkbox, public toggle, rename button, delete button
    // For Public Media: no checkbox, no public toggle, no rename, no delete button (read-only)
    item.innerHTML = `
        ${isMyMedia ? `<input type="checkbox" class="media-select-checkbox" data-filename="${escapedFilename}" data-original-name="${escapedOriginalName}" style="margin-right: 1rem; width: 20px; height: 20px; cursor: pointer;" onchange="updateBulkActions()">` : '<div style="width: 20px; margin-right: 1rem;"></div>'}
        ${previewHtml}
        <div style="flex: 1;">
            <strong class="media-display-name">${file.original_name}</strong>
            <div style="color: #666; font-size: 0.9rem;">
                ${fileType} | ${fileSize}
                ${file.creator ? ` | Created by: ${file.creator}` : ''}
                ${file.public ? ' | <span style="color: green;">Public</span>' : ' | <span style="color: #666;">Private</span>'}
                ${referenceCount > 0 ? ` | Referenced in ${referenceCount} quiz${referenceCount !== 1 ? 'es' : ''}` : ' | Not referenced'}
            </div>
        </div>
        <div class="list-item-actions" style="display: flex; align-items: center; gap: 0.5rem;">
            ${isMyMedia ? `<label style="display: flex; align-items: center; cursor: pointer; margin-right: 0.5rem;">
                <input type="checkbox" ${file.public ? 'checked' : ''} 
                       onchange="toggleMediaPublic('${escapedFilenameJs}', this.checked)"
                       style="margin-right: 0.5rem;">
                <span>Public</span>
            </label>` : ''}
            <button class="btn btn-small" onclick="downloadMedia('${escapedFilenameJs}')">Download</button>
            ${isMyMedia ? `<button class="btn btn-small" style="background-color: #17a2b8; color: white;" onclick="renameMedia('${escapedFilenameJs}', '${escapedOriginalName.replace(/'/g, "\\'")}')">Rename</button>` : ''}
            ${isMyMedia ? `<button class="btn btn-small btn-danger" onclick="deleteMedia('${escapedFilenameJs}')">Delete</button>` : ''}
        </div>
    `;
    
    return item;
}

function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.media-select-checkbox');
    const checkedBoxes = document.querySelectorAll('.media-select-checkbox:checked');
    const bulkActionsDiv = document.getElementById('media-bulk-actions');
    const selectedCountSpan = document.getElementById('selected-count');
    const selectAllCheckbox = document.getElementById('select-all-media');
    
    // Update select all checkbox state
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checkboxes.length > 0 && checkedBoxes.length === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
    }
    
    if (checkedBoxes.length > 0) {
        bulkActionsDiv.style.display = 'flex';
        selectedCountSpan.textContent = `${checkedBoxes.length} file${checkedBoxes.length !== 1 ? 's' : ''} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

async function bulkDeleteMedia() {
    const checkboxes = document.querySelectorAll('.media-select-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('No files selected');
        return;
    }
    
    // Get all selected filenames and original names - ensure we get all of them
    const filesToDelete = [];
    checkboxes.forEach((cb, index) => {
        // Try multiple methods to get the filename
        let filename = cb.dataset.filename;
        if (!filename) {
            filename = cb.getAttribute('data-filename');
        }
        
        // Try multiple methods to get the original name
        let originalName = cb.dataset.originalName;
        if (!originalName) {
            originalName = cb.getAttribute('data-original-name');
        }
        if (!originalName) {
            originalName = filename; // Fallback to filename
        }
        
        if (filename) {
            filesToDelete.push({
                filename: filename,
                originalName: originalName
            });
            console.log(`File ${index + 1}: filename="${filename}", originalName="${originalName}"`);
        } else {
            console.warn(`Checkbox ${index + 1} has no filename attribute`);
        }
    });
    
    if (filesToDelete.length === 0) {
        alert('No valid files selected');
        return;
    }
    
    const count = filesToDelete.length;
    
    // Create confirmation message with list of files
    let confirmMessage = `Are you sure you want to delete ${count} file${count !== 1 ? 's' : ''}?\n\nFiles to be deleted:\n`;
    filesToDelete.forEach((file, index) => {
        confirmMessage += `${index + 1}. ${file.originalName}\n`;
    });
    confirmMessage += '\nThis action cannot be undone.';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Extract just the filenames for the API call
    const filenames = filesToDelete.map(f => f.filename);
    
    // Debug: log what we're sending
    console.log(`Sending ${filenames.length} filenames to delete:`, filenames);
    
    try {
        const response = await fetch('/api/media/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filenames: filenames })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const failed = data.results.filter(r => !r.success);
            const succeeded = data.results.filter(r => r.success);
            
            // Debug: log the response
            console.log('Delete results:', data.results);
            
            if (failed.length > 0) {
                alert(`Deleted ${succeeded.length} of ${count} file(s).\n\nFailed to delete:\n${failed.map(f => `- ${f.filename}: ${f.error || 'Unknown error'}`).join('\n')}`);
            } else {
                alert(`Successfully deleted ${count} file${count !== 1 ? 's' : ''}`);
            }
            await loadMedia(true); // Preserve scroll position
        } else {
            alert(`Error: ${data.error || 'Failed to delete files'}`);
        }
    } catch (error) {
        console.error('Error deleting media:', error);
        alert('Error deleting files: ' + error.message);
    }
}

async function bulkToggleMediaPublic(makePublic) {
    const checkboxes = document.querySelectorAll('.media-select-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('No files selected');
        return;
    }
    
    const filenames = Array.from(checkboxes).map(cb => cb.dataset.filename);
    const count = filenames.length;
    const action = makePublic ? 'make public' : 'make private';
    
    try {
        const response = await fetch('/api/media/bulk-toggle-public', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filenames: filenames, make_public: makePublic })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const failed = data.results.filter(r => !r.success);
            if (failed.length > 0) {
                alert(`${action.charAt(0).toUpperCase() + action.slice(1)} ${count - failed.length} file(s). Failed: ${failed.map(f => f.filename).join(', ')}`);
            }
            // Always reload to update UI (even if some failed)
            await loadMedia(true); // Preserve scroll position
        } else {
            alert(`Error: ${data.error || `Failed to ${action} files`}`);
        }
    } catch (error) {
        console.error(`Error ${action} media:`, error);
        alert(`Error ${action} files`);
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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
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
            await loadMedia(true); // Preserve scroll position
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
            await loadMedia(true); // Preserve scroll position
        } else {
            alert('Error: ' + data.error);
            await loadMedia(true); // Reload to reset checkbox, preserve scroll
        }
    } catch (error) {
        alert('Error toggling public status');
        await loadMedia(true); // Reload to reset checkbox, preserve scroll
    }
}

async function renameMedia(filename, currentName) {
    const newName = prompt('Enter new display name:', currentName);
    
    if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    if (newName.trim() === currentName) {
        return; // No change
    }
    
    try {
        const response = await fetch(`/api/media/rename/${encodeURIComponent(filename)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_display_name: newName.trim() })
        });

        const data = await response.json();
        if (response.ok) {
            await loadMedia(true); // Preserve scroll position
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error renaming file');
        console.error('Error renaming media:', error);
    }
}

// Migration functions
function showMigrateModal(quizId, quizName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('migrate-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'migrate-modal';
        modal.style.cssText = 'display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);';
        modal.innerHTML = `
            <div style="background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 400px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="margin-top: 0;">Migrate Quiz to Server</h2>
                <p id="migrate-quiz-name" style="margin-bottom: 1rem; color: #666;"></p>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Server Username:</label>
                    <input type="text" id="migrate-username" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="Enter server username">
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Server Password:</label>
                    <input type="password" id="migrate-password" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="Enter server password">
                </div>
                <div id="migrate-status" style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;"></div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button id="migrate-cancel-btn" class="btn btn-small" style="background-color: #6c757d; color: white;">Cancel</button>
                    <button id="migrate-submit-btn" class="btn btn-small" style="background-color: #17a2b8; color: white;">Migrate</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal on cancel or outside click
        document.getElementById('migrate-cancel-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Set quiz name and reset form
    document.getElementById('migrate-quiz-name').textContent = `Quiz: ${quizName}`;
    document.getElementById('migrate-username').value = '';
    document.getElementById('migrate-password').value = '';
    document.getElementById('migrate-status').textContent = '';
    
    // Store quiz ID
    modal.dataset.quizId = quizId;
    
    // Update submit button
    const submitBtn = document.getElementById('migrate-submit-btn');
    submitBtn.onclick = () => migrateQuiz(quizId);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Migrate';
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus on username input
    document.getElementById('migrate-username').focus();
}

async function migrateQuiz(quizId) {
    const username = document.getElementById('migrate-username').value.trim();
    const password = document.getElementById('migrate-password').value;
    const statusDiv = document.getElementById('migrate-status');
    const submitBtn = document.getElementById('migrate-submit-btn');
    
    if (!username || !password) {
        statusDiv.textContent = 'Please enter both username and password';
        statusDiv.style.color = '#dc3545';
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Migrating...';
    statusDiv.textContent = 'Starting migration...';
    statusDiv.style.color = '#666';
    
    try {
        const response = await fetch(`/api/quiz/migrate/${encodeURIComponent(quizId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server_username: username,
                server_password: password
            })
        });
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, read as text to see what we got
            const text = await response.text();
            let errorMsg = `Server returned ${response.status} ${response.statusText}`;
            
            // Try to extract error message from HTML if possible
            if (text.includes('<!doctype') || text.includes('<!DOCTYPE')) {
                // It's an HTML error page
                if (response.status === 401) {
                    errorMsg = 'Unauthorized: Please log in as quizmaster';
                } else if (response.status === 403) {
                    errorMsg = 'Forbidden: You may not have permission to migrate this quiz';
                } else if (response.status === 404) {
                    errorMsg = 'Not found: Quiz or endpoint not found';
                } else if (response.status === 500) {
                    errorMsg = 'Server error: An error occurred on the server';
                } else {
                    errorMsg = `Server error (${response.status}): Received HTML instead of JSON`;
                }
            } else {
                errorMsg = text || errorMsg;
            }
            
            statusDiv.textContent = 'Error: ' + errorMsg;
            statusDiv.style.color = '#dc3545';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Migrate';
            return;
        }
        
        if (response.ok) {
            statusDiv.textContent = data.message || 'Migration successful!';
            statusDiv.style.color = '#28a745';
            submitBtn.textContent = 'Success';
            
            // Close modal after 2 seconds
            setTimeout(() => {
                document.getElementById('migrate-modal').style.display = 'none';
            }, 2000);
        } else {
            statusDiv.textContent = 'Error: ' + (data.error || 'Migration failed');
            statusDiv.style.color = '#dc3545';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Migrate';
        }
    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.style.color = '#dc3545';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Migrate';
    }
}


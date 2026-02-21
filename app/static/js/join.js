// Join page for participants
document.addEventListener('DOMContentLoaded', () => {
    loadAvatars();
    
    const roomCodeInput = document.getElementById('room-code');
    const nameInput = document.getElementById('participant-name');
    const joinNewBtn = document.getElementById('join-new-btn');
    const rejoinRoomCodeInput = document.getElementById('rejoin-room-code');
    const rejoinBtn = document.getElementById('rejoin-btn');
    const messageDiv = document.getElementById('message');

    // Auto-uppercase room code
    roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    rejoinRoomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Load participants for rejoin
    rejoinRoomCodeInput.addEventListener('input', async (e) => {
        const code = e.target.value.trim();
        if (code.length === 4) {
            await loadParticipants(code);
        }
    });

    joinNewBtn.addEventListener('click', async () => {
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        const name = nameInput.value.trim();
        const selectedAvatar = document.querySelector('.avatar-option.selected');

        if (roomCode.length !== 4) {
            showMessage('Please enter a 4-character room code', 'error');
            return;
        }

        if (!name) {
            showMessage('Please enter your name', 'error');
            return;
        }

        if (!selectedAvatar) {
            showMessage('Please select an avatar', 'error');
            return;
        }

        const avatar = selectedAvatar.dataset.avatar;
        window.location.href = (window.APP_BASE_PATH || '') + `/participant/${roomCode}?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`;
    });

    rejoinBtn.addEventListener('click', () => {
        const roomCode = rejoinRoomCodeInput.value.trim().toUpperCase();
        const selectedParticipant = document.querySelector('.participant-option.selected');

        if (roomCode.length !== 4) {
            showMessage('Please enter a 4-character room code', 'error');
            return;
        }

        if (!selectedParticipant) {
            showMessage('Please select a participant', 'error');
            return;
        }

        // Rejoin using name+avatar combo (the system will look it up)
        const name = selectedParticipant.dataset.name;
        const avatar = selectedParticipant.dataset.avatar;
        window.location.href = (window.APP_BASE_PATH || '') + `/participant/${roomCode}?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`;
    });

    // Show error message if redirected from participant page
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const room = urlParams.get('room');
    if (error) {
        showMessage(decodeURIComponent(error), 'error');
        if (room) {
            roomCodeInput.value = decodeURIComponent(room);
        }
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = type;
        messageDiv.style.display = 'block';
    }
});

function loadAvatars() {
    const container = document.getElementById('avatar-selection');
    container.innerHTML = '<h3>Select Avatar</h3><div class="avatar-grid"></div>';
    const grid = container.querySelector('.avatar-grid');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.style.gap = '1rem';
    grid.style.marginTop = '1rem';

    // Generate 20 avatar options (using emoji or placeholder images)
    const avatars = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
                     '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦉', '🐺', '🦄'];

    avatars.forEach((avatar, index) => {
        const option = document.createElement('div');
        option.className = 'avatar-option';
        option.dataset.avatar = `avatar_${index}`;
        option.style.cursor = 'pointer';
        option.style.padding = '0.5rem';
        option.style.border = '2px solid #ddd';
        option.style.borderRadius = '8px';
        option.style.textAlign = 'center';
        option.style.fontSize = '2rem';
        option.innerHTML = `<div class="avatar-preview">${avatar}</div>`;
        option.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(o => {
                o.classList.remove('selected');
                o.style.borderColor = '';
                o.style.backgroundColor = '';
            });
            option.classList.add('selected');
        });
        grid.appendChild(option);
    });
}

async function loadParticipants(roomCode) {
    const container = document.getElementById('participants-list');
    container.innerHTML = '<p>Loading participants...</p>';
    
    try {
        const response = await fetch(`/api/participants/${roomCode}`);
        if (!response.ok) {
            if (response.status === 404) {
                container.innerHTML = '<p style="color: #999;">No participants found or room not found</p>';
            } else {
                container.innerHTML = '<p style="color: #f44336;">Error loading participants</p>';
            }
            return;
        }
        
        const data = await response.json();
        const participants = data.participants || [];
        
        if (participants.length === 0) {
            container.innerHTML = '<p style="color: #999;">No participants have joined yet</p>';
            return;
        }
        
        container.innerHTML = '<h3>Select Your Profile</h3>';
        participants.forEach(participant => {
            const option = document.createElement('div');
            option.className = 'participant-option';
            option.dataset.participantId = participant.participant_id;
            option.dataset.name = participant.name;
            option.dataset.avatar = participant.avatar;
            
            // Avatar utilities are now in avatar-utils.js (getAvatarEmoji function)
            const avatarEmoji = getAvatarEmoji(participant.avatar);
            
            option.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 2rem;">${avatarEmoji}</span>
                    <span style="font-weight: 500;">${participant.name}</span>
                </div>
            `;
            
            option.addEventListener('click', () => {
                document.querySelectorAll('.participant-option').forEach(o => {
                    o.classList.remove('selected');
                });
                option.classList.add('selected');
            });
            
            container.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading participants:', error);
        container.innerHTML = '<p style="color: #f44336;">Error loading participants</p>';
    }
}


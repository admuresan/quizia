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
        window.location.href = `/participant/${roomCode}?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`;
    });

    rejoinBtn.addEventListener('click', async () => {
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

        const participantId = selectedParticipant.dataset.participantId;
        window.location.href = `/participant/${roomCode}?rejoin=${participantId}`;
    });

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
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.style.borderColor = '#2196F3';
            option.style.backgroundColor = '#e3f2fd';
        });
        grid.appendChild(option);
    });
}

async function loadParticipants(roomCode) {
    // This would typically fetch from the server
    // For now, we'll handle this via WebSocket when joining
    const container = document.getElementById('participants-list');
    container.innerHTML = '<p>Enter room code to see participants</p>';
}


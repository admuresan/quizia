// Browse public rooms functionality
document.addEventListener('DOMContentLoaded', () => {
    const browseRoomsBtn = document.getElementById('browse-rooms-btn');
    const browseModal = document.getElementById('browse-rooms-modal');
    const closeModalBtn = document.getElementById('close-browse-modal');
    const publicRoomsList = document.getElementById('public-rooms-list');
    const roomCodeInput = document.getElementById('room-code');

    if (!browseRoomsBtn || !browseModal) {
        return; // Elements not found, skip initialization
    }

    // Open modal when browse button is clicked
    browseRoomsBtn.addEventListener('click', async () => {
        browseModal.style.display = 'block';
        await loadPublicRooms();
    });

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        browseModal.style.display = 'none';
    });

    // Close modal when clicking outside
    browseModal.addEventListener('click', (e) => {
        if (e.target === browseModal) {
            browseModal.style.display = 'none';
        }
    });

    async function loadPublicRooms() {
        publicRoomsList.innerHTML = '<p>Loading public rooms...</p>';
        
        try {
            const response = await fetch('/api/public-rooms');
            if (!response.ok) {
                publicRoomsList.innerHTML = '<p style="color: #f44336;">Error loading public rooms</p>';
                return;
            }
            
            const data = await response.json();
            const rooms = data.public_rooms || [];

            if (rooms.length === 0) {
                publicRoomsList.innerHTML = '<p style="color: #666;">No public rooms available at the moment.</p>';
                return;
            }

            publicRoomsList.innerHTML = '';
            
            rooms.forEach(room => {
                const roomItem = document.createElement('div');
                roomItem.className = 'public-room-item';
                roomItem.style.cssText = 'padding: 1rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; cursor: pointer; transition: background 0.2s;';
                
                roomItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.5rem;">
                                ${escapeHtml(room.quiz_name)}
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                <div>Room Code: <strong style="color: #4CAF50; font-size: 1.1em;">${room.code}</strong></div>
                                <div>Quizmaster: ${escapeHtml(room.quizmaster)}</div>
                                <div>Page: ${room.current_page + 1} of ${room.total_pages}</div>
                                <div>Participants: ${room.participant_count}</div>
                            </div>
                        </div>
                        <button class="btn btn-primary" style="margin-left: 1rem;" onclick="selectRoom('${room.code}')">Select</button>
                    </div>
                `;
                
                // Hover effect
                roomItem.addEventListener('mouseenter', () => {
                    roomItem.style.background = '#f0f0f0';
                });
                roomItem.addEventListener('mouseleave', () => {
                    roomItem.style.background = '#f9f9f9';
                });
                
                // Click to select
                roomItem.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        selectRoom(room.code);
                    }
                });
                
                publicRoomsList.appendChild(roomItem);
            });
        } catch (error) {
            console.error('Error loading public rooms:', error);
            publicRoomsList.innerHTML = '<p style="color: #f44336;">Error loading public rooms</p>';
        }
    }

    // Function to select a room (called from onclick handlers)
    window.selectRoom = function(roomCode) {
        roomCodeInput.value = roomCode;
        browseModal.style.display = 'none';
        // Focus on name input to guide user
        const nameInput = document.getElementById('participant-name');
        if (nameInput) {
            nameInput.focus();
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});







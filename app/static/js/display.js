// Display page (for large screen) - matches editor display view exactly
const socket = io();
let currentPageIndex = 0; // Track current page index to stay in sync
let currentPage = null;
let quiz = null;
let participants = {};

// Avatar utilities are now in avatar-utils.js (getAvatarEmoji function)

document.addEventListener('DOMContentLoaded', () => {
    // roomCode is declared in the template as const in global scope
    // Access it via window.roomCode to be explicit
    const currentRoomCode = window.roomCode;
    if (!currentRoomCode) {
        console.error('Room code not found');
        return;
    }

    socket.on('connect', () => {
        socket.emit('display_join', { room_code: currentRoomCode });
    });

    socket.on('display_state', (data) => {
        console.log('Display state received:', data);
        quiz = data.quiz || quiz;
        // Always use server's current_page to stay in sync
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        }
        console.log('Quiz object:', quiz);
        console.log('Page object:', data.page);
        console.log('Current page index:', currentPageIndex);
        renderPage(currentPageIndex, data.page);
    });

    socket.on('page_changed', (data) => {
        if (data.quiz) {
            quiz = data.quiz;
        }
        // Always use server's page_index to stay in sync
        if (data.page_index !== undefined) {
            currentPageIndex = data.page_index;
        }
        console.log('Page changed to index:', currentPageIndex);
        renderPage(currentPageIndex, data.page);
    });

    socket.on('element_control', (data) => {
        handleElementControl(data.element_id, data.action);
    });
    
    socket.on('element_appearance_control', (data) => {
        // Handle element appearance control (show/hide)
        const elementId = data.element_id;
        const visible = data.visible;
        const element = document.getElementById(`element-${elementId}`);
        if (element) {
            element.style.display = visible ? 'block' : 'none';
            // Also update the element's appearance_visible property in quiz data
            if (quiz && quiz.pages) {
                quiz.pages.forEach(page => {
                    if (page.elements) {
                        const el = page.elements.find(e => e.id === elementId);
                        if (el) {
                            el.appearance_visible = visible;
                        }
                    }
                });
            }
        }
    });

    socket.on('quiz_ended', (data) => {
        renderFinalResults(data.final_rankings, currentPage, quiz);
    });

    socket.on('participant_joined', (data) => {
        participants[data.participant_id] = data;
    });

    socket.on('score_updated', (data) => {
        if (currentPage && currentPage.type === 'status') {
            updateStatusPage(data.scores);
        }
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        if (data.message) {
            // If it's a "not running" error, show the error page
            if (data.message.includes('not running') || data.message.includes('not found')) {
                showQuizNotRunning();
            } else {
                alert('Error: ' + data.message);
            }
        }
    });

    socket.on('quiz_not_running', (data) => {
        showQuizNotRunning();
    });
});

function renderPage(pageIndex, page) {
    const container = document.getElementById('display-content');
    
    console.log('renderPage called with:', { pageIndex, page, quiz, container });
    
    if (!page) {
        console.warn('No page provided to renderPage');
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 2rem;">Waiting for quiz to start...</div>';
        return;
    }

    if (!quiz) {
        console.error('No quiz object available for rendering');
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-size: 2rem;">Error: Quiz data not loaded</div>';
        return;
    }

    currentPage = page;

    // Handle special page types
    if (page.type === 'status') {
        renderStatusPage(container, page, quiz);
        return;
    }

    if (page.type === 'results') {
        renderFinalResultsPage(container, page, quiz);
        return;
    }

    // Render regular display page - match editor display view exactly
    container.innerHTML = '';
    
    // Set background FIRST (before sizing)
    // Use page background if available, otherwise use quiz background
    const bgColor = page?.background_color || quiz?.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const bgImage = page?.background_image || quiz?.background_image;
    
    if (bgImage) {
        container.style.backgroundImage = `url(${bgImage})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.background = 'none'; // Clear any background color
    } else {
        container.style.background = bgColor;
        container.style.backgroundImage = 'none';
    }
    
    // Get canvas dimensions from quiz view settings or use defaults
    const viewSettings = quiz?.view_settings?.display || { canvas_width: 1920, canvas_height: 1080 };
    const canvasWidth = viewSettings.canvas_width || 1920;
    const canvasHeight = viewSettings.canvas_height || 1080;
    
    // Set container size to match canvas
    container.style.position = 'relative';
    container.style.width = `${canvasWidth}px`;
    container.style.height = `${canvasHeight}px`;
    container.style.minWidth = `${canvasWidth}px`;
    container.style.minHeight = `${canvasHeight}px`;
    container.style.maxWidth = '100vw';
    container.style.maxHeight = '100vh';
    container.style.overflow = 'hidden';
    container.style.margin = '0 auto';
    container.style.display = 'block';
    
    console.log('Container size set to:', canvasWidth, 'x', canvasHeight);
    console.log('Container computed style:', window.getComputedStyle(container).width, 'x', window.getComputedStyle(container).height);
    
    // Render elements - only display view elements (matching editor)
    if (page.elements) {
        console.log('Page has', page.elements.length, 'elements');
        const displayElements = page.elements.filter(el => 
            (!el.view || el.view === 'display') && 
            el.type !== 'navigation_control' && 
            el.type !== 'audio_control' && 
            el.type !== 'answer_input' && 
            el.type !== 'answer_display'
        );
        console.log('Display elements after filtering:', displayElements.length);
        
        if (!RuntimeRenderer || !RuntimeRenderer.ElementRenderer || !RuntimeRenderer.ElementRenderer.renderElement) {
            console.error('RuntimeRenderer not available!', RuntimeRenderer);
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-size: 2rem;">Error: Renderer not loaded</div>';
            return;
        }
        
        // Handle appearance modes and initial visibility
        const pageStartTime = Date.now();
        const orderedElements = (page.appearance_order || displayElements.map(el => el.id))
            .map(id => displayElements.find(el => el.id === id))
            .filter(el => el);
        
        orderedElements.forEach((element, index) => {
            console.log(`Rendering element ${index}:`, element.type, element);
            try {
                const el = RuntimeRenderer.ElementRenderer.renderElement(container, element, {
                    mode: 'display'
                });
                
                // Handle initial visibility based on appearance mode
                const appearanceMode = element.appearance_mode || 'on_load';
                if (appearanceMode === 'control') {
                    // Control mode: on display page, elements should be visible by default when quiz starts
                    // The appearance_visible property tracks runtime state (changed by quizmaster controls)
                    // But when rendering initially, default to visible unless element.visible is false
                    if (element.visible === false) {
                        // Element is explicitly marked as not visible
                        if (el) {
                            el.style.display = 'none';
                        }
                    } else {
                        // On display page, start with elements visible by default
                        // appearance_visible will be updated by quizmaster controls
                        if (el) {
                            // Default to visible, but respect appearance_visible if it's been set during runtime
                            // For initial render, show the element
                            el.style.display = 'block';
                            element.appearance_visible = true; // Set to visible for display page
                        }
                    }
                } else if (appearanceMode === 'global_delay') {
                    // Global delay: show after X seconds
                    const delay = (element.appearance_delay || 0) * 1000;
                    if (el) {
                        el.style.display = 'none';
                    }
                    setTimeout(() => {
                        if (el) {
                            el.style.display = 'block';
                            element.appearance_visible = true;
                            // Notify control page to update toggle
                            if (socket && window.roomCode) {
                                socket.emit('element_appearance_changed', {
                                    room_code: window.roomCode,
                                    element_id: element.id,
                                    visible: true
                                });
                            }
                        }
                    }, delay);
                } else if (appearanceMode === 'after_previous' && index > 0) {
                    // After previous: show when previous element appears
                    if (el) {
                        el.style.display = 'none';
                    }
                    // This will be handled by watching the previous element
                } else if (appearanceMode === 'local_delay' && index > 0) {
                    // Local delay: show X seconds after previous element
                    if (el) {
                        el.style.display = 'none';
                    }
                    // This will be handled by watching the previous element
                } else {
                    // On load: show immediately
                    element.appearance_visible = true;
                    if (el) {
                        el.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error(`Error rendering element ${index}:`, error, element);
            }
        });
        
        // Handle "after_previous" and "local_delay" modes by watching previous elements
        orderedElements.forEach((element, index) => {
            if (index === 0) return;
            
            const appearanceMode = element.appearance_mode || 'on_load';
            const el = document.getElementById(`element-${element.id}`);
            
            if (appearanceMode === 'after_previous') {
                // Watch previous element
                const prevElement = orderedElements[index - 1];
                const prevEl = document.getElementById(`element-${prevElement.id}`);
                if (prevEl && el) {
                    // Use MutationObserver to watch for display changes
                    const observer = new MutationObserver((mutations) => {
                        if (prevEl.style.display === 'block' && el.style.display === 'none') {
                            el.style.display = 'block';
                            element.appearance_visible = true;
                            // Notify control page
                            if (socket) {
                                socket.emit('element_appearance_changed', {
                                    element_id: element.id,
                                    visible: true
                                });
                            }
                        }
                    });
                    observer.observe(prevEl, { attributes: true, attributeFilter: ['style'] });
                }
            } else if (appearanceMode === 'local_delay') {
                // Watch previous element and show after delay
                const prevElement = orderedElements[index - 1];
                const prevEl = document.getElementById(`element-${prevElement.id}`);
                const delay = (element.appearance_delay || 0) * 1000;
                
                if (prevEl && el) {
                    const observer = new MutationObserver((mutations) => {
                        if (prevEl.style.display === 'block' && el.style.display === 'none') {
                            setTimeout(() => {
                                if (el) {
                                    el.style.display = 'block';
                                    element.appearance_visible = true;
                                    // Notify control page
                                    if (socket) {
                                        socket.emit('element_appearance_changed', {
                                            element_id: element.id,
                                            visible: true
                                        });
                                    }
                                }
                            }, delay);
                        }
                    });
                    observer.observe(prevEl, { attributes: true, attributeFilter: ['style'] });
                }
            }
        });
    } else {
        console.warn('Page has no elements array');
    }
    
    // Room code display in bottom left
    const roomCodeEl = document.getElementById('room-code-display');
    if (roomCodeEl) {
        roomCodeEl.textContent = window.roomCode || '';
        roomCodeEl.style.position = 'absolute';
        roomCodeEl.style.bottom = '20px';
        roomCodeEl.style.left = '20px';
        roomCodeEl.style.zIndex = '10000';
        roomCodeEl.style.padding = '0.5rem 1rem';
        roomCodeEl.style.background = 'rgba(0, 0, 0, 0.5)';
        roomCodeEl.style.color = 'white';
        roomCodeEl.style.borderRadius = '4px';
        roomCodeEl.style.fontSize = '1.2rem';
        roomCodeEl.style.fontWeight = 'bold';
    }
}

function handleElementControl(elementId, action) {
    const element = document.getElementById(`element-${elementId}`);
    if (!element) return;

    switch (action) {
        case 'show':
            element.style.display = 'block';
            break;
        case 'hide':
            element.style.display = 'none';
            break;
        case 'play':
            // Find audio/video element
            const audio = element.querySelector('audio') || document.getElementById(`audio-${elementId}`);
            const video = element.querySelector('video') || document.getElementById(`video-${elementId}`);
            if (audio) {
                audio.play();
            }
            if (video) {
                video.play();
            }
            break;
        case 'pause':
            const audio2 = element.querySelector('audio') || document.getElementById(`audio-${elementId}`);
            const video2 = element.querySelector('video') || document.getElementById(`video-${elementId}`);
            if (audio2) {
                audio2.pause();
            }
            if (video2) {
                video2.pause();
            }
            break;
    }
}

function renderStatusPage(container, page, quiz) {
    container.innerHTML = '';
    
    // Use page background if available, otherwise use quiz background
    const bgColor = page?.background_color || quiz?.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const bgImage = page?.background_image || quiz?.background_image;
    
    container.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; color: white; padding: 2rem; position: relative;';
    
    if (bgImage) {
        container.style.backgroundImage = `url(${bgImage})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
    } else {
        container.style.background = bgColor;
        container.style.backgroundImage = 'none';
    }
    
    const title = document.createElement('h1');
    title.textContent = 'Current Rankings';
    title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
    container.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'rankings-content';
    content.style.cssText = 'width: 100%; max-width: 1200px;';
    container.appendChild(content);
}

function updateStatusPage(scores) {
    const content = document.getElementById('rankings-content');
    if (!content) return;

    // Get participants with scores
    const rankings = Object.entries(scores).map(([id, score]) => ({
        id,
        name: participants[id]?.name || 'Unknown',
        avatar: participants[id]?.avatar, // Keep as code, will convert when displaying
        score
    })).sort((a, b) => b.score - a.score);

    // Top 3 podium
    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    const podium = document.createElement('div');
    podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
    
    top3.forEach((p, i) => {
        const place = document.createElement('div');
        place.style.cssText = 'text-align: center;';
        place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
        
        const avatar = document.createElement('div');
        avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
        avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
        place.appendChild(avatar);
        
        const name = document.createElement('div');
        name.textContent = p.name;
        name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
        place.appendChild(name);
        
        const score = document.createElement('div');
        score.textContent = `${p.score} points`;
        score.style.cssText = 'font-size: 1.2rem;';
        place.appendChild(score);
        
        podium.appendChild(place);
    });
    
    content.innerHTML = '';
    content.appendChild(podium);

    if (rest.length > 0) {
        const rankingsList = document.createElement('div');
        rankingsList.style.cssText = 'width: 100%; max-width: 800px; margin: 2rem auto 0;';
        
        rest.forEach((p, i) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); margin: 0.5rem 0; border-radius: 8px;';
            
            const avatar = document.createElement('div');
            avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
            avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; margin-right: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.2);';
            item.appendChild(avatar);
            
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1;';
            
            const name = document.createElement('div');
            name.textContent = p.name;
            name.style.cssText = 'font-size: 1.2rem; font-weight: bold;';
            info.appendChild(name);
            
            const score = document.createElement('div');
            score.textContent = `${p.score} points - Rank ${i + 4}`;
            score.style.cssText = 'font-size: 1rem; opacity: 0.8;';
            info.appendChild(score);
            
            item.appendChild(info);
            rankingsList.appendChild(item);
        });
        
        content.appendChild(rankingsList);
    }
}

function renderFinalResultsPage(container, page, quiz) {
    container.innerHTML = '';
    
    // Use page background if available, otherwise use quiz background
    const bgColor = page?.background_color || quiz?.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const bgImage = page?.background_image || quiz?.background_image;
    
    container.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; color: white; padding: 2rem; position: relative;';
    
    if (bgImage) {
        container.style.backgroundImage = `url(${bgImage})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
    } else {
        container.style.background = bgColor;
        container.style.backgroundImage = 'none';
    }
    
    const title = document.createElement('h1');
    title.innerHTML = '🎉 Quiz Complete! 🎉';
    title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
    container.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'results-content';
    content.style.cssText = 'width: 100%; max-width: 1200px;';
    container.appendChild(content);
}

function showQuizNotRunning() {
    const container = document.getElementById('display-content');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.cssText = 'width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: white; border-radius: 16px; padding: 3rem; max-width: 600px; width: 90%; text-align: center; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);';
    
    const icon = document.createElement('div');
    icon.textContent = '🔍';
    icon.style.cssText = 'font-size: 5rem; margin-bottom: 1.5rem;';
    errorDiv.appendChild(icon);
    
    const title = document.createElement('h1');
    title.textContent = 'Quiz Not Found';
    title.style.cssText = 'font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 1rem;';
    errorDiv.appendChild(title);
    
    const message = document.createElement('p');
    message.textContent = 'No quiz is currently running with this code. The quiz may have ended, or the code may be incorrect.';
    message.style.cssText = 'font-size: 1.2rem; color: #666; margin-bottom: 1rem; line-height: 1.6;';
    errorDiv.appendChild(message);
    
    const roomCodeEl = document.createElement('div');
    roomCodeEl.textContent = window.roomCode || 'Unknown';
    roomCodeEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #667eea; margin: 1rem 0; padding: 0.5rem; background: #f5f5f5; border-radius: 8px; font-family: "Courier New", monospace;';
    errorDiv.appendChild(roomCodeEl);
    
    const backButton = document.createElement('a');
    backButton.href = '/';
    backButton.textContent = 'Go to Home';
    backButton.style.cssText = 'display: inline-block; padding: 1rem 2rem; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: 500; margin-top: 1rem;';
    errorDiv.appendChild(backButton);
    
    container.appendChild(errorDiv);
}

function renderFinalResults(rankings, page, quiz) {
    const container = document.getElementById('display-content');
    const content = document.getElementById('results-content');
    
    if (!content) {
        renderFinalResultsPage(container, page, quiz);
        const newContent = document.getElementById('results-content');
        if (newContent) {
            populateFinalResults(newContent, rankings);
        }
    } else {
        populateFinalResults(content, rankings);
    }
}

function populateFinalResults(content, rankings) {
    content.innerHTML = '';
    
    if (rankings.length === 0) return;
    
    // Main container with flex layout: champion/podium on left, rankings list on right
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = 'display: flex; gap: 3rem; align-items: flex-start; width: 100%; max-width: 1400px; margin: 0 auto;';
    
    // Left side: Winner section and Top 3 podium
    const leftSection = document.createElement('div');
    leftSection.style.cssText = 'flex: 1; min-width: 0;';
    
    // Winner section (takes most space)
    const winner = rankings[0];
    const winnerSection = document.createElement('div');
    winnerSection.style.cssText = 'text-align: center; margin-bottom: 2rem;';
    
    const winnerEmoji = document.createElement('div');
    winnerEmoji.textContent = '🏆';
    winnerEmoji.style.cssText = 'font-size: 8rem; margin-bottom: 1rem;';
    winnerSection.appendChild(winnerEmoji);
    
    const winnerAvatar = document.createElement('div');
    winnerAvatar.textContent = getAvatarEmoji(winner.avatar) || '👤';
    winnerAvatar.style.cssText = 'width: 150px; height: 150px; border-radius: 50%; border: 6px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 5rem; background: rgba(255,255,255,0.2);';
    winnerSection.appendChild(winnerAvatar);
    
    const winnerName = document.createElement('div');
    winnerName.textContent = winner.name || 'Winner';
    winnerName.style.cssText = 'font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;';
    winnerSection.appendChild(winnerName);
    
    const winnerTitle = document.createElement('div');
    winnerTitle.innerHTML = '🏆 CHAMPION 🏆';
    winnerTitle.style.cssText = 'font-size: 1.8rem;';
    winnerSection.appendChild(winnerTitle);
    
    leftSection.appendChild(winnerSection);
    
    // Top 3 podium
    const podium = document.createElement('div');
    podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem;';
    
    rankings.slice(0, 3).forEach((p, i) => {
        const place = document.createElement('div');
        place.style.cssText = 'text-align: center;';
        place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
        
        const avatar = document.createElement('div');
        avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
        avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
        place.appendChild(avatar);
        
        const name = document.createElement('div');
        name.textContent = p.name;
        name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
        place.appendChild(name);
        
        const score = document.createElement('div');
        score.textContent = `${p.score} points`;
        score.style.cssText = 'font-size: 1.2rem;';
        place.appendChild(score);
        
        podium.appendChild(place);
    });
    
    leftSection.appendChild(podium);
    mainContainer.appendChild(leftSection);
    
    // Right side: Rest of rankings
    if (rankings.length > 3) {
        const rightSection = document.createElement('div');
        rightSection.style.cssText = 'flex: 1; min-width: 400px; max-height: 80vh; overflow-y: auto;';
        
        const rankingsTitle = document.createElement('h3');
        rankingsTitle.textContent = 'All Rankings';
        rankingsTitle.style.cssText = 'font-size: 1.8rem; font-weight: bold; margin-bottom: 1rem; text-align: center;';
        rightSection.appendChild(rankingsTitle);
        
        const rankingsList = document.createElement('div');
        rankingsList.style.cssText = 'width: 100%;';
        
        rankings.slice(3).forEach((p) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); margin: 0.5rem 0; border-radius: 8px;';
            
            const avatar = document.createElement('div');
            avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
            avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; margin-right: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.2); flex-shrink: 0;';
            item.appendChild(avatar);
            
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            
            const name = document.createElement('div');
            name.textContent = p.name;
            name.style.cssText = 'font-size: 1.2rem; font-weight: bold; margin-bottom: 0.25rem;';
            info.appendChild(name);
            
            const score = document.createElement('div');
            score.textContent = `${p.score} points - Rank ${p.rank}`;
            score.style.cssText = 'font-size: 1rem; opacity: 0.8;';
            info.appendChild(score);
            
            item.appendChild(info);
            rankingsList.appendChild(item);
        });
        
        rightSection.appendChild(rankingsList);
        mainContainer.appendChild(rightSection);
    }
    
    content.appendChild(mainContainer);
}
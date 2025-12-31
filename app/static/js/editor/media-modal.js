// Media modal functionality for the editor

(function(Editor) {
    'use strict';

    let mediaModalCallback = null;
    let currentMediaData = { my: [], public: [] }; // Store current media data for filtering
    let currentTabType = 'images';

    Editor.MediaModal = {
        init: function() {
            const modal = document.getElementById('media-modal');
            const closeBtn = document.getElementById('media-modal-close');
            const tabs = document.querySelectorAll('.modal-tab');
            
            if (!modal || !closeBtn) return;
            
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.dataset.tab;
                    tabs.forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    const tabContent = document.getElementById(`media-tab-${tabName}`);
                    if (tabContent) {
                        tabContent.classList.add('active');
                    }
                    // Clear search when switching tabs
                    const searchInput = document.getElementById('media-search-input');
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    this.loadMediaForTab(tabName);
                });
            });
            
            ['image', 'audio', 'video'].forEach(type => {
                const uploadBtn = document.getElementById(`upload-${type}-btn`);
                const uploadFile = document.getElementById(`upload-${type}-file`);
                
                if (uploadBtn && uploadFile) {
                    uploadBtn.addEventListener('click', () => uploadFile.click());
                    
                    uploadFile.addEventListener('change', async (e) => {
                        const files = Array.from(e.target.files);
                        let uploadSuccess = false;
                        
                        for (const file of files) {
                            const result = await this.uploadMediaFile(file, type);
                            if (result && result.success) {
                                uploadSuccess = true;
                            }
                        }
                        
                        // Refresh the tab that matches the uploaded file type
                        // Map type to tab name (image -> images)
                        const tabType = type === 'image' ? 'images' : type;
                        
                        // Check if this tab is currently active
                        const activeTab = document.querySelector('.modal-tab.active');
                        const isActiveTab = activeTab && activeTab.dataset.tab === tabType;
                        
                        // Always refresh the matching tab so new items appear
                        // If it's the active tab, it will update immediately
                        // If not, it will be fresh when user switches to it
                        if (uploadSuccess) {
                            this.loadMediaForTab(tabType);
                        }
                        
                        // Clear the file input so the same file can be uploaded again
                        e.target.value = '';
                    });
                }
            });
            
            // Add search input handler
            const searchInput = document.getElementById('media-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterMedia(e.target.value);
                });
            }
        },

        open: function(callback, defaultTab = 'images') {
            mediaModalCallback = callback;
            const modal = document.getElementById('media-modal');
            if (modal) {
                modal.style.display = 'flex';
                // Set higher z-index to appear above background modal (10000) or other modals
                modal.style.zIndex = '10001';
                // Clear search input when opening modal
                const searchInput = document.getElementById('media-search-input');
                if (searchInput) {
                    searchInput.value = '';
                }
                // Activate the default tab
                const tabs = document.querySelectorAll('.modal-tab');
                const tabContents = document.querySelectorAll('.modal-tab-content');
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                const targetTab = Array.from(tabs).find(t => t.dataset.tab === defaultTab) || tabs[0];
                if (targetTab) {
                    targetTab.classList.add('active');
                    const targetContent = document.getElementById(`media-tab-${targetTab.dataset.tab}`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                }
                
                this.loadMediaForTab(defaultTab);
            }
        },

        loadMediaForTab: async function(tabType) {
            try {
                currentTabType = tabType;
                const response = await fetch('/api/media/list');
                const data = await response.json();
                
                const checkResponse = await fetch('/api/auth/check');
                const checkData = await checkResponse.json();
                const currentUsername = checkData.username;
                
                const myList = document.getElementById(`my-${tabType}-list`);
                const publicList = document.getElementById(`public-${tabType}-list`);
                
                if (!myList || !publicList) return;
                
                const fileTypes = {
                    images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
                    audio: ['mp3', 'wav', 'ogg'],
                    video: ['mp4', 'webm']
                };
                
                const myMedia = data.files.filter(f => {
                    const ext = f.filename.split('.').pop().toLowerCase();
                    return f.creator === currentUsername && fileTypes[tabType].includes(ext);
                });
                
                const publicMedia = data.files.filter(f => {
                    const ext = f.filename.split('.').pop().toLowerCase();
                    return f.public && f.creator !== currentUsername && fileTypes[tabType].includes(ext);
                });
                
                // Store media data for filtering
                currentMediaData.my = myMedia;
                currentMediaData.public = publicMedia;
                
                // Get current search term and filter
                const searchInput = document.getElementById('media-search-input');
                const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
                this.renderMediaLists(tabType, searchTerm);
            } catch (error) {
                console.error('Error loading media:', error);
            }
        },
        
        filterMedia: function(searchTerm) {
            this.renderMediaLists(currentTabType, searchTerm.toLowerCase());
        },
        
        renderMediaLists: function(tabType, searchTerm) {
            const myList = document.getElementById(`my-${tabType}-list`);
            const publicList = document.getElementById(`public-${tabType}-list`);
            
            if (!myList || !publicList) return;
            
            myList.innerHTML = '';
            publicList.innerHTML = '';
            
            // Filter media based on search term
            const filteredMy = currentMediaData.my.filter(file => {
                if (!searchTerm) return true;
                const filename = (file.original_name || file.filename || '').toLowerCase();
                return filename.includes(searchTerm);
            });
            
            const filteredPublic = currentMediaData.public.filter(file => {
                if (!searchTerm) return true;
                const filename = (file.original_name || file.filename || '').toLowerCase();
                return filename.includes(searchTerm);
            });
            
            // Render filtered results
            if (filteredMy.length === 0 && filteredPublic.length === 0 && searchTerm) {
                // Show "no results" message if searching and nothing found
                const noResults = document.createElement('div');
                noResults.textContent = 'No media files found matching your search.';
                noResults.style.cssText = 'padding: 1rem; text-align: center; color: #666;';
                myList.appendChild(noResults);
            } else {
                filteredMy.forEach(file => {
                    const item = this.createMediaItem(file, tabType);
                    myList.appendChild(item);
                });
                
                filteredPublic.forEach(file => {
                    const item = this.createMediaItem(file, tabType);
                    publicList.appendChild(item);
                });
            }
        },

        createMediaItem: function(file, tabType) {
            const item = document.createElement('div');
            item.className = 'media-item';
            item.style.cssText = 'padding: 0.5rem; border: 1px solid #ddd; margin: 0.5rem 0; cursor: pointer; border-radius: 4px;';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '0.5rem';
            
            if (tabType === 'images') {
                const img = document.createElement('img');
                img.src = `/api/media/serve/${file.filename}`;
                img.style.width = '50px';
                img.style.height = '50px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                item.appendChild(img);
            } else if (tabType === 'video') {
                const icon = document.createElement('div');
                icon.innerHTML = '▶';
                icon.style.fontSize = '24px';
                item.appendChild(icon);
            } else if (tabType === 'audio') {
                const icon = document.createElement('div');
                icon.innerHTML = '🔊';
                icon.style.fontSize = '24px';
                item.appendChild(icon);
            }
            
            const name = document.createElement('span');
            name.textContent = file.original_name;
            item.appendChild(name);
            
            item.addEventListener('click', () => {
                const mediaType = tabType === 'images' ? 'image' : tabType;
                const modal = document.getElementById('media-modal');
                
                // Close modal first to ensure it closes even if callback throws an error
                if (modal) {
                    modal.style.display = 'none';
                }
                
                // Then call the callback
                if (mediaModalCallback) {
                    try {
                        mediaModalCallback({
                            media_type: mediaType,
                            url: `/api/media/serve/${file.filename}`,
                            filename: file.filename
                        });
                    } catch (error) {
                        console.error('Error in media modal callback:', error);
                    }
                }
            });
            
            return item;
        },

        uploadMediaFile: async function(file, type) {
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
                    return { success: false };
                }
                return { success: true, filename: data.filename };
            } catch (error) {
                alert(`Error uploading ${file.name}`);
                return { success: false };
            }
        }
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.MediaModal = Editor.MediaModal;

})(typeof Editor !== 'undefined' ? Editor : {});


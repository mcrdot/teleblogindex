// app.js - TeleBlog Application with Supabase Integration
// Environment-aware Telegram Web App initialization with database support

// Global state
let tg;
let currentUser = null;
let posts = [];
let currentView = 'feed';
let viewHistory = [];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeTelegramWebApp();
    
    // Initialize Supabase using the helper
    if (window.SupabaseClient) {
        window.SupabaseClient.init();
        console.log("Supabase initialized via helper");
    } else {
        console.error("SupabaseClient helper not found");
    }
    
    checkAuth();
    initAds();
    setupEditorLeaveConfirmation();
    restoreDraftContent();
});

// Initialize Telegram Web App with automatic environment detection
function initializeTelegramWebApp() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        // Production - Real Telegram environment
        tg = Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();
        console.log("Production: Using real Telegram WebApp");
    } else if (isLocal) {
        // Development - Local environment with mock
        tg = createMockTelegramWebApp();
        console.log("Development: Using mock Telegram WebApp");
    } else {
        // Production but Telegram not available yet
        console.log("Waiting for Telegram WebApp to load...");
        setTimeout(initializeTelegramWebApp, 100);
    }
}

// Create mock Telegram WebApp for development
function createMockTelegramWebApp() {
    return {
        initDataUnsafe: {
            user: {
                id: Math.floor(Math.random() * 1000000000),
                first_name: "Test",
                last_name: "User", 
                username: "testuser",
                language_code: "en"
            }
        },
        expand: function() {
            console.log("Telegram WebApp: expand() called");
        },
        enableClosingConfirmation: function() {
            console.log("Telegram WebApp: enableClosingConfirmation() called");
        },
        showPopup: function(params) {
            console.log("Telegram WebApp: showPopup() called with", params);
            alert(params.title + "\n\n" + params.message);
        },
        showAlert: function(message) {
            alert(message);
        },
        showConfirm: function(message, callback) {
            const result = confirm(message);
            if (callback) callback(result);
        }
    };
}

// Enhanced navigation system
function navigateTo(view, data = null) {
    viewHistory.push({ view: currentView, data: data });
    currentView = view;
    
    switch(view) {
        case 'feed':
            loadPosts(); // FIX: Call loadPosts which will then call showPosts
            break;
        case 'editor':
            showPostEditor();
            break;
        case 'trending':
            showTrending();
            break;
        case 'following':
            showFollowing();
            break;
        case 'profile':
            showProfile();
            break;
        default:
            loadPosts();
    }
}

// Go back to previous view
function goBack() {
    if (viewHistory.length > 0) {
        const previous = viewHistory.pop();
        currentView = previous.view;
        navigateTo(previous.view, previous.data);
    } else {
        navigateTo('feed');
    }
}

// Check authentication status
function checkAuth() {
    updateUI('loading', 'Checking authentication...');
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const telegramUser = tg.initDataUnsafe.user;
        authenticateUser(telegramUser);
    } else {
        showLogin();
    }
}

// Authenticate user with Supabase integration
async function authenticateUser(telegramUser) {
    updateUI('loading', 'Logging in...');
    
    try {
        // Check if user exists in database using the helper
        let user = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
        
        // If user doesn't exist, create them using the helper
        if (!user) {
            user = await window.SupabaseClient.createUser(telegramUser);
        }
        
        if (user) {
            currentUser = user;
            updateUserInfo();
            navigateTo('feed'); // FIX: Use navigateTo instead of direct loadPosts
        } else {
            showLogin();
            showNotification("Failed to authenticate. Please try again.", 'error');
        }
    } catch (error) {
        console.error("Authentication error:", error);
        showLogin();
        showNotification("Authentication error. Please try again.", 'error');
    }
}

// Update user info in the header
function updateUserInfo() {
    if (currentUser) {
        const userInfoEl = document.getElementById('user-info');
        const avatarEl = userInfoEl.querySelector('.avatar');
        
        avatarEl.textContent = currentUser.first_name ? 
            currentUser.first_name.charAt(0).toUpperCase() : 'U';
        
        const name = currentUser.first_name || currentUser.username;
        userInfoEl.querySelector('span').textContent = name;
    }
}

// Load posts from Supabase
async function loadPosts() {
    updateUI('loading', 'Loading posts...');
    
    try {
        // Use the helper to get posts
        posts = await window.SupabaseClient.getPublishedPosts();
        console.log("Posts loaded from Supabase:", posts); // DEBUG
        
        if (posts && posts.length > 0) {
            showPosts(); // FIX: Call showPosts after loading
        } else {
            // Show empty state if no posts
            showEmptyState();
        }
    } catch (error) {
        console.error("Error loading posts:", error);
        updateUI('error', 'Failed to load posts. Please try again.');
        showNotification('Failed to load posts. Please check your connection.', 'error');
    }
}

// Display posts in the feed
function showPosts() {
    const pageContent = document.getElementById('page-content');
    
    const menuHtml = generateMenu();
    
    let postsHtml = '<div class="feed">';
    
    if (posts && posts.length > 0) {
        posts.forEach(post => {
            const authorName = post.user ? 
                `${post.user.first_name || ''} ${post.user.last_name || ''}`.trim() : 
                (post.author || 'Unknown Author');
                
            postsHtml += `
                <div class="post-card">
                    ${post.image ? '<div class="post-image">Post Image</div>' : ''}
                    <div class="post-content">
                        <h3 class="post-title">${post.title}</h3>
                        <p class="post-excerpt">${post.excerpt || 'No excerpt available'}</p>
                        <div class="post-meta">
                            <div>
                                <span>By ${authorName}</span>
                                <span> • ${formatDate(post.published_at || post.created_at)}</span>
                            </div>
                            <div>
                                ${post.tags && post.tags.length > 0 ? 
                                    post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('') : 
                                    '<span class="tag">#general</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        postsHtml += `
            <div class="empty-state">
                <h3>No posts found</h3>
                <p>Be the first to create a post!</p>
            </div>
        `;
    }
    
    postsHtml += '</div>';
    pageContent.innerHTML = menuHtml + postsHtml;
}

// Enhanced menu generation
function generateMenu() {
    return `
        <div class="menu">
            <button class="menu-btn ${currentView === 'feed' ? 'active' : ''}" onclick="navigateTo('feed')">
                📝 For You
            </button>
            <button class="menu-btn ${currentView === 'trending' ? 'active' : ''}" onclick="navigateTo('trending')">
                🔥 Trending
            </button>
            <button class="menu-btn ${currentView === 'following' ? 'active' : ''}" onclick="navigateTo('following')">
                👥 Following
            </button>
            <button class="menu-btn ${currentView === 'editor' ? 'active' : ''}" onclick="navigateTo('editor')">
                ✍️ Create Post
            </button>
        </div>
    `;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString;
    }
}

// Show empty state when no posts are available
function showEmptyState() {
    const pageContent = document.getElementById('page-content');
    
    pageContent.innerHTML = `
        <div class="empty-state">
            <h3>No posts yet</h3>
            <p>Be the first to create a post on TeleBlog!</p>
            <button class="btn" onclick="navigateTo('editor')">Create First Post</button>
        </div>
    `;
}

// Show login prompt
function showLogin() {
    const pageContent = document.getElementById('page-content');
    
    pageContent.innerHTML = `
        <div class="login-prompt">
            <h2>Welcome to TeleBlog Official</h2>
            <p>Please open this app through Telegram to start reading and creating blog posts.</p>
            <p>If you're seeing this message in Telegram, try refreshing the app.</p>
            <div class="dev-note">
                <p><strong>Development Note:</strong> Since you're running this locally, we've simulated a user account for development purposes.</p>
                <button class="btn" onclick="simulateTelegramUser()">Simulate As A Telegram User</button>
            </div>
        </div>
    `;
}

// Simulate a Telegram user for development
function simulateTelegramUser() {
    if (!tg) return;
    
    tg.initDataUnsafe = {
        user: {
            id: Math.floor(Math.random() * 1000000000),
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            language_code: "en"
        }
    };
    checkAuth();
}

// Update UI state
function updateUI(state, message) {
    const pageContent = document.getElementById('page-content');
    
    if (state === 'loading') {
        pageContent.innerHTML = `
            <div class="loading">
                <p>${message}</p>
            </div>
        `;
    } else if (state === 'error') {
        pageContent.innerHTML = `
            <div class="error-state">
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

// Initialize ads
function initAds() {
    console.log("Initializing ads...");
    simulateAd();
}

// Simulate ad display
function simulateAd() {
    const adContainer = document.getElementById('ad-container');
    
    if (!adContainer) return;
    
    adContainer.innerHTML = `
        <div style="text-align: center;">
            <h3>Special Offer</h3>
            <p>Upgrade to TeleBlog Pro for an ad-free experience!</p>
            <button class="btn" onclick="tg.showPopup({title: 'Premium Feature', message: 'This would open a premium subscription dialog in production.'})">Learn More</button>
        </div>
    `;
}

// Show trending posts
function showTrending() {
    updateUI('loading', 'Loading trending posts...');
    
    setTimeout(() => {
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = generateMenu() + `
            <div class="loading">
                <p>Trending content will be displayed here.</p>
                <p>This feature requires backend implementation.</p>
            </div>
        `;
    }, 1000);
}

// Show posts from followed accounts
function showFollowing() {
    updateUI('loading', 'Loading followed content...');
    
    setTimeout(() => {
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = generateMenu() + `
            <div class="loading">
                <p>Content from accounts you follow will be displayed here.</p>
                <p>This feature requires backend implementation.</p>
            </div>
        `;
    }, 1000);
}

// Show profile view (placeholder)
function showProfile() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = generateMenu() + `
        <div class="loading">
            <p>User profile will be displayed here.</p>
            <p>This feature requires backend implementation.</p>
        </div>
    `;
}

// Enhanced post editor interface with navigation
function showPostEditor() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="editor-container">
            <div class="editor-header">
                <button class="btn-back" onclick="goBack()">← Back</button>
                <h2>Create New Post</h2>
            </div>
            <input type="text" id="post-title" placeholder="Post Title" class="editor-input">
            <textarea id="post-content" placeholder="Write your content here..." class="editor-textarea"></textarea>
            <input type="text" id="post-tags" placeholder="Tags (comma separated)" class="editor-input">
            <div class="editor-actions">
                <button class="btn btn-secondary" onclick="saveDraft()">Save Draft</button>
                <button class="btn btn-primary" onclick="savePost()">Publish Post</button>
            </div>
        </div>
    `;
    
    // Store current content in case user navigates away accidentally
    storeDraftContent();
}

// Store draft content temporarily
function storeDraftContent() {
    const title = document.getElementById('post-title')?.value || '';
    const content = document.getElementById('post-content')?.value || '';
    const tags = document.getElementById('post-tags')?.value || '';
    
    sessionStorage.setItem('postDraft', JSON.stringify({
        title,
        content,
        tags,
        timestamp: new Date().getTime()
    }));
}

// Restore draft content if available
function restoreDraftContent() {
    const draft = sessionStorage.getItem('postDraft');
    if (draft) {
        const { title, content, tags, timestamp } = JSON.parse(draft);
        
        // Only restore if draft is recent (last 30 minutes)
        if (new Date().getTime() - timestamp < 30 * 60 * 1000) {
            if (document.getElementById('post-title')) {
                document.getElementById('post-title').value = title;
            }
            if (document.getElementById('post-content')) {
                document.getElementById('post-content').value = content;
            }
            if (document.getElementById('post-tags')) {
                document.getElementById('post-tags').value = tags;
            }
        }
    }
}

// Clear draft content
function clearDraft() {
    sessionStorage.removeItem('postDraft');
    if (currentView === 'editor') {
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        document.getElementById('post-tags').value = '';
    }
}

// Confirm before leaving editor
function setupEditorLeaveConfirmation() {
    window.addEventListener('beforeunload', function (e) {
        const title = document.getElementById('post-title')?.value || '';
        const content = document.getElementById('post-content')?.value || '';
        
        if (currentView === 'editor' && (title.trim() || content.trim())) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
}

// Enhanced save post function with notifications
async function savePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const tags = document.getElementById('post-tags').value.split(',').map(tag => tag.trim());
    
    if (!title || !content) {
        showNotification('Please add a title and content to your post.', 'error');
        return;
    }
    
    showNotification('Publishing your post...', 'loading');
    
    try {
        const supabase = window.SupabaseClient.getClient();
        const telegramUser = tg.initDataUnsafe.user;
        const user = await window.SupabaseClient.createUser(telegramUser);
        
        const { data, error } = await supabase
            .from('posts')
            .insert({
                title: title,
                content: content,
                excerpt: content.substring(0, 150) + '...',
                tags: tags,
                user_id: user.id,
                is_published: true,
                published_at: new Date().toISOString()
            })
            .select();
            
        if (error) throw error;
        
        clearDraft();
        showNotification('Post published successfully!', 'success');
        
        // Reload posts to include the new one
        await loadPosts();
        
    } catch (error) {
        console.error('Error saving post:', error);
        showNotification('Could not publish post. Please try again.', 'error');
    }
}

// Enhanced save as draft function
async function saveDraft() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const tags = document.getElementById('post-tags').value.split(',').map(tag => tag.trim());
    
    try {
        const supabase = window.SupabaseClient.getClient();
        const telegramUser = tg.initDataUnsafe.user;
        const user = await window.SupabaseClient.createUser(telegramUser);
        
        const { data, error } = await supabase
            .from('posts')
            .insert({
                title: title,
                content: content,
                excerpt: content.substring(0, 150) + '...',
                tags: tags,
                user_id: user.id,
                is_published: false, // Save as draft
                created_at: new Date().toISOString()
            })
            .select();
            
        if (error) throw error;
        
        showNotification('Draft saved successfully!', 'success');
        navigateTo('feed');
        
    } catch (error) {
        console.error('Error saving draft:', error);
        showNotification('Could not save draft. Please try again.', 'error');
    }
}

// Show notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Debug function to test database connection
async function debugDatabase() {
    try {
        console.log("Testing database connection...");
        
        const supabase = window.SupabaseClient.getClient();
        const telegramUser = tg.initDataUnsafe.user;
        const user = await window.SupabaseClient.createUser(telegramUser);
        
        console.log("User:", user);
        
        // Test simple select query
        const { data: testData, error: testError } = await supabase
            .from('posts')
            .select('*')
            .limit(5);
            
        console.log("Test query result:", testData, testError);
        
        return testData;
        
    } catch (error) {
        console.error("Debug error:", error);
        return null;
    }
}

// Menu navigation functions
function setActiveMenu(menuItem) {
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked item
    if (menuItem) {
        menuItem.classList.add('active');
    }
}

// Update navigateTo function to handle menu activation
function navigateTo(view, data = null) {
    viewHistory.push({ view: currentView, data: data });
    currentView = view;
    
    // Update menu active state
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    switch(view) {
        case 'feed':
            document.querySelector('.menu-item:nth-child(1)').classList.add('active');
            loadPosts();
            break;
        case 'editor':
            // No direct menu item for editor
            showPostEditor();
            break;
        case 'profile':
            document.querySelector('.menu-item:nth-child(4)').classList.add('active');
            showProfile();
            break;
        default:
            loadPosts();
    }
}

// Save function for the SAVE menu item
function savePost() {
    if (currentView === 'editor') {
        // If we're in the editor, save the current post
        const title = document.getElementById('post-title')?.value;
        const content = document.getElementById('post-content')?.value;
        
        if (title && content) {
            saveDraft();
            showNotification('Post saved successfully!', 'success');
        } else {
            showNotification('Please add title and content before saving', 'error');
        }
    } else {
        // If we're not in the editor, navigate to it
        navigateTo('editor');
    }
}

// Search function
function openSearch() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="editor-container">
            <div class="editor-header">
                <h2>Search Posts</h2>
            </div>
            <input type="text" id="search-input" placeholder="Search for posts..." class="editor-input">
            <button class="btn btn-primary" onclick="performSearch()">Search</button>
            <div id="search-results" style="margin-top: 20px;"></div>
        </div>
    `;
}

// Perform search function
async function performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        showNotification('Please enter a search term', 'error');
        return;
    }
    
    showNotification('Searching...', 'loading');
    
    try {
        // This would search in your Supabase database
        const supabase = window.SupabaseClient.getClient();
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .ilike('title', `%${query}%`)
            .eq('is_published', true);
            
        if (error) throw error;
        
        const resultsContainer = document.getElementById('search-results');
        
        if (data && data.length > 0) {
            let resultsHtml = '<div class="feed">';
            data.forEach(post => {
                resultsHtml += `
                    <div class="post-card">
                        <div class="post-content">
                            <h3 class="post-title">${post.title}</h3>
                            <p class="post-excerpt">${post.excerpt || 'No excerpt available'}</p>
                            <div class="post-meta">
                                <div>
                                    <span>By ${post.author || 'Unknown'}</span>
                                    <span> • ${formatDate(post.published_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            resultsHtml += '</div>';
            resultsContainer.innerHTML = resultsHtml;
        } else {
            resultsContainer.innerHTML = '<p>No results found</p>';
        }
        
        showNotification('Search completed', 'success');
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
    }
}

// Make functions available globally
window.navigateTo = navigateTo;
window.goBack = goBack;
window.showTrending = showTrending;
window.showFollowing = showFollowing;
window.showPosts = showPosts;
window.showPostEditor = showPostEditor;
window.showProfile = showProfile;
window.savePost = savePost;
window.saveDraft = saveDraft;
window.simulateTelegramUser = simulateTelegramUser;
window.debugDatabase = debugDatabase;
window.loadPosts = loadPosts; // FIX: Expose loadPosts for debugging
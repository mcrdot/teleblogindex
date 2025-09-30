// 3bd959cb-628a-4deb-ba9b-ed609025f9aa
// ------------------------------------
// app.js - TeleBlog Application with Supabase Integration
// Enhanced with proper error handling and connection management

// Global state
let tg;
let currentUser = null;
let posts = [];
let currentView = 'feed';
let viewHistory = [];
let isAppInitialized = false;
let supabaseConnected = false;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting app initialization');
    initializeApp();
});

async function initializeApp() {
    if (isAppInitialized) return;
    
    try {
        console.log('Step 1: Initializing Telegram WebApp...');
        await initializeTelegramWebApp();
        
        console.log('Step 2: Initializing Supabase...');
        supabaseConnected = await initializeSupabase();
        
        console.log('Step 3: Checking authentication...');
        await checkAuth();
        
        console.log('Step 4: Setting up UI...');
        setupEditorLeaveConfirmation();
        restoreDraftContent();
        
        isAppInitialized = true;
        
        if (supabaseConnected) {
            console.log('✅ App initialization completed - Supabase connected');
            showNotification('App ready! Connected to database.', 'success');
        } else {
            console.log('⚠️ App initialization completed - Using mock data');
            showNotification('App ready! (Using demo data)', 'info');
        }
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showNotification('Failed to initialize app. Please refresh.', 'error');
    }
}

// Initialize Telegram Web App with version compatibility
function initializeTelegramWebApp() {
    return new Promise((resolve) => {
        const isLocal = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';
        
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            // Production - Real Telegram environment
            tg = Telegram.WebApp;
            safelyInitializeTelegram();
            console.log("✅ Production: Using real Telegram WebApp");
            resolve();
        } else if (isLocal) {
            // Development - Local environment with mock
            tg = createMockTelegramWebApp();
            console.log("✅ Development: Using mock Telegram WebApp");
            resolve();
        } else {
            // Wait for Telegram to load (for production)
            console.log("⏳ Waiting for Telegram WebApp to load...");
            const checkTelegram = setInterval(() => {
                if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
                    clearInterval(checkTelegram);
                    tg = Telegram.WebApp;
                    safelyInitializeTelegram();
                    console.log("✅ Telegram WebApp loaded after wait");
                    resolve();
                }
            }, 100);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                clearInterval(checkTelegram);
                console.warn("⚠️ Telegram WebApp not available, using fallback");
                tg = createMockTelegramWebApp();
                resolve();
            }, 3000);
        }
    });
}

// Safe Telegram initialization that handles version differences
function safelyInitializeTelegram() {
    try {
        // Always safe to call
        if (tg.expand) tg.expand();
        
        // Only call if supported (avoid version warnings)
        if (tg.enableClosingConfirmation) {
            try {
                tg.enableClosingConfirmation();
            } catch (e) {
                console.log('enableClosingConfirmation not supported in this Telegram version');
            }
        }
        
        // Only call setBackgroundColor if supported
        if (tg.setBackgroundColor) {
            try {
                tg.setBackgroundColor('#121212');
            } catch (e) {
                console.log('setBackgroundColor not supported in this Telegram version');
            }
        }
        
        // Only call setHeaderColor if supported
        if (tg.setHeaderColor) {
            try {
                tg.setHeaderColor('#1e1e1e');
            } catch (e) {
                console.log('setHeaderColor not supported in this Telegram version');
            }
        }
        
        console.log('Telegram WebApp safely initialized');
        console.log('Init Data:', tg.initData);
        console.log('Platform:', tg.platform);
        console.log('Version:', tg.version);
        
    } catch (error) {
        console.warn('Telegram initialization had minor issues:', error);
    }
}

// Initialize Supabase client with connection testing
async function initializeSupabase() {
    if (!window.SupabaseClient) {
        console.error('❌ SupabaseClient not available');
        return false;
    }
    
    const client = window.SupabaseClient.init();
    if (!client) {
        console.error('❌ Failed to initialize Supabase client');
        return false;
    }
    
    // Test connection
    try {
        const isConnected = await window.SupabaseClient.testConnection();
        if (isConnected) {
            console.log('✅ Supabase connection successful');
            return true;
        } else {
            console.warn('⚠️ Supabase connection failed, using mock data');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Supabase connection test error:', error.message);
        return false;
    }
}

// Create mock Telegram WebApp for development
function createMockTelegramWebApp() {
    const mockUser = {
        id: Math.floor(Math.random() * 1000000000),
        first_name: "Test",
        last_name: "User", 
        username: "testuser",
        language_code: "en"
    };
    
    return {
        initDataUnsafe: {
            user: mockUser
        },
        initData: JSON.stringify({user: mockUser}),
        platform: "web",
        version: "7.0",
        expand: function() {
            console.log("Telegram WebApp: expand() called");
        },
        enableClosingConfirmation: function() {
            console.log("Telegram WebApp: enableClosingConfirmation() called");
        },
        setBackgroundColor: function(color) {
            console.log("Telegram WebApp: setBackgroundColor() called with", color);
        },
        setHeaderColor: function(color) {
            console.log("Telegram WebApp: setHeaderColor() called with", color);
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

// Navigate to different views
function navigateTo(view, data = null) {
    console.log('Navigating to:', view);
    viewHistory.push({ view: currentView, data: data });
    currentView = view;
    
    switch(view) {
        case 'feed':
            loadPosts();
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
async function checkAuth() {
    updateUI('loading', 'Checking authentication...');
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const telegramUser = tg.initDataUnsafe.user;
        console.log('Telegram user detected:', telegramUser);
        await authenticateUser(telegramUser);
    } else {
        console.log('No Telegram user found, showing login');
        showLogin();
    }
}

// Authenticate user with Supabase integration
async function authenticateUser(telegramUser) {
    updateUI('loading', 'Logging in...');
    console.log('Authenticating user:', telegramUser.id);
    
    try {
        let user = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
        console.log('User lookup result:', user);
        
        if (!user) {
            console.log('Creating new user...');
            user = await window.SupabaseClient.createUser(telegramUser);
        }
        
        if (user) {
            currentUser = user;
            console.log('User authenticated:', currentUser);
            updateUserInfo();
            navigateTo('feed'); 
        } else {
            console.error('User authentication failed');
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
        
        const name = currentUser.first_name || currentUser.username || 'User';
        userInfoEl.querySelector('span').textContent = name;
        
        console.log('User info updated:', name);
    }
}

// Load posts from Supabase
async function loadPosts() {
    console.log('Loading posts...');
    updateUI('loading', 'Loading posts...');
    
    try {
        posts = await window.SupabaseClient.getPublishedPosts();
        console.log("Posts loaded:", posts);
        
        if (posts && posts.length > 0) {
            console.log(`Displaying ${posts.length} posts`);
            showPosts();
        } else {
            console.log('No posts found, showing empty state');
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
    
    // Add connection status indicator
    if (!supabaseConnected) {
        postsHtml += `
            <div class="connection-warning">
                <span>🔧 Development Mode</span>
                <p>Using demo data. Real posts will appear when Supabase is connected.</p>
            </div>
        `;
    }
    
    if (posts && posts.length > 0) {
        posts.forEach((post, index) => {
            const authorName = post.user ? 
                `${post.user.first_name || ''} ${post.user.last_name || ''}`.trim() : 
                (post.author || 'Unknown Author');
                
            // Add mock indicator for demo posts
            const isMockPost = post.id && post.id.startsWith('mock-');
            const mockBadge = isMockPost ? '<span class="mock-badge">Demo</span>' : '';
                
            postsHtml += `
                <div class="post-card" data-post-id="${post.id}">
                    ${mockBadge}
                    ${post.image ? '<div class="post-image">📷 Post Image</div>' : ''}
                    <div class="post-content">
                        <h3 class="post-title">${post.title || 'Untitled'}</h3>
                        <p class="post-excerpt">${post.excerpt || 'No excerpt available'}</p>
                        <div class="post-meta">
                            <div>
                                <span>By ${authorName}</span>
                                <span> • ${formatDate(post.published_at || post.created_at)}</span>
                            </div>
                            <div class="post-tags">
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
    console.log('Posts displayed in UI');
}

// Generate menu
function generateMenu() {
    return `
        <div class="menu">
            <button class="menu-btn ${currentView === 'feed' ? 'active' : ''}" onclick="navigateTo('feed')">📝 For You</button>
            <button class="menu-btn ${currentView === 'trending' ? 'active' : ''}" onclick="navigateTo('trending')">🔥 Trending</button>
            <button class="menu-btn ${currentView === 'following' ? 'active' : ''}" onclick="navigateTo('following')">👥 Following</button>
            <button class="menu-btn ${currentView === 'editor' ? 'active' : ''}" onclick="navigateTo('editor')">✍️ Create Post</button>
        </div>
    `;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return dateString;
    }
}

// Save post to Supabase
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
        // Check if we have Supabase connection
        if (!supabaseConnected) {
            showNotification('Cannot publish - Database not connected. Please check Supabase configuration.', 'error');
            return;
        }
        
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
        await loadPosts();
        
    } catch (error) {
        console.error('Error saving post:', error);
        showNotification('Could not publish post. Please try again.', 'error');
    }
}

// UI Helper functions
function updateUI(state, message = '') {
    const pageContent = document.getElementById('page-content');
    
    switch(state) {
        case 'loading':
            pageContent.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            break;
        case 'error':
            pageContent.innerHTML = `
                <div class="error-state">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
            break;
    }
}

function showEmptyState() {
    const pageContent = document.getElementById('page-content');
    const menuHtml = generateMenu();
    
    pageContent.innerHTML = menuHtml + `
        <div class="empty-state">
            <h3>No posts yet</h3>
            <p>Be the first to create a post in this community!</p>
            <button onclick="navigateTo('editor')" class="btn">Create First Post</button>
        </div>
    `;
}

function showLogin() {
    updateUI('error', 'Please open this app in Telegram to authenticate.');
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Post editor functions
function showPostEditor() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="editor-container">
            <div class="editor-header">
                <button onclick="goBack()" class="btn btn-back">← Back</button>
                <h2>Create New Post</h2>
                <button onclick="savePost()" class="btn btn-primary">Publish</button>
            </div>
            <div class="editor-form">
                <input type="text" id="post-title" class="post-title-input" placeholder="Post Title">
                <textarea id="post-content" class="post-content-input" placeholder="Write your post content here..."></textarea>
                <input type="text" id="post-tags" class="post-tags-input" placeholder="Tags (comma separated)">
            </div>
        </div>
    `;
}

function setupEditorLeaveConfirmation() {
    // Implementation for draft saving
    window.addEventListener('beforeunload', function (e) {
        const title = document.getElementById('post-title')?.value;
        const content = document.getElementById('post-content')?.value;
        
        if (title || content) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
}

function restoreDraftContent() {
    // Implementation for draft restoration
    try {
        const draft = localStorage.getItem('teleblog_draft');
        if (draft) {
            const { title, content, tags } = JSON.parse(draft);
            // Will be applied when editor is opened
            localStorage.setItem('teleblog_draft_restore', JSON.stringify({ title, content, tags }));
        }
    } catch (error) {
        console.log('No draft to restore');
    }
}

function clearDraft() {
    // Implementation for clearing drafts
    localStorage.removeItem('teleblog_draft');
    localStorage.removeItem('teleblog_draft_restore');
}

// Placeholder functions for other views
function showTrending() {
    updateUI('loading', 'Loading trending posts...');
    setTimeout(() => {
        updateUI('error', 'Trending feature coming soon!');
    }, 1000);
}

function showFollowing() {
    updateUI('loading', 'Loading followed posts...');
    setTimeout(() => {
        updateUI('error', 'Following feature coming soon!');
    }, 1000);
}

function showProfile() {
    updateUI('loading', 'Loading profile...');
    setTimeout(() => {
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <button onclick="goBack()" class="btn btn-back">← Back</button>
                    <h2>Your Profile</h2>
                </div>
                <div class="profile-content">
                    <div class="profile-info">
                        <div class="profile-avatar">${currentUser?.first_name?.charAt(0) || 'U'}</div>
                        <h3>${currentUser?.first_name || 'User'} ${currentUser?.last_name || ''}</h3>
                        <p>@${currentUser?.username || 'no-username'}</p>
                    </div>
                    <div class="profile-stats">
                        <div class="stat">
                            <strong>0</strong>
                            <span>Posts</span>
                        </div>
                        <div class="stat">
                            <strong>0</strong>
                            <span>Followers</span>
                        </div>
                        <div class="stat">
                            <strong>0</strong>
                            <span>Following</span>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn" onclick="showNotification('Edit profile coming soon!', 'info')">Edit Profile</button>
                        <button class="btn" onclick="showNotification('Settings coming soon!', 'info')">Settings</button>
                    </div>
                </div>
            </div>
        `;
    }, 1000);
}

// Add CSS for new elements
const additionalCSS = `
    .loading-state {
        text-align: center;
        padding: 2rem;
    }
    .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 300px;
    }
    .notification-success { background: #28a745; }
    .notification-error { background: #dc3545; }
    .notification-loading { background: #17a2b8; }
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
    }
    .editor-container {
        padding: 1rem;
    }
    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .post-title-input {
        width: 100%;
        padding: 1rem;
        font-size: 1.5rem;
        border: none;
        border-bottom: 2px solid #333;
        margin-bottom: 1rem;
        background: transparent;
        color: inherit;
    }
    .post-content-input {
        width: 100%;
        height: 300px;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        resize: vertical;
    }
    .post-tags-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        margin-top: 1rem;
    }
    .connection-warning {
        background: #fff3cd;
        color: #856404;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border: 1px solid #ffeaa7;
    }
    .connection-warning span {
        font-weight: bold;
    }
    .mock-badge {
        background: #6c757d;
        color: white;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
    }
    .post-card {
        position: relative;
    }
    .profile-container {
        padding: 1rem;
    }
    .profile-header {
        display: flex;
        align-items: center;
        margin-bottom: 2rem;
    }
    .profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #007bff;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: bold;
        margin: 0 auto 1rem;
    }
    .profile-info {
        text-align: center;
        margin-bottom: 2rem;
    }
    .profile-stats {
        display: flex;
        justify-content: space-around;
        margin-bottom: 2rem;
    }
    .stat {
        text-align: center;
    }
    .stat strong {
        display: block;
        font-size: 1.5rem;
    }
    .profile-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Make functions globally available for HTML onclick handlers
window.navigateTo = navigateTo;
window.goBack = goBack;
window.savePost = savePost;
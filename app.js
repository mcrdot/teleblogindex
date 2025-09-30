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

// ✅ FIX: Keep only one navigateTo function
function navigateTo(view, data = null) {
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
        let user = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
        
        if (!user) {
            user = await window.SupabaseClient.createUser(telegramUser);
        }
        
        if (user) {
            currentUser = user;
            updateUserInfo();
            navigateTo('feed'); 
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
        posts = await window.SupabaseClient.getPublishedPosts();
        console.log("Posts loaded from Supabase:", posts); // DEBUG
        
        if (posts && posts.length > 0) {
            showPosts();
        } else {
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

// ✅ FIX: Menu uses menu-btn not menu-item
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

// ✅ FIX: keep only this savePost (async insert to Supabase)
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
        await loadPosts();
        
    } catch (error) {
        console.error('Error saving post:', error);
        showNotification('Could not publish post. Please try again.', 'error');
    }
}

// ✅ rest of your code remains same (draft, editor, ads, search, etc.)
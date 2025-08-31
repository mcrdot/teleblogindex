// app.js - TeleBlog Application with Supabase Integration
// Environment-aware Telegram Web App initialization with database support

// Global state
let tg;
let currentUser = null;
let posts = [];

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
            loadPosts();
        } else {
            showLogin();
            if (tg.showAlert) {
                tg.showAlert("Failed to authenticate. Please try again.");
            } else {
                alert("Failed to authenticate. Please try again.");
            }
        }
    } catch (error) {
        console.error("Authentication error:", error);
        showLogin();
        if (tg.showAlert) {
            tg.showAlert("Authentication error. Please try again.");
        } else {
            alert("Authentication error. Please try again.");
        }
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
        
        if (posts && posts.length > 0) {
            showPosts();
        } else {
            // Show empty state if no posts
            showEmptyState();
        }
    } catch (error) {
        console.error("Error loading posts:", error);
        updateUI('error', 'Failed to load posts. Please try again.');
    }
}

// Display posts in the feed
function showPosts() {
    const pageContent = document.getElementById('page-content');
    
    // const menuHtml = `
    //     <div class="menu">
    //         <button class="menu-btn active" onclick="showPosts()">For You</button>
    //         <button class="menu-btn" onclick="showTrending()">Trending</button>
    //         <button class="menu-btn" onclick="showFollowing()">Following</button>
    //     </div>
    // `;
    // In your showPosts function, update the menu HTML:
const menuHtml = `
    <div class="menu">
        <button class="menu-btn active" onclick="showPosts()">For You</button>
        <button class="menu-btn" onclick="showTrending()">Trending</button>
        <button class="menu-btn" onclick="showFollowing()">Following</button>
        <button class="menu-btn" onclick="showPostEditor()">Create Post</button>
    </div>
`;
    
    let postsHtml = '<div class="feed">';
    
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
                            <span> • ${formatDate(post.published_at || post.date)}</span>
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
    
    postsHtml += '</div>';
    pageContent.innerHTML = menuHtml + postsHtml;
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
            <button class="btn" onclick="tg.showAlert('Post creation will be available soon!')">Create First Post</button>
        </div>
    `;
}

// Show login prompt
function showLogin() {
    const pageContent = document.getElementById('page-content');
    
    pageContent.innerHTML = `
        <div class="login-prompt">
            <h2>Welcome to TeleBlog</h2>
            <p>Please open this app through Telegram to start reading and creating blog posts.</p>
            <p>If you're seeing this message in Telegram, try refreshing the app.</p>
            <div class="dev-note">
                <p><strong>Development Note:</strong> Since you're running this locally, we've simulated a user account for development purposes.</p>
                <button class="btn" onclick="simulateTelegramUser()">Simulate Telegram User</button>
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
        pageContent.innerHTML = `
            <div class="menu">
                <button class="menu-btn" onclick="showPosts()">For You</button>
                <button class="menu-btn active" onclick="showTrending()">Trending</button>
                <button class="menu-btn" onclick="showFollowing()">Following</button>
            </div>
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
        pageContent.innerHTML = `
            <div class="menu">
                <button class="menu-btn" onclick="showPosts()">For You</button>
                <button class="menu-btn" onclick="showTrending()">Trending</button>
                <button class="menu-btn active" onclick="showFollowing()">Following</button>
            </div>
            <div class="loading">
                <p>Content from accounts you follow will be displayed here.</p>
                <p>This feature requires backend implementation.</p>
            </div>
        `;
    }, 1000);
}

// Add post creation function
function showPostEditor() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="editor-container">
            <h2>Create New Post</h2>
            <input type="text" id="post-title" placeholder="Post Title" class="editor-input">
            <textarea id="post-content" placeholder="Write your content here..." class="editor-textarea"></textarea>
            <input type="text" id="post-tags" placeholder="Tags (comma separated)" class="editor-input">
            <div class="editor-actions">
                <button class="btn btn-primary" onclick="savePost()">Publish Post</button>
                <button class="btn btn-secondary" onclick="saveDraft()">Save Draft</button>
            </div>
        </div>
    `;
}

// Add to your menu
function addEditorButton() {
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.innerHTML += `<button class="menu-btn" onclick="showPostEditor()">Create Post</button>`;
    }
}

async function savePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const tags = document.getElementById('post-tags').value.split(',').map(tag => tag.trim());
    
    if (!title || !content) {
        alert('Please add a title and content');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('posts')
            .insert({
                title: title,
                content: content,
                excerpt: content.substring(0, 150) + '...',
                tags: tags,
                user_id: currentUser.id,
                is_published: true,
                published_at: new Date().toISOString()
            });
            
        if (error) throw error;
        
        alert('Post published successfully!');
        loadPosts(); // Reload the posts feed
        
    } catch (error) {
        console.error('Error saving post:', error);
        alert('Error publishing post. Please try again.');
    }
}

async function saveDraft() {
    // Similar to savePost but with is_published: false
}

// Make functions available globally
window.showTrending = showTrending;
window.showFollowing = showFollowing;
window.showPosts = showPosts;
window.simulateTelegramUser = simulateTelegramUser;
// 32c40404-569a-4c38-bea8-736e3865910e
// app.js - TeleBlog Application with User Type System
// Enhanced with user type classification and tailored features

// Global state
let tg;
let currentUser = null;
let posts = [];
let currentView = 'feed';
let viewHistory = [];
let isAppInitialized = false;
let supabaseConnected = false;
let userTypeSelected = false;

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
        
        // Initialize bottom navigation state
        updateNavigationState();
        
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

// Update navigation state for bottom nav
function updateNavigationState() {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current view
    const navItems = document.querySelectorAll('.nav-item');
    switch(currentView) {
        case 'feed':
            if (navItems[0]) navItems[0].classList.add('active');
            break;
        case 'editor':
            if (navItems[1]) navItems[1].classList.add('active');
            break;
        case 'profile':
            if (navItems[2]) navItems[2].classList.add('active');
            break;
    }
}

// Navigate to different views
function navigateTo(view, data = null) {
    console.log('Navigating to:', view);
    viewHistory.push({ view: currentView, data: data });
    currentView = view;
    
    // Update navigation state
    updateNavigationState();
    
    switch(view) {
        case 'feed':
            loadPosts();
            break;
        case 'editor':
            showPostEditor();
            break;
        case 'profile':
            showProfile();
            break;
        case 'user-type-selection':
            showUserTypeSelection();
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
            
            // Check if user needs to select user type
            if (!currentUser.user_type || currentUser.user_type === 'general') {
                navigateTo('user-type-selection');
            } else {
                navigateTo('feed');
            }
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

// Show user type selection screen
function showUserTypeSelection() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="onboarding-container">
            <h2>Choose Your Profile Type</h2>
            <p>Select how you'll use TeleBlog to unlock relevant features</p>
            
            <div class="user-type-options">
                <div class="user-type-card" onclick="selectUserType('general')">
                    <div class="type-icon">👤</div>
                    <h3>General User</h3>
                    <p>Share personal stories, opinions, and casual content</p>
                    <ul>
                        <li>Basic post formatting</li>
                        <li>Personal tags</li>
                        <li>Community engagement</li>
                    </ul>
                </div>
                
                <div class="user-type-card" onclick="selectUserType('group_owner')">
                    <div class="type-icon">👥</div>
                    <h3>Group Owner</h3>
                    <p>Manage community content and announcements</p>
                    <ul>
                        <li>Group linking</li>
                        <li>Announcement tags</li>
                        <li>Member targeting</li>
                        <li>Event promotions</li>
                    </ul>
                </div>
                
                <div class="user-type-card" onclick="selectUserType('channel_owner')">
                    <div class="type-icon">📢</div>
                    <h3>Channel Owner</h3>
                    <p>Professional content creation and broadcasting</p>
                    <ul>
                        <li>Advanced formatting</li>
                        <li>Post scheduling</li>
                        <li>Basic analytics</li>
                        <li>Premium tags</li>
                    </ul>
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="saveUserType()" disabled id="continue-btn">
                Continue to TeleBlog
            </button>
        </div>
    `;
}

// Select user type
function selectUserType(userType) {
    // Remove selected class from all cards
    document.querySelectorAll('.user-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    event.currentTarget.classList.add('selected');
    
    // Enable continue button
    document.getElementById('continue-btn').disabled = false;
    
    // Store selected type
    window.selectedUserType = userType;
}

// Save user type to database
async function saveUserType() {
    if (!window.selectedUserType) {
        showNotification('Please select a user type first.', 'error');
        return;
    }
    
    showNotification('Saving your profile type...', 'loading');
    
    try {
        const result = await window.SupabaseClient.updateUserType(currentUser.id, window.selectedUserType);
        
        if (result) {
            currentUser.user_type = window.selectedUserType;
            userTypeSelected = true;
            showNotification('Profile type saved successfully!', 'success');
            navigateTo('feed');
        } else {
            throw new Error('Failed to save user type');
        }
    } catch (error) {
        console.error('Error saving user type:', error);
        showNotification('Failed to save profile type. Please try again.', 'error');
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
    pageContent.innerHTML = postsHtml;
    console.log('Posts displayed in UI');
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

// Get user type specific features
function getUserTypeFeatures(userType) {
    const features = {
        general: {
            postTypeLabel: "Personal Post",
            titlePlaceholder: "What's on your mind?",
            contentPlaceholder: "Share your thoughts, stories, or experiences...",
            tagsPlaceholder: "Add personal tags (comma separated)",
            toolbarButtons: `
                <button type="button" onclick="formatText('bold')"><b>B</b></button>
                <button type="button" onclick="formatText('italic')"><i>I</i></button>
                <button type="button" onclick="insertBulletList()">• List</button>
            `,
            specialOptions: `
                <label>
                    <input type="checkbox" id="is-personal"> Mark as personal story
                </label>
            `
        },
        
        group_owner: {
            postTypeLabel: "Group Announcement",
            titlePlaceholder: "Announcement title for your group",
            contentPlaceholder: "Share important updates, events, or news with your group members...",
            tagsPlaceholder: "Add group-related tags (comma separated)",
            toolbarButtons: `
                <button type="button" onclick="formatText('bold')"><b>B</b></button>
                <button type="button" onclick="formatText('italic')"><i>I</i></button>
                <button type="button" onclick="insertBulletList()">• List</button>
                <button type="button" onclick="addAnnouncementBadge()">📢 Announcement</button>
            `,
            specialFields: `
                <div class="group-linking">
                    <label>Link to your Telegram Group (optional)</label>
                    <input type="text" id="linked-group" placeholder="Group username or ID">
                </div>
            `,
            specialOptions: `
                <label>
                    <input type="checkbox" id="is-important"> Mark as important announcement
                </label>
                <label>
                    <input type="checkbox" id="cross-post"> Cross-post to linked group
                </label>
            `
        },
        
        channel_owner: {
            postTypeLabel: "Channel Broadcast",
            titlePlaceholder: "Professional article title",
            contentPlaceholder: "Create engaging content for your channel subscribers...",
            tagsPlaceholder: "Add professional tags for discovery (comma separated)",
            toolbarButtons: `
                <button type="button" onclick="formatText('bold')"><b>B</b></button>
                <button type="button" onclick="formatText('italic')"><i>I</i></button>
                <button type="button" onclick="formatText('underline')"><u>U</u></button>
                <button type="button" onclick="insertBulletList()">• List</button>
                <button type="button" onclick="insertNumberedList()">1. List</button>
                <button type="button" onclick="addBlockquote()">❝ Quote</button>
            `,
            specialFields: `
                <div class="channel-linking">
                    <label>Link to your Telegram Channel</label>
                    <input type="text" id="linked-channel" placeholder="@yourchannel" required>
                </div>
                <div class="scheduling-options">
                    <label>Schedule Publication (optional)</label>
                    <input type="datetime-local" id="schedule-time">
                </div>
            `,
            specialOptions: `
                <label>
                    <input type="checkbox" id="premium-content"> Mark as premium content
                </label>
                <label>
                    <input type="checkbox" id="enable-comments"> Allow comments
                </label>
                <label>
                    <input type="checkbox" id="cross-post-channel"> Cross-post to channel
                </label>
            `
        }
    };
    
    return features[userType] || features.general;
}

// Show post editor with user type specific features
function showPostEditor() {
    const userType = currentUser?.user_type || 'general';
    const editorFeatures = getUserTypeFeatures(userType);
    
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="editor-container">
            <div class="editor-header">
                <button onclick="navigateTo('feed')" class="btn btn-back">← Back</button>
                <h2>Create ${editorFeatures.postTypeLabel}</h2>
                <button onclick="savePost()" class="btn btn-primary">Publish</button>
            </div>
            
            ${editorFeatures.specialFields || ''}
            
            <div class="editor-form">
                <input type="text" id="post-title" class="post-title-input" 
                       placeholder="${editorFeatures.titlePlaceholder}">
                
                <div class="editor-toolbar">
                    ${editorFeatures.toolbarButtons}
                </div>
                
                <textarea id="post-content" class="post-content-input" 
                          placeholder="${editorFeatures.contentPlaceholder}"></textarea>
                
                <div class="post-options">
                    ${editorFeatures.specialOptions}
                </div>
                
                <input type="text" id="post-tags" class="post-tags-input" 
                       placeholder="${editorFeatures.tagsPlaceholder}">
            </div>
        </div>
    `;
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
        
        const postData = {
            title: title,
            content: content,
            excerpt: content.substring(0, 150) + '...',
            tags: tags,
            user_id: user.id,
            is_published: true,
            published_at: new Date().toISOString(),
            user_type: currentUser?.user_type || 'general'
        };
        
        // Add user type specific data
        const userType = currentUser?.user_type || 'general';
        if (userType === 'group_owner') {
            const linkedGroup = document.getElementById('linked-group')?.value;
            if (linkedGroup) postData.linked_group = linkedGroup;
        } else if (userType === 'channel_owner') {
            const linkedChannel = document.getElementById('linked-channel')?.value;
            if (linkedChannel) postData.linked_channel = linkedChannel;
        }
        
        const { data, error } = await supabase
            .from('posts')
            .insert(postData)
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
    
    pageContent.innerHTML = `
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

// Show profile with user type information
function showProfile() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <h2>Your Profile</h2>
                <span class="user-type-badge ${currentUser?.user_type || 'general'}">
                    ${getUserTypeLabel(currentUser?.user_type || 'general')}
                </span>
            </div>
            <div class="profile-content">
                <div class="profile-info">
                    <div class="profile-avatar">${currentUser?.first_name?.charAt(0) || 'U'}</div>
                    <h3>${currentUser?.first_name || 'User'} ${currentUser?.last_name || ''}</h3>
                    <p>@${currentUser?.username || 'no-username'}</p>
                </div>
                
                ${renderUserTypeSpecificInfo()}
                
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
                    <button class="btn" onclick="showEditProfile()">Edit Profile</button>
                    <button class="btn" onclick="changeUserType()">Change User Type</button>
                    ${currentUser?.user_type !== 'general' ? 
                        `<button class="btn" onclick="manageLinkedEntities()">Manage ${currentUser.user_type === 'group_owner' ? 'Groups' : 'Channels'}</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Helper function to get user type label
function getUserTypeLabel(userType) {
    const labels = {
        general: '👤 General User',
        group_owner: '👥 Group Owner', 
        channel_owner: '📢 Channel Owner'
    };
    return labels[userType] || '👤 User';
}

// Render user type specific information
function renderUserTypeSpecificInfo() {
    const userType = currentUser?.user_type || 'general';
    
    switch(userType) {
        case 'group_owner':
            return `
                <div class="user-type-info">
                    <h4>Group Owner Features</h4>
                    <ul>
                        <li>Group announcements</li>
                        <li>Member engagement tools</li>
                        <li>Cross-posting to Telegram groups</li>
                    </ul>
                </div>
            `;
        case 'channel_owner':
            return `
                <div class="user-type-info">
                    <h4>Channel Owner Features</h4>
                    <ul>
                        <li>Professional content creation</li>
                        <li>Post scheduling</li>
                        <li>Channel integration</li>
                    </ul>
                </div>
            `;
        default:
            return `
                <div class="user-type-info">
                    <h4>General User Features</h4>
                    <ul>
                        <li>Personal blogging</li>
                        <li>Community engagement</li>
                        <li>Content discovery</li>
                    </ul>
                </div>
            `;
    }
}

// Change user type
function changeUserType() {
    navigateTo('user-type-selection');
}

// Manage linked entities (groups/channels)
function manageLinkedEntities() {
    showNotification('Linked entities management coming soon!', 'info');
}

// Edit profile
function showEditProfile() {
    showNotification('Profile editing coming soon!', 'info');
}

// Placeholder functions for text formatting (to be implemented)
function formatText(type) {
    showNotification(`${type} formatting coming soon!`, 'info');
}

function insertBulletList() {
    showNotification('List formatting coming soon!', 'info');
}

function insertNumberedList() {
    showNotification('Numbered list coming soon!', 'info');
}

function addBlockquote() {
    showNotification('Blockquote feature coming soon!', 'info');
}

function addAnnouncementBadge() {
    showNotification('Announcement badge coming soon!', 'info');
}

// Add CSS for new elements
const additionalCSS = `
    .onboarding-container {
        padding: 2rem 1rem;
        text-align: center;
    }
    .user-type-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 2rem 0;
    }
    .user-type-card {
        border: 2px solid #ddd;
        border-radius: 12px;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
    }
    .user-type-card:hover {
        border-color: #007bff;
        transform: translateY(-2px);
    }
    .user-type-card.selected {
        border-color: #007bff;
        background-color: rgba(0, 123, 255, 0.1);
    }
    .type-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
    }
    .user-type-card h3 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }
    .user-type-card p {
        margin: 0 0 1rem 0;
        color: #666;
    }
    .user-type-card ul {
        margin: 0;
        padding-left: 1.2rem;
        color: #555;
    }
    .user-type-card li {
        margin-bottom: 0.3rem;
    }
    .user-type-badge {
        background: #007bff;
        color: white;
        padding: 0.3rem 0.8rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: bold;
        margin-left: 1rem;
    }
    .user-type-info {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    .user-type-info h4 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }
    .user-type-info ul {
        margin: 0;
        padding-left: 1.2rem;
        color: #555;
    }
    .editor-toolbar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    .editor-toolbar button {
        padding: 0.5rem;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
    }
    .group-linking, .channel-linking, .scheduling-options {
        margin-bottom: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    .group-linking label, .channel-linking label, .scheduling-options label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }
    .post-options {
        margin: 1rem 0;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    .post-options label {
        display: block;
        margin-bottom: 0.5rem;
    }
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
        flex-wrap: wrap;
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
window.selectUserType = selectUserType;
window.saveUserType = saveUserType;
window.changeUserType = changeUserType;
window.manageLinkedEntities = manageLinkedEntities;
window.showEditProfile = showEditProfile;
window.formatText = formatText;
window.insertBulletList = insertBulletList;
window.insertNumberedList = insertNumberedList;
window.addBlockquote = addBlockquote;
window.addAnnouncementBadge = addAnnouncementBadge;
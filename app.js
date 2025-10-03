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
        restoreDraftContent?.(); // safeguard
        
        isAppInitialized = true;
        updateNavigationState();
        
        if (supabaseConnected) {
            console.log('✅ App ready! Supabase connected');
            showNotification('App ready! Connected to database.', 'success');
        } else {
            console.log('⚠️ App ready! Using demo data');
            showNotification('App ready! (Using demo data)', 'info');
        }
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showNotification('Failed to initialize app. Please refresh.', 'error');
    }
}

// Initialize Telegram WebApp with version compatibility
function initializeTelegramWebApp() {
    return new Promise((resolve) => {
        const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
                        window.location.protocol === 'file:';
        
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            tg = Telegram.WebApp;
            safelyInitializeTelegram();
            console.log("✅ Production: Using real Telegram WebApp");
            resolve();
        } else if (isLocal) {
            tg = createMockTelegramWebApp();
            console.log("✅ Development: Using mock Telegram WebApp");
            resolve();
        } else {
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
            
            setTimeout(() => {
                clearInterval(checkTelegram);
                console.warn("⚠️ Telegram WebApp not available, using fallback");
                tg = createMockTelegramWebApp();
                resolve();
            }, 3000);
        }
    });
}

function safelyInitializeTelegram() {
    try {
        tg.expand?.();
        tg.enableClosingConfirmation?.();
        tg.setBackgroundColor?.('#121212');
        tg.setHeaderColor?.('#1e1e1e');
        
        console.log('Telegram WebApp safely initialized');
        console.log('Init Data:', tg.initData);
        console.log('Platform:', tg.platform);
        console.log('Version:', tg.version);
    } catch (error) {
        console.warn('Telegram initialization issue:', error);
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
    
    try {
        const isConnected = await window.SupabaseClient.testConnection();
        return isConnected;
    } catch (error) {
        console.warn('⚠️ Supabase connection test error:', error.message);
        return false;
    }
}

// Mock Telegram WebApp for dev
function createMockTelegramWebApp() {
    const mockUser = {
        id: Math.floor(Math.random() * 1000000000),
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        language_code: "en"
    };
    
    return {
        initDataUnsafe: { user: mockUser },
        initData: JSON.stringify({ user: mockUser }),
        platform: "web",
        version: "7.0",
        expand: () => console.log("Mock expand()"),
        enableClosingConfirmation: () => console.log("Mock enableClosingConfirmation()"),
        setBackgroundColor: (c) => console.log("Mock setBackgroundColor:", c),
        setHeaderColor: (c) => console.log("Mock setHeaderColor:", c),
        showPopup: (p) => alert(p.title + "\n\n" + p.message),
        showAlert: (m) => alert(m),
        showConfirm: (m, cb) => cb(confirm(m))
    };
}

// ---------------- NAVIGATION ----------------
function updateNavigationState() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    if (currentView === 'feed' && navItems[0]) navItems[0].classList.add('active');
    if (currentView === 'editor' && navItems[1]) navItems[1].classList.add('active');
    if (currentView === 'profile' && navItems[2]) navItems[2].classList.add('active');
}

function navigateTo(view, data = null) {
    console.log('Navigating to:', view);
    viewHistory.push({ view: currentView, data });
    currentView = view;
    updateNavigationState();
    
    switch(view) {
        case 'feed': loadPosts(); break;
        case 'editor': showPostEditor(); break;
        case 'profile': showProfile?.(); break;
        case 'user-type-selection': showUserTypeSelection(); break;
        default: loadPosts();
    }
}

function goBack() {
    if (viewHistory.length > 0) {
        const previous = viewHistory.pop();
        navigateTo(previous.view, previous.data);
    } else {
        navigateTo('feed');
    }
}

// ---------------- AUTH ----------------
async function checkAuth() {
    updateUI('loading', 'Checking authentication...');
    
    if (tg?.initDataUnsafe?.user) {
        await authenticateUser(tg.initDataUnsafe.user);
    } else {
        console.log('No Telegram user found');
        showLogin();
    }
}

async function authenticateUser(telegramUser) {
    updateUI('loading', 'Logging in...');
    try {
        let user = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
        if (!user) user = await window.SupabaseClient.createUser(telegramUser);
        
        if (user) {
            currentUser = user;
            updateUserInfo();
            if (!currentUser.user_type || currentUser.user_type === 'general') {
                navigateTo('user-type-selection');
            } else {
                navigateTo('feed');
            }
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

// ---------------- USER TYPE ----------------
function showUserTypeSelection() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `... same HTML as before ...`; // unchanged
}

function selectUserType(userType, event) {
    document.querySelectorAll('.user-type-card').forEach(card => card.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById('continue-btn').disabled = false;
    window.selectedUserType = userType;
}

async function saveUserType() {
    if (!window.selectedUserType) return showNotification('Please select a user type first.', 'error');
    showNotification('Saving your profile type...', 'loading');
    
    try {
        const result = await window.SupabaseClient.updateUserType(currentUser.id, window.selectedUserType);
        if (result) {
            currentUser.user_type = window.selectedUserType;
            userTypeSelected = true;
            showNotification('Profile type saved!', 'success');
            navigateTo('feed');
        } else throw new Error('Failed to save');
    } catch (error) {
        console.error('Error saving user type:', error);
        showNotification('Failed to save profile type. Please try again.', 'error');
    }
}

// ---------------- POSTS ----------------
function updateUserInfo() { /* unchanged, safe */ }
async function loadPosts() { /* unchanged, safe */ }
function showPosts() { /* unchanged, safe */ }
function formatDate(dateString) { /* unchanged, safe */ }
function getUserTypeFeatures(userType) { /* unchanged, safe */ }
function showPostEditor() { /* unchanged, safe */ }

async function savePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const tags = document.getElementById('post-tags').value.split(',').map(tag => tag.trim());
    
    if (!title || !content) return showNotification('Please add title & content.', 'error');
    if (!supabaseConnected) return showNotification('Database not connected.', 'error');
    
    try {
        const supabase = window.SupabaseClient.getClient();
        const telegramUser = tg.initDataUnsafe.user;
        const user = await window.SupabaseClient.createUser(telegramUser);
        
        const postData = {
            title,
            content,
            excerpt: content.substring(0, 150) + '...',
            tags,
            user_id: user.id,
            is_published: true,
            published_at: new Date().toISOString(),
            user_type: currentUser?.user_type || 'general'
        };
        
        if (currentUser?.user_type === 'group_owner') {
            const linkedGroup = document.getElementById('linked-group')?.value;
            if (linkedGroup) postData.linked_group = linkedGroup;
        } else if (currentUser?.user_type === 'channel_owner') {
            const linkedChannel = document.getElementById('linked-channel')?.value;
            if (linkedChannel) postData.linked_channel = linkedChannel;
        }
        
        const { error } = await supabase.from('posts').insert(postData);
        if (error) throw error;
        
        clearDraft?.();
        showNotification('Post published!', 'success');
        await loadPosts();
    } catch (error) {
        console.error('Error saving post:', error);
        showNotification('Could not publish post.', 'error');
    }
}

// ---------------- UI HELPERS ----------------
function updateUI(state, message = '') { /* unchanged */ }
function showEmptyState() { /* unchanged */ }
function showLogin() { updateUI('error', 'Please open this app in Telegram.'); }
function showNotification(message, type = 'info') { /* unchanged */ }
function setupEditorLeaveConfirmation() { /* unchanged */ }

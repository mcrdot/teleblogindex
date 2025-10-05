// ds = 4c4f9b72-7ba2-4440-b4a6-4dced0d724ad

// app.js - DEBUG VERSION - FIND WHY TELEGRAM DATA ISN'T WORKING
console.log('🚀 TeleBlog Lite App Starting...');

// Global app state
window.TeleBlogApp = {
    currentUser: null,
    currentPage: 'feed',
    isGuest: false,

    // Initialize the application
    async initializeApp() {
        try {
            console.log('🔧 Initializing TeleBlog application...');
            
            // Add debug button immediately
            this.addDebugButton();
            
            await this.initializeSupabase();
            await this.initializeTelegramAndEnrollUser();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Application failed to load. Please refresh.');
        }
    },
    
    // Add debug button to check Telegram data
    addDebugButton() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '🔍 DEBUG';
        debugBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: red;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            z-index: 10000;
            font-size: 12px;
        `;
        debugBtn.onclick = this.showDebugInfo;
        document.body.appendChild(debugBtn);
    },
    
    // Show debug information
    showDebugInfo() {
        const tg = window.Telegram?.WebApp;
        let debugInfo = '';
        
        if (tg) {
            debugInfo = `
TELEGRAM WEBAPP DEBUG INFO:
---------------------------
✅ Telegram WebApp Detected

initDataUnsafe: ${JSON.stringify(tg.initDataUnsafe, null, 2)}
initData: ${tg.initData || 'NULL'}
platform: ${tg.platform}
version: ${tg.version}

USER DATA:
---------
${tg.initDataUnsafe?.user ? 
    `✅ User Found:
     ID: ${tg.initDataUnsafe.user.id}
     Username: ${tg.initDataUnsafe.user.username}
     First Name: ${tg.initDataUnsafe.user.first_name}
     Last Name: ${tg.initDataUnsafe.user.last_name}` : 
    '❌ NO USER DATA FOUND'}

Available Keys in initDataUnsafe:
${tg.initDataUnsafe ? Object.keys(tg.initDataUnsafe).join(', ') : 'NONE'}
`;
        } else {
            debugInfo = '❌ NO TELEGRAM WEBAPP DETECTED - Running in browser';
        }
        
        alert(debugInfo);
        console.log('🔍 DEBUG INFO:', debugInfo);
    },
    
    // Initialize Supabase client
    async initializeSupabase() {
        if (window.SupabaseClient && window.SupabaseClient.init) {
            const supabase = window.SupabaseClient.init();
            if (supabase) {
                console.log('✅ Supabase client initialized');
            }
        }
    },
    
    // Initialize Telegram - WITH COMPLETE DEBUGGING
    async initializeTelegramAndEnrollUser() {
        console.log('🔍 Checking for Telegram WebApp...');
        
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            console.log('✅ Telegram WebApp detected:', {
                platform: tg.platform,
                version: tg.version
            });
            
            // Show ALL available data
            console.log('📊 FULL TELEGRAM DATA:', {
                initData: tg.initData,
                initDataUnsafe: tg.initDataUnsafe,
                startParam: tg.startParam,
                themeParams: tg.themeParams
            });
            
            // Expand and setup
            tg.expand();
            
            // Check for user data in ALL possible locations
            let telegramUser = null;
            
            // Method 1: Direct user object
            if (tg.initDataUnsafe?.user) {
                telegramUser = tg.initDataUnsafe.user;
                console.log('🎯 FOUND USER via initDataUnsafe.user:', telegramUser);
            } 
            // Method 2: Parse initData string
            else if (tg.initData) {
                console.log('🔄 Parsing initData string...');
                try {
                    const params = new URLSearchParams(tg.initData);
                    const userParam = params.get('user');
                    if (userParam) {
                        telegramUser = JSON.parse(decodeURIComponent(userParam));
                        console.log('🎯 FOUND USER via initData parsing:', telegramUser);
                    }
                } catch (e) {
                    console.error('❌ Failed to parse initData:', e);
                }
            }
            // Method 3: Check themeParams (sometimes user data is here)
            else if (tg.themeParams) {
                console.log('🔍 Checking themeParams for user data...');
                console.log('ThemeParams:', tg.themeParams);
            }
            
            if (telegramUser) {
                console.log('🚀 PROCESSING TELEGRAM USER:', telegramUser);
                await this.processTelegramUser(telegramUser);
            } else {
                console.error('❌ NO TELEGRAM USER DATA FOUND IN ANY METHOD');
                console.log('Available data:', {
                    hasInitData: !!tg.initData,
                    hasInitDataUnsafe: !!tg.initDataUnsafe,
                    initDataUnsafeKeys: tg.initDataUnsafe ? Object.keys(tg.initDataUnsafe) : [],
                    hasStartParam: !!tg.startParam,
                    hasThemeParams: !!tg.themeParams
                });
                
                this.showDebugGuestMode();
            }
            
        } else {
            console.log('🌐 No Telegram WebApp - Running in browser mode');
            this.enterGuestMode();
        }
    },
    
    // Process Telegram user
    async processTelegramUser(telegramUser) {
        console.log('👤 Processing Telegram user:', telegramUser.username);
        
        // Show we found the user
        this.showLoading(`Found user: ${telegramUser.username || telegramUser.first_name}`);
        
        try {
            // Check if user exists in database
            const existingUser = await this.checkUserExistence(telegramUser.id);
            
            if (existingUser) {
                console.log('✅ EXISTING USER FOUND IN DATABASE:', existingUser);
                await this.handleExistingUser(existingUser);
            } else {
                console.log('🆕 NEW USER - Not in database');
                await this.showWelcomeOptions(telegramUser);
            }
        } catch (error) {
            console.error('❌ User processing failed:', error);
            this.showError('Failed to process user. Entering guest mode.');
            this.enterGuestMode();
        }
    },
    
    // Check if user exists
    async checkUserExistence(telegramId) {
        console.log('🔍 Checking database for user:', telegramId);
        
        if (!window.SupabaseClient) {
            console.warn('❌ Supabase client not available');
            return null;
        }
        
        try {
            const user = await window.SupabaseClient.getUserByTelegramId(telegramId);
            console.log('📊 Database check result:', user ? 'USER FOUND' : 'USER NOT FOUND');
            return user;
        } catch (error) {
            console.error('❌ Database check failed:', error);
            return null;
        }
    },
    
    // Handle existing user
    async handleExistingUser(user) {
        console.log('🎉 LOGGING IN EXISTING USER:', user.username);
        
        this.currentUser = user;
        this.isGuest = false;
        
        // Update header immediately
        this.updateHeaderUserInfo(user);
        
        // Load user content
        await this.loadUserContent();
        
        this.showNotification(`🎉 Welcome back, ${user.first_name || user.username}!`, 'success');
    },
    
    // Show welcome options
    async showWelcomeOptions(telegramUser) {
        console.log('🆕 Showing welcome for new user:', telegramUser.username);
        
        const welcomeHTML = `
            <div class="welcome-overlay active">
                <div class="welcome-card">
                    <div class="welcome-header">
                        <div class="welcome-icon">👋</div>
                        <h2>Welcome to TeleBlog!</h2>
                        <p>We found your Telegram: <strong>@${telegramUser.username || 'user'}</strong></p>
                        <p><small>ID: ${telegramUser.id}</small></p>
                    </div>
                    
                    <div class="welcome-options">
                        <div class="welcome-option guest-option">
                            <div class="option-icon">🔍</div>
                            <h3>Quick Explore</h3>
                            <p>Browse as guest</p>
                            <button class="btn btn-outline" onclick="TeleBlogApp.enterGuestMode()">
                                Explore as Guest
                            </button>
                        </div>
                        
                        <div class="welcome-option member-option">
                            <div class="option-icon">🚀</div>
                            <h3>Full Membership</h3>
                            <p>Unlock all features</p>
                            <button class="btn btn-primary" onclick="TeleBlogApp.createMemberAccount(${JSON.stringify(telegramUser).replace(/"/g, '&quot;')})">
                                Become Member
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', welcomeHTML);
    },
    
    // Create member account
    async createMemberAccount(telegramUser) {
        this.showLoading('Creating your account...');
        
        try {
            const userData = {
                telegram_id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
                user_type: 'general',
                profile_completed: false
            };
            
            const newUser = await window.SupabaseClient.createUser(userData);
            
            if (newUser) {
                this.currentUser = newUser;
                this.isGuest = false;
                this.closeWelcomeModal();
                this.updateHeaderUserInfo(newUser);
                this.loadUserContent();
                this.showNotification('🎉 Account created successfully!', 'success');
            }
        } catch (error) {
            console.error('❌ Account creation failed:', error);
            this.showError('Failed to create account.');
        }
    },
    
    // Enter guest mode with debug info
    enterGuestMode() {
        console.log('👤 Entering guest mode');
        
        this.currentUser = {
            id: 'guest-' + Date.now(),
            username: 'guest',
            first_name: 'Guest',
            user_type: 'guest',
            is_guest: true
        };
        
        this.isGuest = true;
        this.closeWelcomeModal();
        this.updateHeaderUserInfo(this.currentUser);
        this.loadGuestContent();
        
        this.showNotification('👤 Guest Mode - Limited features', 'info');
    },
    
    // Debug guest mode - shows why we're in guest mode
    showDebugGuestMode() {
        console.log('🔍 DEBUG GUEST MODE - No Telegram user data found');
        this.enterGuestMode();
        
        // Add debug info to the page
        const debugInfo = document.createElement('div');
        debugInfo.style.cssText = `
            background: #ff4444;
            color: white;
            padding: 10px;
            margin: 10px;
            border-radius: 5px;
            font-size: 12px;
        `;
        debugInfo.innerHTML = `
            <strong>DEBUG: No Telegram User Data Found</strong><br>
            Click the DEBUG button (top-right) to see what data is available.
        `;
        
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.prepend(debugInfo);
        }
    },
    
    // Close welcome modal
    closeWelcomeModal() {
        const modal = document.querySelector('.welcome-overlay');
        if (modal) modal.remove();
    },
    
    // Load guest content
    async loadGuestContent() {
        this.displayDemoPosts({ allowInteractions: false });
    },
    
    // Load user content
    async loadUserContent() {
        this.displayDemoPosts({ allowInteractions: true });
    },
    
    // Update header user info
    updateHeaderUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) {
            console.error('❌ user-info element not found');
            return;
        }
        
        if (user.is_guest) {
            userInfo.innerHTML = `
                <div class="avatar guest">G</div>
                <span>Guest <span class="guest-badge">Limited Access</span></span>
            `;
            userInfo.title = "Guest User";
        } else {
            const displayName = user.first_name || user.username || 'User';
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || displayName;
            
            userInfo.innerHTML = `
                <div class="avatar">${displayName.charAt(0).toUpperCase()}</div>
                <span>${fullName} <small>(@${user.username})</small></span>
            `;
            userInfo.title = `Telegram: @${user.username}`;
            
            console.log('✅ Header updated with user:', user.username);
        }
    },
    
    // Display demo posts
    displayDemoPosts(options = { allowInteractions: true }) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>${this.isGuest ? 'Sample Posts (Guest Mode)' : 'Latest Posts'}</h2>
                </div>
                <div class="posts-list">
                    <div class="post-card ${!options.allowInteractions ? 'guest-mode' : ''}">
                        <div class="post-header">
                            <div class="post-author">
                                <div class="author-avatar">T</div>
                                <div class="author-info">
                                    <strong>TeleBlog Team</strong>
                                    <span class="post-date">Just now</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-content">
                            <p>Welcome to TeleBlog! 🎉</p>
                            <p><strong>Status:</strong> ${this.isGuest ? 'Guest Mode' : 'Member Mode'}</p>
                            <p><strong>User:</strong> ${this.currentUser?.username || 'Not logged in'}</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-like ${!options.allowInteractions ? 'disabled' : ''}">❤️ 12</button>
                            <button class="btn-comment ${!options.allowInteractions ? 'disabled' : ''}">💬 3</button>
                        </div>
                    </div>
                </div>
                
                ${this.isGuest ? `
                    <div class="guest-upgrade-prompt">
                        <p><strong>Why am I in Guest Mode?</strong></p>
                        <p>Telegram user data was not detected. Click the DEBUG button (top-right red button) to see what's happening.</p>
                        <button class="btn primary" onclick="location.reload()">Try Again</button>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    // Utility functions
    showLoading(message) {
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    },
    
    showNotification(message, type = 'info') {
        console.log('📢', message);
        // Simple alert for debugging
        if (type === 'success') {
            alert('✅ ' + message);
        }
    },
    
    showError(message) {
        alert('❌ ' + message);
    }
};

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.TeleBlogApp.initializeApp();
    });
} else {
    window.TeleBlogApp.initializeApp();
}
// ds = 4c4f9b72-7ba2-4440-b4a6-4dced0d724ad

// app.js - FIXED VERSION - NO LOADING STUCK
console.log('🚀 TeleBlog Lite App Starting...');

// Global app state
window.TeleBlogApp = {
    currentUser: null,
    currentPage: 'feed',
    isGuest: false,

    // Initialize the application - SIMPLIFIED
    async initializeApp() {
        try {
            console.log('🔧 Initializing TeleBlog application...');
            
            // Quick initialization without long waits
            await this.initializeSupabase();
            await this.initializeTelegramAndEnrollUser();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Application failed to load. Please refresh.');
        }
    },
    
    // Initialize Supabase client - SIMPLIFIED
    async initializeSupabase() {
        if (window.SupabaseClient && window.SupabaseClient.init) {
            const supabase = window.SupabaseClient.init();
            if (supabase) {
                console.log('✅ Supabase client initialized');
                // Don't wait for connection test - do it in background
                window.SupabaseClient.testConnection().then(connected => {
                    if (connected) {
                        console.log('✅ Supabase connection verified');
                    } else {
                        console.warn('⚠️ Supabase connection failed - using fallback mode');
                    }
                });
            }
        }
    },
    
    // Initialize Telegram - SIMPLIFIED & FAST
    async initializeTelegramAndEnrollUser() {
        // Show loading immediately
        this.showLoading('Loading TeleBlog...');
        
        // Check for Telegram WebApp
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            console.log('✅ Telegram Web App detected');
            
            // Basic Telegram setup
            tg.expand();
            tg.setHeaderColor('#ffffff');
            tg.setBackgroundColor('#ffffff');
            
            // Get user data with timeout protection
            const telegramUser = tg.initDataUnsafe?.user;
            
            if (telegramUser?.id) {
                console.log('🎯 Telegram User Found:', telegramUser.id, telegramUser.username);
                await this.processTelegramUser(telegramUser);
            } else {
                console.log('❌ No Telegram user data - checking stored session');
                await this.tryLoadExistingSession();
            }
        } else {
            console.log('🌐 Web browser mode - checking stored session');
            await this.tryLoadExistingSession();
        }
    },
    
    // Process Telegram user - FAST
    async processTelegramUser(telegramUser) {
        try {
            // Quick user existence check with timeout
            const existingUser = await Promise.race([
                this.checkUserExistence(telegramUser.id),
                new Promise(resolve => setTimeout(() => resolve(null), 3000)) // 3sec timeout
            ]);
            
            if (existingUser) {
                console.log('✅ Existing user found:', existingUser.username);
                await this.handleExistingUser(existingUser);
            } else {
                console.log('🆕 New Telegram user:', telegramUser.username);
                await this.showWelcomeOptions(telegramUser);
            }
        } catch (error) {
            console.error('User processing failed:', error);
            this.enterGuestMode();
        }
    },
    
    // Check if user exists - SIMPLIFIED
    async checkUserExistence(telegramId) {
        try {
            if (!window.SupabaseClient) return null;
            const user = await window.SupabaseClient.getUserByTelegramId(telegramId);
            return user;
        } catch (error) {
            console.error('User check failed:', error);
            return null;
        }
    },
    
    // Handle existing user - FAST
    async handleExistingUser(user) {
        this.currentUser = user;
        this.isGuest = false;
        
        // Quick header update
        this.updateHeaderUserInfo(user);
        
        // Load content without waiting
        this.loadUserContent();
        
        // Show welcome notification
        const userName = user.first_name || user.username || 'User';
        this.showNotification(`Welcome back, ${userName}!`, 'success');
    },
    
    // Show welcome options
    async showWelcomeOptions(telegramUser) {
        console.log('🆕 Showing welcome options');
        
        const welcomeHTML = `
            <div class="welcome-overlay active">
                <div class="welcome-card">
                    <div class="welcome-header">
                        <div class="welcome-icon">👋</div>
                        <h2>Welcome to TeleBlog!</h2>
                        <p>We found your Telegram account: <strong>@${telegramUser.username || 'User'}</strong></p>
                    </div>
                    
                    <div class="welcome-options">
                        <div class="welcome-option guest-option">
                            <div class="option-icon">🔍</div>
                            <div class="option-content">
                                <h3>Quick Explore</h3>
                                <p>Browse limited content as guest</p>
                                <ul>
                                    <li>✅ View sample posts</li>
                                    <li>❌ No interactions</li>
                                    <li>❌ No personalization</li>
                                </ul>
                            </div>
                            <button class="btn btn-outline" onclick="TeleBlogApp.enterGuestMode()">
                                Explore as Guest
                            </button>
                        </div>
                        
                        <div class="welcome-option member-option">
                            <div class="option-icon">🚀</div>
                            <div class="option-content">
                                <h3>Full Membership</h3>
                                <p>Unlock complete TeleBlog experience</p>
                                <ul>
                                    <li>✅ Unlimited content access</li>
                                    <li>✅ Like, comment & share</li>
                                    <li>✅ Personal profile</li>
                                    <li>✅ Post creation</li>
                                </ul>
                            </div>
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
                is_premium: telegramUser.is_premium || false,
                user_type: 'general',
                profile_completed: false
            };
            
            const newUser = await window.SupabaseClient.createUser(userData);
            
            if (newUser) {
                this.currentUser = newUser;
                this.isGuest = false;
                this.closeWelcomeModal();
                this.showUserTypeSelection(newUser);
            }
        } catch (error) {
            console.error('Account creation failed:', error);
            this.showError('Failed to create account. Please try again.');
        }
    },
    
    // Enter guest mode - IMMEDIATE
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
    },
    
    // Close welcome modal
    closeWelcomeModal() {
        const modal = document.querySelector('.welcome-overlay');
        if (modal) modal.remove();
    },
    
    // Load guest content - IMMEDIATE
    async loadGuestContent() {
        this.displayDemoPosts({ allowInteractions: false });
        this.showNotification('Exploring as Guest - Limited features available', 'info');
    },
    
    // Load user content - IMMEDIATE  
    async loadUserContent() {
        this.displayDemoPosts({ allowInteractions: true });
    },
    
    // Update header user info - FAST
    updateHeaderUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) return;
        
        if (user.is_guest) {
            userInfo.innerHTML = `
                <div class="avatar guest">G</div>
                <span>Guest <span class="guest-badge">Limited Access</span></span>
            `;
        } else {
            const displayName = user.first_name || user.username || 'User';
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || displayName;
            
            userInfo.innerHTML = `
                <div class="avatar">${displayName.charAt(0).toUpperCase()}</div>
                <span>${fullName}</span>
            `;
        }
    },
    
    // Display demo posts - IMMEDIATE
    displayDemoPosts(options = { allowInteractions: true }) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>${this.isGuest ? 'Sample Posts (Guest Mode)' : 'Latest Posts'}</h2>
                    ${!this.isGuest ? '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : ''}
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
                            <p>Welcome to TeleBlog! 🎉 Connect your Telegram groups and channels to start blogging.</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-like ${!options.allowInteractions ? 'disabled' : ''}">❤️ 12</button>
                            <button class="btn-comment ${!options.allowInteractions ? 'disabled' : ''}">💬 3</button>
                        </div>
                    </div>
                </div>
                ${this.isGuest ? `
                    <div class="guest-upgrade-prompt">
                        <p>Want full access to all features?</p>
                        <button class="btn primary" onclick="location.reload()">Become a Member</button>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    // Show user type selection
    showUserTypeSelection(user) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="enrollment-container">
                <div class="enrollment-header">
                    <h2>Choose Your Account Type</h2>
                    <p>How do you want to use TeleBlog?</p>
                </div>
                
                <div class="user-type-selection">
                    <div class="user-type-card" onclick="TeleBlogApp.selectUserType('general')">
                        <div class="type-icon">👤</div>
                        <h3>General User</h3>
                        <p>Read and interact with content</p>
                        <button class="btn">Select</button>
                    </div>
                    
                    <div class="user-type-card" onclick="TeleBlogApp.selectUserType('group_admin')">
                        <div class="type-icon">👥</div>
                        <h3>Group Admin</h3>
                        <p>Manage group content</p>
                        <button class="btn">Select</button>
                    </div>
                    
                    <div class="user-type-card" onclick="TeleBlogApp.selectUserType('channel_admin')">
                        <div class="type-icon">📢</div>
                        <h3>Channel Admin</h3>
                        <p>Manage channel content</p>
                        <button class="btn">Select</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Handle user type selection
    async selectUserType(userType) {
        if (!this.currentUser) return;
        
        this.showLoading('Setting up your account...');
        
        if (window.SupabaseClient?.updateUserType) {
            await window.SupabaseClient.updateUserType(this.currentUser.id, userType);
        }
        
        this.currentUser.user_type = userType;
        this.updateHeaderUserInfo(this.currentUser);
        this.loadUserContent();
        
        this.showNotification('Account setup complete!', 'success');
    },
    
    // Try load existing session
    async tryLoadExistingSession() {
        try {
            const storedUserId = localStorage.getItem('teleblog-user-id');
            if (storedUserId && window.SupabaseClient) {
                const supabase = window.SupabaseClient.getClient();
                if (supabase) {
                    const { data: user } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', storedUserId)
                        .single();
                    
                    if (user) {
                        await this.handleExistingUser(user);
                        return;
                    }
                }
            }
            
            this.enterGuestMode();
        } catch (error) {
            this.enterGuestMode();
        }
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
        console.log('📢 Notification:', message);
        // Simple notification for now
        const existingNotice = document.querySelector('.temp-notice');
        if (existingNotice) existingNotice.remove();
        
        const notice = document.createElement('div');
        notice.className = `temp-notice notification notification-${type}`;
        notice.innerHTML = `<span>${message}</span>`;
        notice.style.cssText = 'position:fixed; top:20px; right:20px; background:var(--bg-secondary); padding:1rem; border-radius:8px; z-index:10000;';
        
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 3000);
    },
    
    showError(message) {
        const container = document.getElementById('page-content');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Something went wrong</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn">Reload App</button>
                </div>
            `;
        }
    },
    
    showCreatePost() {
        this.showNotification('Create post feature coming soon!', 'info');
    }
};

// Start immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.TeleBlogApp.initializeApp();
    });
} else {
    window.TeleBlogApp.initializeApp();
}
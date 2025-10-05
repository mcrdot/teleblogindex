// ds = 4c4f9b72-7ba2-4440-b4a6-4dced0d724ad

// app.js - COMPLETE FIXED VERSION
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
            
            // Add debug button
            this.addDebugButton();
            
            await this.initializeSupabase();
            await this.initializeTelegramAndEnrollUser();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Application failed to load. Please refresh.');
        }
    },
    
    // Initialize Supabase client
    async initializeSupabase() {
        if (window.SupabaseClient && window.SupabaseClient.init) {
            const supabase = window.SupabaseClient.init();
            if (supabase) {
                console.log('✅ Supabase client initialized');
                
                // Test connection in background
                window.SupabaseClient.testConnection().then(connected => {
                    if (connected) {
                        console.log('✅ Supabase connection verified');
                    } else {
                        console.warn('⚠️ Supabase connection failed');
                    }
                });
            }
        } else {
            console.error('❌ Supabase client not available');
        }
    },
    
    // FIXED: Initialize Telegram and handle user enrollment
    async initializeTelegramAndEnrollUser() {
        console.log('🔍 Checking for Telegram WebApp...');
        
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            console.log('✅ Telegram WebApp detected');
            
            // Expand the app
            tg.expand();
            tg.setHeaderColor('#ffffff');
            tg.setBackgroundColor('#ffffff');
            
            // DEBUG: Check what data we have
            console.log('📊 Telegram initDataUnsafe:', tg.initDataUnsafe);
            console.log('📊 Telegram initData:', tg.initData);
            
            // METHOD 1: Try to get user from initDataUnsafe (most common)
            let telegramUser = tg.initDataUnsafe?.user;
            
            // METHOD 2: If no user in initDataUnsafe, try parsing initData
            if (!telegramUser && tg.initData) {
                console.log('🔄 Parsing initData for user...');
                try {
                    const params = new URLSearchParams(tg.initData);
                    const userParam = params.get('user');
                    if (userParam) {
                        telegramUser = JSON.parse(decodeURIComponent(userParam));
                        console.log('✅ Found user in initData:', telegramUser);
                    }
                } catch (e) {
                    console.error('❌ Failed to parse initData:', e);
                }
            }
            
            if (telegramUser?.id) {
                console.log('🎯 Telegram User Found:', {
                    id: telegramUser.id,
                    username: telegramUser.username,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name
                });
                
                // Check if this user exists in our database
                const existingUser = await this.findUserInDatabase(telegramUser.id);
                
                if (existingUser) {
                    console.log('✅ EXISTING USER FOUND IN DATABASE:', existingUser);
                    await this.loginExistingUser(existingUser);
                } else {
                    console.log('🆕 NEW USER - Not in database yet');
                    await this.showWelcomeOptions(telegramUser);
                }
            } else {
                console.error('❌ NO TELEGRAM USER DATA FOUND');
                // Try to load any existing session
                await this.loadExistingSession();
            }
            
        } else {
            console.log('🌐 No Telegram WebApp - Browser mode');
            await this.loadExistingSession();
        }
    },

    // FIXED: Find user in database by telegram_id
    async findUserInDatabase(telegramId) {
        console.log('🔍 Searching database for telegram_id:', telegramId);
        
        if (!window.SupabaseClient) {
            console.warn('❌ Supabase client not available');
            return null;
        }
        
        try {
            const user = await window.SupabaseClient.getUserByTelegramId(telegramId);
            
            if (user) {
                console.log('✅ USER FOUND IN DATABASE:', {
                    id: user.id,
                    telegram_id: user.telegram_id,
                    username: user.username,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    user_type: user.user_type
                });
            } else {
                console.log('❌ USER NOT FOUND in database for telegram_id:', telegramId);
            }
            
            return user;
        } catch (error) {
            console.error('❌ Database search failed:', error);
            return null;
        }
    },

    // FIXED: Login existing user with REAL database data
    async loginExistingUser(user) {
        console.log('🎉 LOGGING IN EXISTING USER FROM DATABASE:', user.username);
        
        this.currentUser = user;
        this.isGuest = false;
        
        // Store user ID for future sessions
        localStorage.setItem('teleblog-user-id', user.id);
        
        // Update header with REAL database data
        this.updateHeaderUserInfo(user);
        
        // Load user-specific content
        await this.loadUserContent();
        
        // Show welcome notification with REAL name
        const userName = user.first_name || user.username || 'User';
        this.showNotification(`Welcome back, ${userName}!`, 'success');
        
        console.log('✅ Successfully logged in user:', user.username);
    },

    // FIXED: Load existing session from localStorage
    async loadExistingSession() {
        console.log('🔍 Checking for existing session...');
        
        try {
            const storedUserId = localStorage.getItem('teleblog-user-id');
            if (storedUserId && window.SupabaseClient) {
                console.log('📁 Found stored user ID:', storedUserId);
                
                const supabase = window.SupabaseClient.getClient();
                if (supabase) {
                    const { data: user, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', storedUserId)
                        .single();
                    
                    if (!error && user) {
                        console.log('✅ Loaded user from stored session:', user.username);
                        await this.loginExistingUser(user);
                        return;
                    } else {
                        console.error('❌ Failed to load stored user:', error);
                    }
                }
            }
            
            // If no session found, enter guest mode
            console.log('❌ No existing session found');
            this.enterGuestMode();
            
        } catch (error) {
            console.error('❌ Session loading failed:', error);
            this.enterGuestMode();
        }
    },

    // Show welcome options for new users
    async showWelcomeOptions(telegramUser) {
        console.log('🆕 Showing welcome for new user:', telegramUser.username);
        
        const welcomeHTML = `
            <div class="welcome-overlay active">
                <div class="welcome-card">
                    <div class="welcome-header">
                        <div class="welcome-icon">👋</div>
                        <h2>Welcome to TeleBlog!</h2>
                        <p>We found your Telegram: <strong>@${telegramUser.username || 'user'}</strong></p>
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
                                    <li>✅ Personal profile & history</li>
                                    <li>✅ Post creation (for admins)</li>
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
                this.updateHeaderUserInfo(newUser);
                this.loadUserContent();
                this.showNotification('🎉 Account created successfully!', 'success');
            }
        } catch (error) {
            console.error('❌ Account creation failed:', error);
            this.showError('Failed to create account.');
        }
    },

    // Enter guest mode
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

    // Close welcome modal
    closeWelcomeModal() {
        const modal = document.querySelector('.welcome-overlay');
        if (modal) modal.remove();
    },

    // Load guest content
    async loadGuestContent() {
        this.displayDemoPosts({ allowInteractions: false });
    },

    // FIXED: Load user content with real data
    async loadUserContent() {
        console.log('📦 Loading content for user:', this.currentUser?.username);
        
        try {
            let posts = [];
            
            // Try to get real posts from database
            if (window.SupabaseClient && window.SupabaseClient.getPosts) {
                posts = await window.SupabaseClient.getPosts(10);
                console.log('📊 Loaded posts from database:', posts.length);
            }
            
            if (posts.length > 0) {
                this.displayPosts(posts, { allowInteractions: true });
            } else {
                // Show demo posts but indicate it's real user mode
                this.displayUserDemoPosts();
            }
            
        } catch (error) {
            console.error('❌ Failed to load user content:', error);
            this.displayUserDemoPosts();
        }
    },

    // FIXED: Display demo posts for logged-in users
    displayUserDemoPosts() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>Welcome, ${this.currentUser.first_name || this.currentUser.username}!</h2>
                    ${this.currentUser.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : ''}
                </div>
                <div class="posts-list">
                    <div class="post-card">
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
                            <p>Welcome back to TeleBlog! 🎉</p>
                            <p><strong>Logged in as:</strong> @${this.currentUser.username}</p>
                            <p><strong>Account type:</strong> ${this.getUserTypeDisplayName(this.currentUser.user_type)}</p>
                            <p>Your groups and channels will appear here soon.</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-like" onclick="TeleBlogApp.likePost('demo')">❤️ 12</button>
                            <button class="btn-comment" onclick="TeleBlogApp.showComments('demo')">💬 3</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Display posts
    displayPosts(posts, options = { allowInteractions: true }) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        if (!posts || posts.length === 0) {
            this.displayUserDemoPosts();
            return;
        }
        
        const postsHtml = posts.map(post => `
            <div class="post-card ${!options.allowInteractions ? 'guest-mode' : ''}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">${post.author_name?.charAt(0) || 'U'}</div>
                        <div class="author-info">
                            <strong>${post.author_name || 'Unknown Author'}</strong>
                            <span class="post-date">${this.formatDate(post.created_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="post-content">
                    <p>${this.escapeHtml(post.content)}</p>
                </div>
                <div class="post-actions">
                    <button class="btn-like ${!options.allowInteractions ? 'disabled' : ''}" 
                            onclick="${options.allowInteractions ? `TeleBlogApp.likePost('${post.id}')` : ''}"
                            ${!options.allowInteractions ? 'disabled' : ''}>
                        ❤️ ${post.likes_count || 0}
                    </button>
                    <button class="btn-comment ${!options.allowInteractions ? 'disabled' : ''}" 
                            onclick="${options.allowInteractions ? `TeleBlogApp.showComments('${post.id}')` : ''}"
                            ${!options.allowInteractions ? 'disabled' : ''}>
                        💬 ${post.comments_count || 0}
                    </button>
                </div>
            </div>
        `).join('');
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>${this.isGuest ? 'Sample Posts (Guest Mode)' : 'Latest Posts'}</h2>
                    ${!this.isGuest && this.currentUser?.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : ''}
                </div>
                <div class="posts-list">
                    ${postsHtml}
                </div>
            </div>
        `;
    },

    // Display demo posts for guests
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

    // UPDATE HEADER USER INFO - FIXED VERSION
    updateHeaderUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) {
            console.error('❌ user-info element not found in header');
            // Create it if it doesn't exist
            this.createUserInfoHeader();
            return;
        }

        console.log('🔄 Updating header with user:', user);

        if (user.is_guest) {
            // Guest user display
            userInfo.innerHTML = `
                <div class="avatar guest">G</div>
                <span>Guest <span class="guest-badge">Limited Access</span></span>
            `;
            userInfo.title = "Guest User - Limited features";
            console.log('✅ Header set to GUEST mode');
        } else {
            // REAL USER - Get proper data from database
            const displayName = user.first_name || user.username || 'User';
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || displayName;
            const username = user.username ? `@${user.username}` : 'User';
            
            // Get first letter for avatar
            const firstLetter = (user.first_name?.charAt(0) || user.username?.charAt(0) || 'U').toUpperCase();
            
            // Determine avatar class based on user type
            let avatarClass = 'avatar';
            if (user.user_type === 'group_admin') {
                avatarClass += ' group-admin';
            } else if (user.user_type === 'channel_admin') {
                avatarClass += ' channel-admin';
            }

            userInfo.innerHTML = `
                <div class="${avatarClass}">${firstLetter}</div>
                <span>
                    ${fullName}
                    ${user.user_type !== 'general' ? 
                        `<span class="user-type-badge ${user.user_type}">${this.getUserTypeDisplayName(user.user_type)}</span>` : ''}
                </span>
            `;
            
            userInfo.title = `Telegram: ${username} | Name: ${fullName} | Type: ${this.getUserTypeDisplayName(user.user_type)}`;
            
            console.log('✅ Header updated with REAL USER data:', {
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type,
                firstLetter: firstLetter
            });
        }
    },

    // Create user info header if it doesn't exist
    createUserInfoHeader() {
        console.log('🔄 Creating user-info header element...');
        const header = document.querySelector('header');
        if (!header) return;
        
        const userInfo = document.createElement('div');
        userInfo.id = 'user-info';
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="avatar guest">G</div>
            <span>Guest <span class="guest-badge">Limited Access</span></span>
        `;
        
        // Add to header (usually after logo, before theme toggle)
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            header.insertBefore(userInfo, themeToggle);
        } else {
            header.appendChild(userInfo);
        }
        
        console.log('✅ Created user-info header element');
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

    // Debug functions
    showTelegramDebugInfo() {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            const debugInfo = {
                hasTelegram: true,
                initDataUnsafe: tg.initDataUnsafe,
                initData: tg.initData,
                user: tg.initDataUnsafe?.user,
                platform: tg.platform,
                version: tg.version
            };
            console.log('🔍 TELEGRAM DEBUG INFO:', debugInfo);
            alert(`Telegram Debug Info:\n\nUser: ${JSON.stringify(tg.initDataUnsafe?.user, null, 2)}\n\nCheck console for full details.`);
        } else {
            alert('❌ No Telegram WebApp detected');
        }
    },

    // Add debug button to header
    addDebugButton() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '🔍';
        debugBtn.title = 'Debug Telegram Data';
        debugBtn.style.cssText = `
            background: var(--accent-blue);
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        `;
        debugBtn.onclick = () => this.showTelegramDebugInfo();
        
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(debugBtn);
        }
    },

    // Utility functions
    getUserTypeDisplayName(userType) {
        const types = {
            'general': 'General User',
            'group_admin': 'Group Admin', 
            'channel_admin': 'Channel Admin',
            'guest': 'Guest'
        };
        return types[userType] || 'User';
    },

    showCreatePost() {
        this.showNotification('Create post feature coming soon!', 'info');
    },

    likePost(postId) {
        this.showNotification('Post liked!', 'success');
    },

    showComments(postId) {
        this.showNotification('Comments feature coming soon!', 'info');
    },

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
        // Simple notification
        const existingNotice = document.querySelector('.temp-notice');
        if (existingNotice) existingNotice.remove();
        
        const notice = document.createElement('div');
        notice.className = `temp-notice notification notification-${type}`;
        notice.innerHTML = `<span>${message}</span>`;
        notice.style.cssText = 'position:fixed; top:20px; right:20px; background:var(--bg-secondary); padding:1rem; border-radius:8px; z-index:10000; border-left:4px solid var(--accent-blue);';
        
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

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    formatDate(dateString) {
        if (!dateString) return 'Recently';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Recently';
        }
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


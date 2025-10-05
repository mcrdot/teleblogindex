// ds = a18e7735-2548-4cb5-b92e-0ef3a16cf582

// app.js - FIXED USER DATA LOADING FROM SUPABASE
console.log('🚀 TeleBlog Lite App Starting...');

// Global app state
window.TeleBlogApp = {
    currentUser: null,
    currentPage: 'feed',
    isNewUser: false,
    
    // Initialize the application
    async initializeApp() {
        try {
            console.log('🔧 Initializing TeleBlog application...');
            
            // Wait for configuration
            if (!window.AppConfig) {
                console.log('⏳ Waiting for configuration...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log('✅ Configuration loaded:', window.AppConfig?.environment);
            
            // Initialize Supabase
            await this.initializeSupabase();
            
            // Initialize Telegram and handle user enrollment
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
                
                // Test connection
                const connected = await window.SupabaseClient.testConnection();
                if (connected) {
                    console.log('✅ Supabase connection verified');
                } else {
                    console.error('❌ Supabase connection failed');
                    this.showError('Database connection failed. Using demo mode.');
                }
            }
        } else {
            console.error('❌ Supabase client not available');
            this.showError('Database service unavailable.');
        }
    },
    
    // Initialize Telegram and handle user enrollment
    async initializeTelegramAndEnrollUser() {
        if (window.Telegram && window.Telegram.WebApp) {
            try {
                const tg = window.Telegram.WebApp;
                console.log('✅ Telegram Web App detected');
                
                // Expand the app
                tg.expand();
                
                // Set theme colors
                tg.setHeaderColor('#ffffff');
                tg.setBackgroundColor('#ffffff');
                
                // Get user data from Telegram
                const userData = tg.initDataUnsafe?.user;
                if (userData) {
                    console.log('👤 Telegram user detected:', userData);
                    await this.handleUserEnrollment(userData);
                } else {
                    console.log('ℹ️ No Telegram user data available');
                    // Even if no Telegram data, try to load from session/local storage
                    await this.tryLoadExistingSession();
                }
                
            } catch (error) {
                console.warn('⚠️ Telegram init failed:', error);
                await this.tryLoadExistingSession();
            }
        } else {
            console.log('🌐 Running in web browser mode');
            await this.tryLoadExistingSession();
        }
    },
    
    // Try to load existing user session
    async tryLoadExistingSession() {
        try {
            // Check if we have a stored user ID
            const storedUserId = localStorage.getItem('teleblog-user-id');
            if (storedUserId && window.SupabaseClient) {
                console.log('🔍 Attempting to load stored user:', storedUserId);
                
                // Try to get user from Supabase by ID
                const supabase = window.SupabaseClient.getClient();
                if (supabase) {
                    const { data: user, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', storedUserId)
                        .single();
                    
                    if (!error && user) {
                        console.log('✅ Loaded user from storage:', user.username);
                        this.currentUser = user;
                        this.updateHeaderUserInfo(this.currentUser);
                        await this.loadInitialContent();
                        return;
                    }
                }
            }
            
            // If no stored session, show web mode
            this.showWebModeMessage();
            
        } catch (error) {
            console.error('❌ Session loading failed:', error);
            this.showWebModeMessage();
        }
    },
    
    // Complete user enrollment process - FIXED VERSION
    async handleUserEnrollment(telegramUser) {
        try {
            console.log('🔐 Starting user enrollment process...');
            console.log('📱 Telegram User Data:', {
                id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name
            });
            
            if (window.SupabaseClient && window.SupabaseClient.createUser) {
                // Step 1: Check if user exists in Supabase
                const existingUser = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
                
                if (existingUser) {
                    // User exists in Supabase - use the real data
                    console.log('✅ Existing Supabase user found:', {
                        id: existingUser.id,
                        username: existingUser.username,
                        first_name: existingUser.first_name,
                        user_type: existingUser.user_type
                    });
                    
                    this.currentUser = existingUser;
                    
                    // Store user ID for future sessions
                    localStorage.setItem('teleblog-user-id', existingUser.id);
                    
                    this.updateHeaderUserInfo(this.currentUser);
                    
                    // Check if user needs to complete profile
                    if (!existingUser.profile_completed) {
                        this.showUserTypeSelection(existingUser);
                    } else {
                        await this.loadInitialContent();
                    }
                } else {
                    // New user - create account in Supabase with Telegram data
                    console.log('🆕 Creating new user in Supabase with Telegram data...');
                    const newUser = await window.SupabaseClient.createUser(telegramUser);
                    
                    if (newUser) {
                        console.log('✅ New Supabase user created:', {
                            id: newUser.id,
                            username: newUser.username,
                            first_name: newUser.first_name,
                            user_type: newUser.user_type
                        });
                        
                        this.currentUser = newUser;
                        this.isNewUser = true;
                        
                        // Store user ID for future sessions
                        localStorage.setItem('teleblog-user-id', newUser.id);
                        
                        this.updateHeaderUserInfo(this.currentUser);
                        
                        // Show user type selection for new users
                        this.showUserTypeSelection(newUser);
                    } else {
                        console.error('❌ Failed to create user account in Supabase');
                        this.showError('Failed to create user account. Please try again.');
                    }
                }
            } else {
                console.error('❌ Supabase client not available for user creation');
                this.createDemoUser();
            }
        } catch (error) {
            console.error('❌ User enrollment failed:', error);
            this.createDemoUser();
        }
    },
    
    // Update user info in header - IMPROVED VERSION
    updateHeaderUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) {
            console.error('❌ user-info element not found in header');
            return;
        }
        
        console.log('🔄 Updating header with REAL user data:', {
            username: user.username,
            first_name: user.first_name,
            user_type: user.user_type
        });
        
        // Use REAL user data from Supabase, not fallback
        const displayName = user.first_name || user.username || 'User';
        const username = user.username ? `@${user.username}` : 'No username';
        
        // Update avatar with real user initial
        const avatar = userInfo.querySelector('.avatar');
        if (avatar) {
            const firstLetter = user.first_name?.charAt(0) || user.username?.charAt(0) || 'U';
            avatar.textContent = firstLetter.toUpperCase();
            avatar.title = `${displayName} (${username}) - ${this.getUserTypeDisplayName(user.user_type)}`;
            
            // Add visual indicator for user type
            avatar.className = 'avatar';
            if (user.user_type === 'group_admin') {
                avatar.classList.add('group-admin');
            } else if (user.user_type === 'channel_admin') {
                avatar.classList.add('channel-admin');
            }
        }
        
        // Update user text with REAL data
        const span = userInfo.querySelector('span');
        if (span) {
            const typeBadge = user.user_type !== 'general' ? 
                ` <span class="user-type-badge ${user.user_type}">${this.getUserTypeDisplayName(user.user_type)}</span>` : '';
            
            span.innerHTML = `${displayName}${typeBadge}`;
        }
        
        // Update user info title/tooltip with real Telegram data
        userInfo.title = `Telegram: ${username} | Name: ${displayName} | Type: ${this.getUserTypeDisplayName(user.user_type)}`;
        
        console.log('✅ Header updated with REAL Supabase user data');
    },
    
    // Show user type selection modal
    showUserTypeSelection(user) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        // Show the REAL user's name in the welcome message
        const userName = user.first_name || user.username || 'there';
        
        pageContent.innerHTML = `
            <div class="enrollment-container">
                <div class="enrollment-header">
                    <h2>👋 Welcome ${userName}!</h2>
                    <p>Your Telegram account is connected. Choose how you plan to use TeleBlog:</p>
                    <div class="user-info-summary">
                        <p><strong>Telegram:</strong> @${user.username || 'no-username'}</p>
                        <p><strong>Name:</strong> ${user.first_name || 'Not provided'} ${user.last_name || ''}</p>
                    </div>
                </div>
                
                <div class="user-type-selection">
                    <div class="user-type-card" data-type="general">
                        <div class="type-icon">👤</div>
                        <h3>General User</h3>
                        <p>Read posts, interact with content</p>
                        <ul>
                            <li>Read all published posts</li>
                            <li>Like and comment on posts</li>
                            <li>Personal profile</li>
                            <li>Basic interactions</li>
                        </ul>
                        <button class="btn type-select-btn" onclick="TeleBlogApp.selectUserType('general')">
                            Continue as General
                        </button>
                    </div>
                    
                    <div class="user-type-card" data-type="group_admin">
                        <div class="type-icon">👥</div>
                        <h3>Group Admin</h3>
                        <p>Manage Telegram group content</p>
                        <ul>
                            <li>All General features</li>
                            <li>Create and manage posts</li>
                            <li>Group announcements</li>
                            <li>Content scheduling</li>
                        </ul>
                        <button class="btn type-select-btn" onclick="TeleBlogApp.selectUserType('group_admin')">
                            Select Group Admin
                        </button>
                    </div>
                    
                    <div class="user-type-card" data-type="channel_admin">
                        <div class="type-icon">📢</div>
                        <h3>Channel Admin</h3>
                        <p>Manage Telegram channel content</p>
                        <ul>
                            <li>All General features</li>
                            <li>Create broadcast posts</li>
                            <li>Channel management</li>
                            <li>Advanced scheduling</li>
                        </ul>
                        <button class="btn type-select-btn" onclick="TeleBlogApp.selectUserType('channel_admin')">
                            Select Channel Admin
                        </button>
                    </div>
                </div>
                
                <div class="enrollment-footer">
                    <p class="note">You can change your account type later in profile settings</p>
                </div>
            </div>
        `;
    },
    
    // Handle user type selection
    async selectUserType(userType) {
        try {
            console.log('🎯 User selected type:', userType);
            
            if (!this.currentUser) {
                console.error('❌ No current user for type selection');
                return;
            }
            
            // Show loading state
            this.showLoading('Setting up your account...');
            
            // Update user type in Supabase
            if (window.SupabaseClient && window.SupabaseClient.updateUserType) {
                const success = await window.SupabaseClient.updateUserType(this.currentUser.id, userType);
                
                if (success) {
                    console.log('✅ User type updated successfully in Supabase');
                    
                    // Update local user object with REAL data
                    this.currentUser.user_type = userType;
                    this.currentUser.profile_completed = true;
                    
                    // UPDATE HEADER WITH REAL USER DATA
                    this.updateHeaderUserInfo(this.currentUser);
                    
                    // Show success message with real username
                    const userName = this.currentUser.first_name || this.currentUser.username || 'User';
                    this.showNotification(`Welcome ${userName}! Account setup complete as ${this.getUserTypeDisplayName(userType)}`, 'success');
                    
                    // Load main content
                    await this.loadInitialContent();
                    
                } else {
                    console.error('❌ Failed to update user type in Supabase');
                    this.showError('Failed to complete setup. Please try again.');
                }
            } else {
                console.warn('⚠️ Supabase update not available, using local update');
                this.currentUser.user_type = userType;
                this.currentUser.profile_completed = true;
                this.updateHeaderUserInfo(this.currentUser);
                await this.loadInitialContent();
            }
            
        } catch (error) {
            console.error('❌ User type selection failed:', error);
            this.showError('Setup failed. Please refresh and try again.');
        }
    },
    
    // Get display name for user type
    getUserTypeDisplayName(userType) {
        const types = {
            'general': 'General User',
            'group_admin': 'Group Admin', 
            'channel_admin': 'Channel Admin'
        };
        return types[userType] || 'User';
    },
    
    // Create demo user for web mode (only when no real user available)
    createDemoUser() {
        console.log('🔄 Creating demo user (no real user data available)');
        this.currentUser = {
            id: 'demo-user',
            telegram_id: 0,
            first_name: 'Guest',
            username: 'guest',
            user_type: 'general',
            profile_completed: true
        };
        this.updateHeaderUserInfo(this.currentUser);
        this.loadInitialContent();
    },
    
    // Show web mode message
    showWebModeMessage() {
        console.log('🌐 Showing web mode (no Telegram user data)');
        this.createDemoUser();
    },
    
    // Load initial content
    async loadInitialContent() {
        try {
            console.log('📝 Loading initial content...');
            this.showLoading('Loading posts...');
            
            // Load posts for feed
            await this.loadPosts();
            
        } catch (error) {
            console.error('❌ Content loading failed:', error);
            this.showError('Failed to load content.');
        }
    },
    
    // Load and display posts
    async loadPosts() {
        try {
            let posts = [];
            
            // Try to get real posts from Supabase
            if (window.SupabaseClient && window.SupabaseClient.getPublishedPosts) {
                posts = await window.SupabaseClient.getPublishedPosts(10, 0);
            }
            
            // If no posts, show demo content
            if (!posts || posts.length === 0) {
                console.log('ℹ️ No posts found - showing demo content');
                posts = this.getDemoPosts();
            }
            
            this.displayPosts(posts);
            
        } catch (error) {
            console.error('❌ Posts loading failed:', error);
            this.showError('Failed to load posts.');
        }
    },
    
    // Display posts in UI
    displayPosts(posts) {
        const container = document.getElementById('page-content');
        if (!container) {
            console.error('❌ Page content container not found');
            return;
        }
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No Posts Yet</h3>
                    <p>Be the first to create a post!</p>
                    ${this.currentUser?.user_type !== 'general' ? 
                        `<button class="btn primary" onclick="TeleBlogApp.loadPage('editor')">Create First Post</button>` : 
                        ''
                    }
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="posts-container">
                <div class="feed-header">
                    <h2>Latest Posts</h2>
                    ${this.currentUser?.user_type !== 'general' ? 
                        `<button class="btn primary" onclick="TeleBlogApp.loadPage('editor')">Create Post</button>` : 
                        ''
                    }
                </div>
                <div class="posts-list">
        `;
        
        posts.forEach(post => {
            html += `
                <div class="post-card">
                    <div class="post-header">
                        <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
                        <div class="post-meta">
                            <span class="post-author">By ${this.escapeHtml(post.user?.first_name || 'Unknown')}</span>
                            <span class="post-date">${this.formatDate(post.published_at)}</span>
                            ${post.user?.user_type && post.user.user_type !== 'general' ? 
                                `<span class="user-type-badge ${post.user.user_type}">${this.getUserTypeDisplayName(post.user.user_type)}</span>` : 
                                ''
                            }
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${this.escapeHtml(post.excerpt || post.content?.substring(0, 150) || 'No content available')}...</p>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        this.hideLoading();
    },
    
    // Show user profile with REAL data
    showUserProfile() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        // Use REAL user data from Supabase
        const user = this.currentUser;
        const userName = user.first_name || 'User';
        const userUsername = user.username ? `@${user.username}` : 'No username';
        const userFullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Not provided';
        
        pageContent.innerHTML = `
            <div class="page-profile">
                <h2>User Profile</h2>
                <div class="profile-card">
                    <div class="profile-avatar">${user.first_name?.charAt(0) || user.username?.charAt(0) || 'U'}</div>
                    <div class="profile-info">
                        <h3>${userName}</h3>
                        <p>${userUsername}</p>
                        <p><strong>Full Name:</strong> ${userFullName}</p>
                        <p><strong>Telegram ID:</strong> ${user.telegram_id || 'N/A'}</p>
                        <p class="user-type ${user.user_type || 'general'}">
                            ${this.getUserTypeDisplayName(user.user_type || 'general')}
                        </p>
                    </div>
                </div>
                
                ${user.user_type === 'general' ? `
                    <div class="upgrade-section">
                        <h3>Upgrade Your Account</h3>
                        <p>Get access to post creation and advanced features</p>
                        <div class="upgrade-options">
                            <button class="btn" onclick="TeleBlogApp.selectUserType('group_admin')">
                                Become Group Admin
                            </button>
                            <button class="btn primary" onclick="TeleBlogApp.selectUserType('channel_admin')">
                                Become Channel Admin
                            </button>
                        </div>
                    </div>
                ` : ''}
                
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
            </div>
        `;
    },
    
    // Utility functions (keep the same as before)
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
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
    },
    
    showLoading(message) {
        let loader = document.getElementById('page-content');
        if (loader) {
            loader.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    },
    
    hideLoading() {
        // Loading state is handled by content replacement
    },
    
    showError(message) {
        const container = document.getElementById('page-content');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h3>Something went wrong</h3>
                    <p>${message}</p>
                    <button onclick="TeleBlogApp.initializeApp()" class="btn">Try Again</button>
                </div>
            `;
        }
    }
};

// Start the application when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.TeleBlogApp.initializeApp();
    });
} else {
    window.TeleBlogApp.initializeApp();
}
// app.js - WITH PROPER HEADER USER SYNC
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
                
                // Get user data
                const userData = tg.initDataUnsafe?.user;
                if (userData) {
                    console.log('👤 Telegram user detected:', userData);
                    await this.handleUserEnrollment(userData);
                } else {
                    console.log('ℹ️ No Telegram user data - running in web mode');
                    this.showWebModeMessage();
                }
                
            } catch (error) {
                console.warn('⚠️ Telegram init failed:', error);
                this.showWebModeMessage();
            }
        } else {
            console.log('🌐 Running in web browser mode');
            this.showWebModeMessage();
        }
    },
    
    // Complete user enrollment process
    async handleUserEnrollment(telegramUser) {
        try {
            console.log('🔐 Starting user enrollment process...');
            
            if (window.SupabaseClient && window.SupabaseClient.createUser) {
                // Step 1: Check if user exists
                const existingUser = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
                
                if (existingUser) {
                    // User exists - update session and proceed
                    console.log('✅ Existing user found:', existingUser.id);
                    this.currentUser = existingUser;
                    this.updateHeaderUserInfo(this.currentUser); // UPDATE HEADER
                    
                    // Check if user needs to complete profile
                    if (!existingUser.profile_completed) {
                        this.showUserTypeSelection(existingUser);
                    } else {
                        await this.loadInitialContent();
                    }
                } else {
                    // New user - create account
                    console.log('🆕 New user detected, creating account...');
                    const newUser = await window.SupabaseClient.createUser(telegramUser);
                    
                    if (newUser) {
                        this.currentUser = newUser;
                        this.isNewUser = true;
                        console.log('✅ New user created:', newUser.id);
                        this.updateHeaderUserInfo(this.currentUser); // UPDATE HEADER
                        
                        // Show user type selection for new users
                        this.showUserTypeSelection(newUser);
                    } else {
                        console.error('❌ Failed to create user account');
                        this.showError('Failed to create user account. Please try again.');
                    }
                }
            } else {
                this.createDemoUser();
            }
        } catch (error) {
            console.error('❌ User enrollment failed:', error);
            this.createDemoUser();
        }
    },
    
    // Update user info in header - ENHANCED VERSION
    updateHeaderUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) {
            console.error('❌ user-info element not found in header');
            return;
        }
        
        console.log('🔄 Updating header with user:', user);
        
        // Update avatar
        const avatar = userInfo.querySelector('.avatar');
        if (avatar) {
            const firstLetter = user.first_name?.charAt(0) || user.username?.charAt(0) || 'U';
            avatar.textContent = firstLetter.toUpperCase();
            avatar.title = `${user.first_name || 'User'} - ${this.getUserTypeDisplayName(user.user_type)}`;
            
            // Add visual indicator for user type
            avatar.className = 'avatar';
            if (user.user_type === 'group_admin') {
                avatar.classList.add('group-admin');
            } else if (user.user_type === 'channel_admin') {
                avatar.classList.add('channel-admin');
            }
        }
        
        // Update user text
        const span = userInfo.querySelector('span');
        if (span) {
            const userName = user.first_name || user.username || 'User';
            const typeBadge = user.user_type !== 'general' ? 
                ` <span class="user-type-badge ${user.user_type}">${this.getUserTypeDisplayName(user.user_type)}</span>` : '';
            
            span.innerHTML = `${userName}${typeBadge}`;
        }
        
        // Update user info title/tooltip
        userInfo.title = `Telegram ID: ${user.telegram_id} | Username: @${user.username || 'none'} | Type: ${this.getUserTypeDisplayName(user.user_type)}`;
        
        console.log('✅ Header updated with user data');
    },
    
    // Show user type selection modal
    showUserTypeSelection(user) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="enrollment-container">
                <div class="enrollment-header">
                    <h2>👋 Welcome to TeleBlog!</h2>
                    <p>Choose how you plan to use this platform</p>
                </div>
                
                <div class="user-type-selection">
                    <div class="user-type-card" data-type="general">
                        <div class="type-icon">👤</div>
                        <h3>General User</h3>
                        <p>Read posts, interact with content, and create basic posts</p>
                        <ul>
                            <li>Read all published posts</li>
                            <li>Like and comment on posts</li>
                            <li>Create basic blog posts</li>
                            <li>Personal profile</li>
                        </ul>
                        <button class="btn type-select-btn" onclick="TeleBlogApp.selectUserType('general')">
                            Select General
                        </button>
                    </div>
                    
                    <div class="user-type-card" data-type="group_admin">
                        <div class="type-icon">👥</div>
                        <h3>Group Admin</h3>
                        <p>Manage Telegram group content and announcements</p>
                        <ul>
                            <li>All General features</li>
                            <li>Group-specific posts</li>
                            <li>Announcement scheduling</li>
                            <li>Member engagement analytics</li>
                        </ul>
                        <button class="btn type-select-btn" onclick="TeleBlogApp.selectUserType('group_admin')">
                            Select Group Admin
                        </button>
                    </div>
                    
                    <div class="user-type-card" data-type="channel_admin">
                        <div class="type-icon">📢</div>
                        <h3>Channel Admin</h3>
                        <p>Manage Telegram channel content and broadcasts</p>
                        <ul>
                            <li>All General features</li>
                            <li>Channel-specific posts</li>
                            <li>Broadcast scheduling</li>
                            <li>Subscriber analytics</li>
                        </ul>
                        <button class="btn type-select-btn" onclick="TeleBlogApp.selectUserType('channel_admin')">
                            Select Channel Admin
                        </button>
                    </div>
                </div>
                
                <div class="enrollment-footer">
                    <p class="note">You can change this later in your profile settings</p>
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
                    console.log('✅ User type updated successfully');
                    
                    // Update local user object
                    this.currentUser.user_type = userType;
                    this.currentUser.profile_completed = true;
                    
                    // UPDATE HEADER WITH NEW TYPE
                    this.updateHeaderUserInfo(this.currentUser);
                    
                    // Show success message
                    this.showNotification(`Account setup complete! Welcome as ${this.getUserTypeDisplayName(userType)}`, 'success');
                    
                    // Load main content
                    await this.loadInitialContent();
                    
                } else {
                    console.error('❌ Failed to update user type');
                    this.showError('Failed to complete setup. Please try again.');
                }
            } else {
                // Fallback for demo mode
                this.currentUser.user_type = userType;
                this.currentUser.profile_completed = true;
                this.updateHeaderUserInfo(this.currentUser); // UPDATE HEADER
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
    
    // Create demo user for web mode
    createDemoUser() {
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
    
    // Demo posts for when database is unavailable
    getDemoPosts() {
        return [
            {
                id: 'demo-1',
                title: 'Welcome to TeleBlog!',
                content: 'This is a demo post showing how TeleBlog works. Create your own posts to get started!',
                excerpt: 'Welcome to our blogging platform',
                published_at: new Date().toISOString(),
                user: {
                    first_name: 'Admin',
                    username: 'admin',
                    user_type: 'channel_admin'
                }
            },
            {
                id: 'demo-2', 
                title: 'Getting Started Guide',
                content: 'Learn how to create and share your posts with the TeleBlog community.',
                excerpt: 'How to use TeleBlog',
                published_at: new Date(Date.now() - 86400000).toISOString(),
                user: {
                    first_name: 'Support',
                    username: 'support',
                    user_type: 'group_admin'
                }
            }
        ];
    },
    
    // Navigation function
    loadPage(page) {
        console.log('Loading page:', page);
        this.currentPage = page;
        
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        switch(page) {
            case 'feed':
                this.loadPosts();
                break;
            case 'editor':
                if (this.currentUser?.user_type === 'general') {
                    this.showNotification('General users cannot create posts yet. Upgrade your account type in profile.', 'error');
                    return;
                }
                pageContent.innerHTML = `
                    <div class="page-editor">
                        <h2>Create Post</h2>
                        <p>Post creation feature coming soon!</p>
                        <div class="demo-editor">
                            <input type="text" placeholder="Post title" class="editor-input">
                            <textarea placeholder="Write your post content..." class="editor-textarea"></textarea>
                            <button class="btn primary">Publish Post</button>
                        </div>
                    </div>
                `;
                break;
            case 'profile':
                this.showUserProfile();
                break;
            default:
                this.loadPosts();
        }
    },
    
    // Show user profile with type management
    showUserProfile() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="page-profile">
                <h2>User Profile</h2>
                <div class="profile-card">
                    <div class="profile-avatar">${this.currentUser?.first_name?.charAt(0) || 'U'}</div>
                    <div class="profile-info">
                        <h3>${this.currentUser?.first_name || 'Guest'}</h3>
                        <p>@${this.currentUser?.username || 'guest'}</p>
                        <p class="user-type ${this.currentUser?.user_type || 'general'}">
                            ${this.getUserTypeDisplayName(this.currentUser?.user_type || 'general')}
                        </p>
                    </div>
                </div>
                
                ${this.currentUser?.user_type === 'general' ? `
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
    
    // Show notification
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
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },
    
    // Utility functions
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
    },
    
    showWebModeMessage() {
        console.log('🌐 Web mode activated');
        this.createDemoUser();
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
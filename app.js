// ds = 4c4f9b72-7ba2-4440-b4a6-4dced0d724ad

// app.js - COMPLETE UPDATED VERSION WITH NEW WELCOME SYSTEM
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
            
            // Wait for configuration
            if (!window.AppConfig) {
                console.log('⏳ Waiting for configuration...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log('✅ Configuration loaded:', window.AppConfig?.environment);
            
            // Initialize Supabase
            await this.initializeSupabase();
            
            // Initialize Telegram and handle user enrollment - UPDATED FLOW
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
            
            // DEBUG: Log all available Telegram data
            console.log('🔍 FULL Telegram WebApp Data:', {
                initData: tg.initData,
                initDataUnsafe: tg.initDataUnsafe,
                platform: tg.platform,
                version: tg.version,
                colorScheme: tg.colorScheme
            });
            
            // IMPROVED: Get Telegram user data with multiple fallbacks
            let telegramUser = null;
            let telegramUserId = null;
            
            // Method 1: Direct user object (most reliable)
            if (tg.initDataUnsafe?.user) {
                telegramUser = tg.initDataUnsafe.user;
                telegramUserId = telegramUser.id;
                console.log('✅ Found Telegram user via initDataUnsafe.user:', telegramUser);
            }
            // Method 2: Parse initData string manually
            else if (tg.initData) {
                console.log('🔄 Attempting to parse initData string...');
                const params = new URLSearchParams(tg.initData);
                const userParam = params.get('user');
                if (userParam) {
                    try {
                        telegramUser = JSON.parse(decodeURIComponent(userParam));
                        telegramUserId = telegramUser.id;
                        console.log('✅ Found Telegram user via initData parsing:', telegramUser);
                    } catch (e) {
                        console.error('❌ Failed to parse user from initData:', e);
                    }
                }
            }
            // Method 3: Check for user in start_param (for deep links)
            else if (tg.startParam) {
                console.log('🔄 Checking start_param for user data...');
                try {
                    const startData = JSON.parse(decodeURIComponent(tg.startParam));
                    if (startData.user) {
                        telegramUser = startData.user;
                        telegramUserId = telegramUser.id;
                        console.log('✅ Found Telegram user via startParam:', telegramUser);
                    }
                } catch (e) {
                    console.log('ℹ️ No user data in start_param');
                }
            }
            
            if (telegramUserId) {
                console.log('🎯 Telegram User ID confirmed:', telegramUserId);
                console.log('📝 Telegram User Details:', {
                    id: telegramUser.id,
                    username: telegramUser.username,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name
                });
                
                // Check if user exists in database
                const existingUser = await this.checkUserExistence(telegramUserId);
                
                if (existingUser) {
                    // CASE 1: Existing User - Direct login
                    console.log('🔄 Processing existing user:', existingUser.username);
                    await this.handleExistingUser(existingUser);
                } else {
                    // CASE 2: New User - Show welcome options
                    console.log('🆕 Processing new Telegram user');
                    await this.showWelcomeOptions(telegramUser);
                }
            } else {
                // No Telegram user data - Show detailed error
                console.error('❌ CRITICAL: No Telegram user data available in any method');
                console.log('Available data sources:', {
                    hasInitData: !!tg.initData,
                    hasInitDataUnsafe: !!tg.initDataUnsafe,
                    initDataUnsafeKeys: tg.initDataUnsafe ? Object.keys(tg.initDataUnsafe) : [],
                    startParam: tg.startParam
                });
                
                // Try to load existing session from localStorage as fallback
                await this.tryLoadExistingSession();
            }
            
        } catch (error) {
            console.error('⚠️ Telegram init failed:', error);
            // Fallback to session loading
            await this.tryLoadExistingSession();
        }
    } else {
        // Web browser - Guest mode
        console.log('🌐 Running in web browser mode');
        this.enterGuestMode();
    }
},

// Add this missing function for session fallback
async tryLoadExistingSession() {
    try {
        // Check if we have a stored user ID from previous session
        const storedUserId = localStorage.getItem('teleblog-user-id');
        if (storedUserId && window.SupabaseClient) {
            console.log('🔍 Attempting to load stored user session:', storedUserId);
            
            const supabase = window.SupabaseClient.getClient();
            if (supabase) {
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', storedUserId)
                    .single();
                
                if (!error && user) {
                    console.log('✅ Loaded user from stored session:', user.username);
                    this.currentUser = user;
                    this.isGuest = false;
                    this.updateHeaderUserInfo(this.currentUser);
                    await this.loadUserContent();
                    return;
                }
            }
        }
        
        // If no stored session, enter guest mode
        console.log('❌ No existing session found, entering guest mode');
        this.enterGuestMode();
        
    } catch (error) {
        console.error('❌ Session loading failed:', error);
        this.enterGuestMode();
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
                    this.showError('Database connection failed.');
                }
            }
        } else {
            console.error('❌ Supabase client not available');
            this.showError('Database service unavailable.');
        }
    },
    
    // Initialize Telegram and handle user enrollment - UPDATED FLOW
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
                
                // Get Telegram user data
                const telegramUser = tg.initDataUnsafe?.user;
                console.log('📱 Telegram User Data:', telegramUser);
                
                if (telegramUser?.id) {
                    console.log('🎯 Telegram User ID found:', telegramUser.id);
                    
                    // Check if user exists in database
                    const existingUser = await this.checkUserExistence(telegramUser.id);
                    
                    if (existingUser) {
                        // CASE 1: Existing User - Direct login
                        await this.handleExistingUser(existingUser);
                    } else {
                        // CASE 2: New User - Show welcome options
                        await this.showWelcomeOptions(telegramUser);
                    }
                } else {
                    // No Telegram user data - Guest mode
                    console.log('❌ No Telegram user data available');
                    this.enterGuestMode();
                }
                
            } catch (error) {
                console.warn('⚠️ Telegram init failed:', error);
                this.enterGuestMode();
            }
        } else {
            // Web browser - Guest mode
            console.log('🌐 Running in web browser mode');
            this.enterGuestMode();
        }
    },
    
    // Check if user exists in database
    async checkUserExistence(telegramId) {
        try {
            if (!window.SupabaseClient) {
                console.warn('Supabase client not available for user check');
                return null;
            }
            
            const user = await window.SupabaseClient.getUserByTelegramId(telegramId);
            console.log('🔍 User existence check:', user ? 'User found' : 'User not found');
            return user;
        } catch (error) {
            console.error('User check failed:', error);
            return null;
        }
    },
    
    // Handle existing user - Direct login
    async handleExistingUser(user) {
        console.log('✅ Logging in existing user:', {
            id: user.id,
            username: user.username,
            user_type: user.user_type
        });
        
        this.currentUser = user;
        this.isGuest = false;
        
        // Store user ID for future sessions
        localStorage.setItem('teleblog-user-id', user.id);
        
        // Update UI with real user data
        this.updateHeaderUserInfo(user);
        
        // Load user-specific content
        await this.loadUserContent();
        
        // Show welcome back notification
        const userName = user.first_name || user.username || 'User';
        this.showNotification(`Welcome back, ${userName}!`, 'success');
    },
    
    // Show welcome options for new users
    async showWelcomeOptions(telegramUser) {
        console.log('🆕 Showing welcome options for new user');
        
        const welcomeHTML = `
            <div class="welcome-overlay active">
                <div class="welcome-card">
                    <div class="welcome-header">
                        <div class="welcome-icon">👋</div>
                        <h2>Welcome to TeleBlog!</h2>
                        <p>We found your Telegram account: <strong>@${telegramUser.username || 'User'}</strong></p>
                    </div>
                    
                    <div class="welcome-options">
                        <!-- Option A: Quick Guest Access -->
                        <div class="welcome-option guest-option">
                            <div class="option-icon">🔍</div>
                            <div class="option-content">
                                <h3>Quick Explore</h3>
                                <p>Browse limited content as guest</p>
                                <ul>
                                    <li>✅ View 5 sample posts</li>
                                    <li>❌ No interactions</li>
                                    <li>❌ No personalization</li>
                                    <li>⏱️ Session only</li>
                                </ul>
                            </div>
                            <button class="btn btn-outline" onclick="TeleBlogApp.enterGuestMode()">
                                Explore as Guest
                            </button>
                        </div>
                        
                        <!-- Option B: Full Membership -->
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
                                    <li>✅ Cross-device sync</li>
                                </ul>
                            </div>
                            <button class="btn btn-primary" onclick="TeleBlogApp.createMemberAccount(${JSON.stringify(telegramUser).replace(/"/g, '&quot;')})">
                                Become Member
                            </button>
                        </div>
                    </div>
                    
                    <div class="welcome-footer">
                        <p><small>No personal data stored without your consent</small></p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', welcomeHTML);
    },
    
    // Create member account
    async createMemberAccount(telegramUser) {
        try {
            this.showLoading('Creating your account...');
            
            const userData = {
                telegram_id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
                is_premium: telegramUser.is_premium || false,
                user_type: 'general',
                profile_completed: false,
                membership_status: 'active'
            };
            
            console.log('📝 Creating member account:', userData);
            
            const newUser = await window.SupabaseClient.createUser(userData);
            
            if (newUser) {
                this.currentUser = newUser;
                this.isGuest = false;
                this.closeWelcomeModal();
                
                // Store user ID
                localStorage.setItem('teleblog-user-id', newUser.id);
                
                // Show account type selection
                this.showUserTypeSelection(newUser);
            } else {
                throw new Error('Failed to create user account');
            }
        } catch (error) {
            console.error('❌ Account creation failed:', error);
            this.showError('Failed to create account. Please try again.');
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
        
        // Show guest limitations
        this.showNotification('Exploring as Guest - Limited features available', 'info');
    },
    
    // Close welcome modal
    closeWelcomeModal() {
        const modal = document.querySelector('.welcome-overlay');
        if (modal) modal.remove();
    },
    
    // Load guest content (limited)
    async loadGuestContent() {
        try {
            this.showLoading('Loading content...');
            
            // Load limited content for guests (max 5 posts)
            let posts = [];
            if (window.SupabaseClient && window.SupabaseClient.getPosts) {
                posts = await window.SupabaseClient.getPosts(5);
            }
            
            if (posts.length === 0) {
                // Show demo posts if no real posts
                this.displayDemoPosts({ allowInteractions: false });
            } else {
                this.displayPosts(posts, { allowInteractions: false });
            }
        } catch (error) {
            console.error('Failed to load guest content:', error);
            this.displayDemoPosts({ allowInteractions: false });
        }
    },
    
    // Load user content (full access)
    async loadUserContent() {
        try {
            this.showLoading('Loading your content...');
            
            let posts = [];
            if (window.SupabaseClient && window.SupabaseClient.getPosts) {
                posts = await window.SupabaseClient.getPosts(20);
            }
            
            if (posts.length === 0) {
                this.displayDemoPosts({ allowInteractions: true });
            } else {
                this.displayPosts(posts, { allowInteractions: true });
            }
        } catch (error) {
            console.error('Failed to load user content:', error);
            this.displayDemoPosts({ allowInteractions: true });
        }
    },
    
    // Show user type selection
    showUserTypeSelection(user) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        const userName = user.first_name || 'there';
        const userFullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
        const userUsername = user.username ? `@${user.username}` : 'No username';
        
        pageContent.innerHTML = `
            <div class="enrollment-container">
                <div class="enrollment-header">
                    <h2>👋 Welcome ${userName}!</h2>
                    <p>Choose how you plan to use TeleBlog:</p>
                    <div class="user-info-summary">
                        <p><strong>Telegram Username:</strong> ${userUsername}</p>
                        <p><strong>Display Name:</strong> ${userFullName}</p>
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
            
            if (!this.currentUser || this.currentUser.is_guest) {
                console.error('❌ No valid user for type selection');
                return;
            }
            
            this.showLoading('Setting up your account...');
            
            // Update user type in Supabase
            if (window.SupabaseClient && window.SupabaseClient.updateUserType) {
                const success = await window.SupabaseClient.updateUserType(this.currentUser.id, userType);
                
                if (success) {
                    console.log('✅ User type updated successfully');
                    
                    // Update local user object
                    this.currentUser.user_type = userType;
                    this.currentUser.profile_completed = true;
                    
                    // Update header
                    this.updateHeaderUserInfo(this.currentUser);
                    
                    // Show success
                    const userName = this.currentUser.first_name || this.currentUser.username || 'User';
                    this.showNotification(`Welcome ${userName}! Setup complete as ${this.getUserTypeDisplayName(userType)}`, 'success');
                    
                    // Load main content
                    await this.loadUserContent();
                    
                } else {
                    console.error('❌ Failed to update user type');
                    this.showError('Failed to complete setup. Please try again.');
                }
            }
            
        } catch (error) {
            console.error('❌ User type selection failed:', error);
            this.showError('Setup failed. Please refresh and try again.');
        }
    },
    
    // Update user info in header - IMPROVED VERSION
updateHeaderUserInfo(user) {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) {
        console.error('❌ user-info element not found in header');
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
    } else {
        // Member user display - USING REAL DATA FROM DATABASE
        const displayName = user.first_name || user.username || 'User';
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || displayName;
        const username = user.username ? `@${user.username}` : 'User';
        
        // Determine avatar class based on user type
        const avatarClass = user.user_type === 'group_admin' ? 'group-admin' : 
                           user.user_type === 'channel_admin' ? 'channel-admin' : '';
        
        userInfo.innerHTML = `
            <div class="avatar ${avatarClass}">${displayName.charAt(0).toUpperCase()}</div>
            <span>
                ${fullName} 
                ${user.user_type !== 'general' ? 
                    `<span class="user-type-badge ${user.user_type}">${this.getUserTypeDisplayName(user.user_type)}</span>` : ''}
            </span>
        `;
        userInfo.title = `Telegram: ${username} | Type: ${this.getUserTypeDisplayName(user.user_type)}`;
        
        console.log('✅ Header updated with REAL user data:', {
            username: user.username,
            first_name: user.first_name,
            user_type: user.user_type
        });
    }
},
    
    // Display posts with interaction controls
    displayPosts(posts, options = { allowInteractions: true }) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        if (!posts || posts.length === 0) {
            pageContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No posts yet</h3>
                    <p>Be the first to create a post!</p>
                    ${!this.isGuest && this.currentUser?.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create First Post</button>' : 
                        '<p>Follow groups/channels to see their posts here.</p>'
                    }
                </div>
            `;
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
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : ''
                    }
                </div>
                <div class="posts-list">
                    ${postsHtml}
                </div>
                ${this.isGuest ? `
                    <div class="guest-upgrade-prompt">
                        <p>Want to like, comment, and access all features?</p>
                        <button class="btn primary" onclick="TeleBlogApp.initializeApp()">Become a Member</button>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    // Display demo posts
    displayDemoPosts(options = { allowInteractions: true }) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>${this.isGuest ? 'Sample Posts (Guest Mode)' : 'Latest Posts'}</h2>
                    ${!this.isGuest && this.currentUser?.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : ''
                    }
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
                            <p>Welcome to TeleBlog! 🎉 This is a demo post. When you have real posts from your groups/channels, they will appear here.</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-like ${!options.allowInteractions ? 'disabled' : ''}">❤️ 12</button>
                            <button class="btn-comment ${!options.allowInteractions ? 'disabled' : ''}">💬 3</button>
                        </div>
                    </div>
                    
                    <div class="post-card ${!options.allowInteractions ? 'guest-mode' : ''}">
                        <div class="post-header">
                            <div class="post-author">
                                <div class="author-avatar">E</div>
                                <div class="author-info">
                                    <strong>Example User</strong>
                                    <span class="post-date">2 hours ago</span>
                                </div>
                            </div>
                        </div>
                        <div class="post-content">
                            <p>This platform connects your Telegram groups and channels to create a unified blogging experience. Start by creating posts from your admin accounts!</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-like ${!options.allowInteractions ? 'disabled' : ''}">❤️ 8</button>
                            <button class="btn-comment ${!options.allowInteractions ? 'disabled' : ''}">💬 1</button>
                        </div>
                    </div>
                </div>
                ${this.isGuest ? `
                    <div class="guest-upgrade-prompt">
                        <p>Want to like, comment, and access all features?</p>
                        <button class="btn primary" onclick="TeleBlogApp.initializeApp()">Become a Member</button>
                    </div>
                ` : ''}
            </div>
        `;
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
        // Implementation for create post
        this.showNotification('Create post feature coming soon!', 'info');
    },
    
    likePost(postId) {
        this.showNotification('Post liked!', 'success');
    },
    
    showComments(postId) {
        this.showNotification('Comments feature coming soon!', 'info');
    },
    
    // Existing utility functions
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
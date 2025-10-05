// ds = a18e7735-2548-4cb5-b92e-0ef3a16cf582

// app.js - FIXED TELEGRAM USER DATA RETRIEVAL
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
                    this.showError('Database connection failed.');
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
                
                // Get INIT DATA from Telegram - this contains user information
                console.log('📱 Telegram WebApp Init Data:', tg.initData);
                console.log('👤 Telegram WebApp Init Data Unsafe:', tg.initDataUnsafe);
                console.log('🔐 Telegram WebApp Init Data Params:', tg.initDataUnsafe?.user);
                
                // Try multiple ways to get Telegram user ID
                let telegramUserId = null;
                let telegramUserData = null;
                
                // Method 1: Direct user object
                if (tg.initDataUnsafe?.user) {
                    telegramUserData = tg.initDataUnsafe.user;
                    telegramUserId = telegramUserData.id;
                    console.log('✅ Found Telegram user via initDataUnsafe.user:', telegramUserData);
                }
                // Method 2: Parse initData string
                else if (tg.initData) {
                    const params = new URLSearchParams(tg.initData);
                    const userParam = params.get('user');
                    if (userParam) {
                        try {
                            telegramUserData = JSON.parse(decodeURIComponent(userParam));
                            telegramUserId = telegramUserData.id;
                            console.log('✅ Found Telegram user via initData parsing:', telegramUserData);
                        } catch (e) {
                            console.error('❌ Failed to parse user from initData:', e);
                        }
                    }
                }
                // Method 3: Check for user in query parameters (fallback)
                else {
                    const urlParams = new URLSearchParams(window.location.search);
                    const tgUser = urlParams.get('tg_user');
                    if (tgUser) {
                        try {
                            telegramUserData = JSON.parse(decodeURIComponent(tgUser));
                            telegramUserId = telegramUserData.id;
                            console.log('✅ Found Telegram user via URL parameters:', telegramUserData);
                        } catch (e) {
                            console.error('❌ Failed to parse user from URL:', e);
                        }
                    }
                }
                
                if (telegramUserId) {
                    console.log('🎯 Telegram User ID found:', telegramUserId);
                    await this.handleUserEnrollment(telegramUserId, telegramUserData);
                } else {
                    console.log('❌ No Telegram user data available in any method');
                    console.log('Available initDataUnsafe keys:', Object.keys(tg.initDataUnsafe || {}));
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
    
    // Try to load existing user session from Supabase
    async tryLoadExistingSession() {
        try {
            // Check if we have a stored user ID
            const storedUserId = localStorage.getItem('teleblog-user-id');
            if (storedUserId && window.SupabaseClient) {
                console.log('🔍 Attempting to load stored user from Supabase:', storedUserId);
                
                // Try to get user from Supabase by ID
                const supabase = window.SupabaseClient.getClient();
                if (supabase) {
                    const { data: user, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', storedUserId)
                        .single();
                    
                    if (!error && user) {
                        console.log('✅ Loaded user from Supabase:', {
                            id: user.id,
                            telegram_id: user.telegram_id,
                            username: user.username,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            user_type: user.user_type
                        });
                        this.currentUser = user;
                        this.updateHeaderUserInfo(this.currentUser);
                        await this.loadInitialContent();
                        return;
                    } else {
                        console.error('❌ Failed to load user from Supabase:', error);
                    }
                }
            }
            
            // If no stored session, check if we can get Telegram ID from other methods
            console.log('❌ No existing session found');
            this.showWebModeMessage();
            
        } catch (error) {
            console.error('❌ Session loading failed:', error);
            this.showWebModeMessage();
        }
    },
    
    // Complete user enrollment process - IMPROVED VERSION
    async handleUserEnrollment(telegramUserId, telegramUserData = null) {
        try {
            console.log('🔐 Starting user enrollment process...');
            console.log('📱 Telegram User ID:', telegramUserId);
            console.log('📝 Telegram User Data:', telegramUserData);
            
            if (!window.SupabaseClient) {
                console.error('❌ Supabase client not available');
                this.showError('Database service unavailable.');
                return;
            }
            
            // Step 1: Check if user exists in Supabase by telegram_id
            console.log(`🔍 Checking Supabase for user with telegram_id: ${telegramUserId}`);
            const existingUser = await window.SupabaseClient.getUserByTelegramId(telegramUserId);
            
            if (existingUser) {
                // User exists in Supabase - use the REAL data from database
                console.log('✅ Existing Supabase user found:', {
                    id: existingUser.id,
                    telegram_id: existingUser.telegram_id,
                    username: existingUser.username,
                    first_name: existingUser.first_name,
                    last_name: existingUser.last_name,
                    user_type: existingUser.user_type,
                    profile_completed: existingUser.profile_completed
                });
                
                this.currentUser = existingUser;
                
                // Store user ID for future sessions
                localStorage.setItem('teleblog-user-id', existingUser.id);
                
                // Update header with REAL Supabase data
                this.updateHeaderUserInfo(this.currentUser);
                
                // Check if user needs to complete profile
                if (!existingUser.profile_completed) {
                    this.showUserTypeSelection(existingUser);
                } else {
                    await this.loadInitialContent();
                }
            } else {
                // New user - create account in Supabase
                console.log('🆕 No existing user found, creating new user in Supabase...');
                
                // Prepare user data for Supabase
                const userData = {
                    telegram_id: telegramUserId,
                    username: telegramUserData?.username || null,
                    first_name: telegramUserData?.first_name || null,
                    last_name: telegramUserData?.last_name || null,
                    language_code: telegramUserData?.language_code || null,
                    is_premium: telegramUserData?.is_premium || false,
                    user_type: 'general',
                    profile_completed: false
                };
                
                console.log('📝 Creating user with data:', userData);
                
                // Create user in Supabase
                const newUser = await this.createUserInSupabase(userData);
                
                if (newUser) {
                    console.log('✅ New Supabase user created:', {
                        id: newUser.id,
                        username: newUser.username,
                        first_name: newUser.first_name,
                        last_name: newUser.last_name,
                        user_type: newUser.user_type
                    });
                    
                    this.currentUser = newUser;
                    this.isNewUser = true;
                    
                    // Store user ID for future sessions
                    localStorage.setItem('teleblog-user-id', newUser.id);
                    
                    // Update header with REAL Supabase data
                    this.updateHeaderUserInfo(this.currentUser);
                    
                    // Show user type selection for new users
                    this.showUserTypeSelection(newUser);
                } else {
                    console.error('❌ Failed to create user account in Supabase');
                    this.showError('Failed to create user account. Please try again.');
                }
            }
        } catch (error) {
            console.error('❌ User enrollment failed:', error);
            this.showError('User enrollment failed. Please refresh the page.');
        }
    },
    
    // Create user in Supabase directly
    async createUserInSupabase(userData) {
        try {
            const supabase = window.SupabaseClient.getClient();
            if (!supabase) {
                console.error('❌ Supabase client not available');
                return null;
            }
            
            const { data, error } = await supabase
                .from('users')
                .insert(userData)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Supabase user creation error:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('❌ Exception in createUserInSupabase:', error);
            return null;
        }
    },
    
    // Update user info in header - USING REAL SUPABASE DATA
    updateHeaderUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) {
            console.error('❌ user-info element not found in header');
            return;
        }
        
        console.log('🔄 Updating header with REAL Supabase user data:', {
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type
        });
        
        // Use REAL user data from Supabase
        const displayName = user.first_name || 'User';
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || displayName;
        const username = user.username ? `@${user.username}` : 'No username';
        
        // Update avatar with real user initial
        const avatar = userInfo.querySelector('.avatar');
        if (avatar) {
            const firstLetter = user.first_name?.charAt(0) || user.username?.charAt(0) || 'U';
            avatar.textContent = firstLetter.toUpperCase();
            avatar.title = `${fullName} (${username}) - ${this.getUserTypeDisplayName(user.user_type)}`;
            
            // Add visual indicator for user type
            avatar.className = 'avatar';
            if (user.user_type === 'group_admin') {
                avatar.classList.add('group-admin');
            } else if (user.user_type === 'channel_admin') {
                avatar.classList.add('channel-admin');
            }
        }
        
        // Update user text with REAL data from Supabase
        const span = userInfo.querySelector('span');
        if (span) {
            const typeBadge = user.user_type !== 'general' ? 
                ` <span class="user-type-badge ${user.user_type}">${this.getUserTypeDisplayName(user.user_type)}</span>` : '';
            
            span.innerHTML = `${fullName}${typeBadge}`;
        }
        
        // Update user info title/tooltip with real data
        userInfo.title = `Telegram: ${username} | Name: ${fullName} | Type: ${this.getUserTypeDisplayName(user.user_type)}`;
        
        console.log('✅ Header updated with REAL Supabase user data');
    },
    
    // Show user type selection modal - USING REAL USER DATA
    showUserTypeSelection(user) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        // Use REAL user data from Supabase
        const userName = user.first_name || 'there';
        const userFullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
        const userUsername = user.username ? `@${user.username}` : 'No username';
        
        pageContent.innerHTML = `
            <div class="enrollment-container">
                <div class="enrollment-header">
                    <h2>👋 Welcome ${userName}!</h2>
                    <p>Your Telegram account is connected. Choose how you plan to use TeleBlog:</p>
                    <div class="user-info-summary">
                        <p><strong>Telegram Username:</strong> ${userUsername}</p>
                        <p><strong>Display Name:</strong> ${userFullName}</p>
                        <p><strong>Telegram ID:</strong> ${user.telegram_id}</p>
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
    
    // Load initial content after user setup
    async loadInitialContent() {
        try {
            console.log('📦 Loading initial content...');
            
            // Load posts based on current page
            if (this.currentPage === 'feed') {
                await this.loadPosts();
            } else if (this.currentPage === 'profile') {
                this.showUserProfile();
            } else if (this.currentPage === 'create') {
                this.showCreatePost();
            }
            
        } catch (error) {
            console.error('❌ Failed to load initial content:', error);
            this.showError('Failed to load content.');
        }
    },
    
    // Load posts from Supabase
    async loadPosts() {
        try {
            this.showLoading('Loading posts...');
            
            if (window.SupabaseClient && window.SupabaseClient.getPosts) {
                const posts = await window.SupabaseClient.getPosts();
                this.displayPosts(posts);
            } else {
                // Fallback: Show demo posts
                this.displayDemoPosts();
            }
        } catch (error) {
            console.error('❌ Failed to load posts:', error);
            this.displayDemoPosts();
        }
    },
    
    // Display posts in the feed
    displayPosts(posts) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        if (!posts || posts.length === 0) {
            pageContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No posts yet</h3>
                    <p>Be the first to create a post!</p>
                    ${this.currentUser?.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create First Post</button>' : 
                        '<p>Follow groups/channels to see their posts here.</p>'
                    }
                </div>
            `;
            return;
        }
        
        const postsHtml = posts.map(post => `
            <div class="post-card" data-post-id="${post.id}">
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
                    <button class="btn-like" onclick="TeleBlogApp.likePost('${post.id}')">
                        ❤️ ${post.likes_count || 0}
                    </button>
                    <button class="btn-comment" onclick="TeleBlogApp.showComments('${post.id}')">
                        💬 ${post.comments_count || 0}
                    </button>
                </div>
            </div>
        `).join('');
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>Latest Posts</h2>
                    ${this.currentUser?.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : 
                        ''
                    }
                </div>
                <div class="posts-list">
                    ${postsHtml}
                </div>
            </div>
        `;
    },
    
    // Show demo posts when no real data available
    displayDemoPosts() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        pageContent.innerHTML = `
            <div class="feed-container">
                <div class="feed-header">
                    <h2>Latest Posts</h2>
                    ${this.currentUser?.user_type !== 'general' ? 
                        '<button class="btn primary" onclick="TeleBlogApp.showCreatePost()">Create Post</button>' : 
                        ''
                    }
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
                            <p>Welcome to TeleBlog! 🎉 This is a demo post. When you have real posts from your groups/channels, they will appear here.</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-like">❤️ 12</button>
                            <button class="btn-comment">💬 3</button>
                        </div>
                    </div>
                    
                    <div class="post-card">
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
                            <button class="btn-like">❤️ 8</button>
                            <button class="btn-comment">💬 1</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Show user profile with REAL data from Supabase
    showUserProfile() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        // Use REAL user data from Supabase
        const user = this.currentUser;
        const userFullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Not provided';
        const userUsername = user.username ? `@${user.username}` : 'No username';
        
        pageContent.innerHTML = `
            <div class="page-profile">
                <h2>User Profile</h2>
                <div class="profile-card">
                    <div class="profile-avatar">${user.first_name?.charAt(0) || user.username?.charAt(0) || 'U'}</div>
                    <div class="profile-info">
                        <h3>${userFullName}</h3>
                        <p><strong>Telegram Username:</strong> ${userUsername}</p>
                        <p><strong>Telegram ID:</strong> ${user.telegram_id || 'N/A'}</p>
                        <p><strong>Account Type:</strong> <span class="user-type ${user.user_type || 'general'}">${this.getUserTypeDisplayName(user.user_type || 'general')}</span></p>
                        <p><strong>Profile Status:</strong> ${user.profile_completed ? 'Completed' : 'Incomplete'}</p>
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
    
    // Show create post interface
    showCreatePost() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        if (this.currentUser?.user_type === 'general') {
            pageContent.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h3>Access Restricted</h3>
                    <p>You need to be a Group Admin or Channel Admin to create posts.</p>
                    <div class="upgrade-options">
                        <button class="btn" onclick="TeleBlogApp.selectUserType('group_admin')">
                            Become Group Admin
                        </button>
                        <button class="btn primary" onclick="TeleBlogApp.selectUserType('channel_admin')">
                            Become Channel Admin
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        pageContent.innerHTML = `
            <div class="create-post-container">
                <h2>Create New Post</h2>
                <div class="post-form">
                    <div class="form-group">
                        <label for="post-content">Post Content</label>
                        <textarea 
                            id="post-content" 
                            placeholder="What's on your mind? Share with your audience..." 
                            rows="6"
                        ></textarea>
                    </div>
                    <div class="form-actions">
                        <button class="btn" onclick="TeleBlogApp.loadInitialContent()">Cancel</button>
                        <button class="btn primary" onclick="TeleBlogApp.submitPost()">Publish Post</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Submit new post
    async submitPost() {
        const contentInput = document.getElementById('post-content');
        if (!contentInput) return;
        
        const content = contentInput.value.trim();
        if (!content) {
            this.showNotification('Please enter some content for your post', 'error');
            return;
        }
        
        try {
            this.showLoading('Publishing post...');
            
            if (window.SupabaseClient && window.SupabaseClient.createPost) {
                const success = await window.SupabaseClient.createPost({
                    content: content,
                    author_id: this.currentUser.id,
                    author_name: this.currentUser.first_name || this.currentUser.username || 'Unknown'
                });
                
                if (success) {
                    this.showNotification('Post published successfully!', 'success');
                    this.currentPage = 'feed';
                    await this.loadInitialContent();
                } else {
                    this.showNotification('Failed to publish post. Please try again.', 'error');
                }
            } else {
                // Fallback for demo
                this.showNotification('Post published successfully! (Demo)', 'success');
                this.currentPage = 'feed';
                await this.loadInitialContent();
            }
        } catch (error) {
            console.error('❌ Failed to submit post:', error);
            this.showNotification('Failed to publish post. Please try again.', 'error');
        }
    },
    
    // Like a post
    async likePost(postId) {
        console.log('Liking post:', postId);
        this.showNotification('Post liked!', 'success');
    },
    
    // Show comments for a post
    async showComments(postId) {
        console.log('Showing comments for post:', postId);
        this.showNotification('Comments feature coming soon!', 'info');
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
    
    // Navigation functions
    navigateTo(page) {
        this.currentPage = page;
        this.updateNavigation();
        this.loadInitialContent();
    },
    
    updateNavigation() {
        // Update active nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    },
    
    // Utility functions
    showNotification: function(message, type = 'info') {
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
    
    escapeHtml: function(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    formatDate: function(dateString) {
        if (!dateString) return 'Recently';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Recently';
        }
    },
    
    showLoading: function(message) {
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
    
    hideLoading: function() {
        // Loading state is handled by content replacement
    },
    
    showError: function(message) {
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
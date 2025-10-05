// TeleBlog Lite Main Application
class TeleBlogApp {
    constructor() {
        this.currentUser = null;
        this.currentView = 'home';
        this.posts = [];
        this.isLoading = false;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing TeleBlog Lite...');
        
        try {
            // Show loading screen
            this.showLoadingScreen();

            // Initialize configuration
            if (!window.AppConfig) {
                throw new Error('App configuration not loaded');
            }

            // Initialize Telegram Web App
            const telegramInitialized = window.TelegramWebApp.init();
            console.log('Telegram Web App:', telegramInitialized ? 'Initialized' : 'Standalone mode');

            // Initialize Supabase
            const supabaseClient = window.SupabaseClient.init();
            if (!supabaseClient) {
                throw new Error('Failed to initialize Supabase client');
            }

            // Test database connection
            const connected = await window.SupabaseClient.testConnection();
            console.log('Database connection:', connected ? 'Connected' : 'Limited mode');

            // Handle user authentication
            await this.handleUserAuth();

            // Setup UI
            this.setupEventListeners();
            this.loadInitialData();

            // Hide loading screen
            this.hideLoadingScreen();

            this.initialized = true;
            console.log('✅ TeleBlog Lite initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Initialization failed: ' + error.message);
            // Still try to show the app
            this.showMainApp();
            this.hideLoadingScreen();
        }
    }

    async handleUserAuth() {
        const telegramUser = window.TelegramWebApp.getUser();
        
        if (telegramUser && window.TelegramWebApp.hasUserData()) {
            console.log('🔐 Authenticating Telegram user:', telegramUser.id);
            
            // Telegram user - get or create in database
            this.currentUser = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
            
            if (!this.currentUser) {
                console.log('👤 Creating new user in database');
                this.currentUser = await window.SupabaseClient.createUser(telegramUser);
            }

            if (this.currentUser) {
                console.log('✅ User authenticated:', this.currentUser.id);
                
                if (!this.currentUser.profile_completed) {
                    this.showAuthScreen();
                } else {
                    this.showMainApp();
                }
            } else {
                console.warn('⚠️ User authentication failed, continuing as guest');
                this.currentUser = { id: null, first_name: 'Guest', user_type: 'general' };
                this.showMainApp();
            }
        } else {
            // Standalone mode - show main app directly
            console.log('🌐 Running in standalone mode');
            this.currentUser = { id: null, first_name: 'Guest', user_type: 'general' };
            this.showMainApp();
        }
    }

    async loadInitialData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            console.log('📥 Loading initial data...');
            
            // Load posts
            this.posts = await window.SupabaseClient.getPublishedPosts(5);
            console.log(`📝 Loaded ${this.posts.length} posts`);
            
            // Render posts
            this.renderPosts();
            
            // Update user stats
            this.updateUserStats();
            
            // Update quick stats
            this.updateQuickStats();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // UI Management
    showLoadingScreen() {
        document.getElementById('loading-screen').classList.add('active');
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen').classList.remove('active');
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.updateUserGreeting();
    }

    updateUserGreeting() {
        const greeting = document.getElementById('user-greeting');
        if (greeting && this.currentUser) {
            const name = this.currentUser.first_name || this.currentUser.username || 'User';
            greeting.textContent = `Hello, ${name}!`;
        }
    }

    // Post Management
    async createPost(postData) {
        if (!this.currentUser || !this.currentUser.id) {
            this.showError('Please log in to create posts');
            return false;
        }

        if (!postData.content || postData.content.trim().length === 0) {
            this.showError('Post content cannot be empty');
            return false;
        }

        if (!postData.title || postData.title.trim().length === 0) {
            this.showError('Post title is required');
            return false;
        }

        try {
            this.showLoading('Creating post...');

            const result = await window.SupabaseClient.createPost({
                title: postData.title.trim(),
                content: postData.content.trim(),
                author_id: this.currentUser.id,
                tags: postData.tags || null,
                is_published: true
            });

            if (result.success) {
                this.showSuccess('🎉 Post created successfully!');
                await this.loadInitialData();
                this.switchView('posts');
                return true;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error creating post:', error);
            this.showError('Failed to create post: ' + error.message);
            return false;
        } finally {
            this.hideLoading();
        }
    }

    // Rendering
    renderPosts() {
        const container = document.getElementById('posts-container');
        const featuredContainer = document.getElementById('featured-posts-container');
        
        if (!container) return;

        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No posts yet</h3>
                    <p>Be the first to share something amazing!</p>
                </div>
            `;
            
            if (featuredContainer) {
                featuredContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No featured posts yet</p>
                    </div>
                `;
            }
            return;
        }

        // Render main posts
        container.innerHTML = this.posts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <span class="author">
                        ${post.user ? post.user.first_name : (post.author_name || 'Anonymous')}
                        ${post.user && post.user.user_type ? `<span class="user-type">${post.user.user_type}</span>` : ''}
                    </span>
                    <span class="date">${this.formatDate(post.published_at || post.created_at)}</span>
                </div>
                <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
                ${post.excerpt ? `<div class="post-excerpt">${this.escapeHtml(post.excerpt)}</div>` : ''}
                <div class="post-content">${this.escapeHtml(post.content)}</div>
                ${post.tags && post.tags.length > 0 ? `
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                ${post.view_count !== undefined ? `<div class="post-stats">👁️ ${post.view_count} views</div>` : ''}
            </div>
        `).join('');

        // Render featured posts (first 3)
        if (featuredContainer) {
            const featuredPosts = this.posts.slice(0, 3);
            featuredContainer.innerHTML = featuredPosts.map(post => `
                <div class="featured-post">
                    <h4>${this.escapeHtml(post.title)}</h4>
                    <p>${this.escapeHtml(post.excerpt || post.content.substring(0, 100) + '...')}</p>
                    <small>By ${post.user ? post.user.first_name : 'Anonymous'}</small>
                </div>
            `).join('');
        }
    }

    updateUserStats() {
        if (this.currentUser && this.currentUser.id) {
            window.SupabaseClient.getUserPosts(this.currentUser.id).then(posts => {
                const totalPosts = posts.length;
                const publishedPosts = posts.filter(p => p.is_published).length;
                const draftPosts = totalPosts - publishedPosts;

                document.getElementById('total-posts').textContent = totalPosts;
                document.getElementById('published-posts').textContent = publishedPosts;
                document.getElementById('draft-posts').textContent = draftPosts;
                
                // Update profile info
                document.getElementById('profile-name').textContent = 
                    this.currentUser.first_name || this.currentUser.username || 'User';
                document.getElementById('profile-type').textContent = 
                    `User Type: ${this.currentUser.user_type || 'general'}`;
                document.getElementById('profile-stats').textContent = 
                    `Posts: ${publishedPosts} published, ${draftPosts} drafts`;
            });
        }
    }

    updateQuickStats() {
        // Simple stats - you can enhance this later
        document.getElementById('today-posts').textContent = this.posts.length;
        document.getElementById('active-users').textContent = this.posts.length > 0 ? 'Growing' : '0';
    }

    // Event Handlers
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // User type selection
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userType = e.target.closest('.user-type-btn').dataset.type;
                this.selectUserType(userType);
            });
        });

        // Post creation form
        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePostSubmit();
            });
        }

        // Character count for post content
        const postContent = document.getElementById('post-content');
        if (postContent) {
            postContent.addEventListener('input', (e) => {
                const count = e.target.value.length;
                document.getElementById('char-count').textContent = count;
                
                // Visual feedback
                if (count > 4000) {
                    e.target.style.borderColor = 'var(--danger-color)';
                } else if (count > 3500) {
                    e.target.style.borderColor = 'var(--warning-color)';
                } else {
                    e.target.style.borderColor = '';
                }
            });
        }

        // Draft button
        const draftBtn = document.getElementById('draft-btn');
        if (draftBtn) {
            draftBtn.addEventListener('click', () => {
                this.showInfo('Draft feature coming soon!');
            });
        }

        // Profile buttons
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            this.showInfo('Profile editing coming soon!');
        });

        document.getElementById('change-type-btn')?.addEventListener('click', () => {
            this.showAuthScreen();
        });

        document.getElementById('my-posts-btn')?.addEventListener('click', () => {
            this.showInfo('My posts view coming soon!');
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.showInfo('Settings coming soon!');
        });
    }

    async selectUserType(userType) {
        if (!this.currentUser || !this.currentUser.id) {
            this.showMainApp();
            return;
        }

        try {
            this.showLoading('Setting up your profile...');
            
            const success = await window.SupabaseClient.updateUserType(this.currentUser.id, userType);
            
            if (success) {
                this.currentUser.user_type = userType;
                this.currentUser.profile_completed = true;
                this.showSuccess('Profile setup complete!');
                this.showMainApp();
            } else {
                throw new Error('Failed to update user type');
            }
            
        } catch (error) {
            console.error('Error selecting user type:', error);
            this.showError('Failed to set user type');
            this.showMainApp(); // Continue anyway
        } finally {
            this.hideLoading();
        }
    }

    async handlePostSubmit() {
        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const tags = document.getElementById('post-tags').value.trim();

        if (!title) {
            this.showError('Please enter a title for your post');
            return;
        }

        if (!content) {
            this.showError('Please enter some content for your post');
            return;
        }

        if (content.length > 4000) {
            this.showError('Post content cannot exceed 4000 characters');
            return;
        }

        const success = await this.createPost({
            title: title,
            content: content,
            tags: tags || null
        });

        if (success) {
            // Clear form
            document.getElementById('post-form').reset();
            document.getElementById('char-count').textContent = '0';
        }
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        this.currentView = viewName;

        // Load view-specific data
        if (viewName === 'posts') {
            this.loadInitialData();
        } else if (viewName === 'profile') {
            this.updateUserStats();
        }
    }

    // Utility Methods
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        // You can implement a proper loading indicator here
        console.log('Loading:', message);
    }

    hideLoading() {
        this.isLoading = false;
    }

    showError(message) {
        console.error('App Error:', message);
        window.TelegramWebApp.showAlert(message);
    }

    showSuccess(message) {
        console.log('Success:', message);
        window.TelegramWebApp.showAlert(message);
    }

    showInfo(message) {
        console.log('Info:', message);
        window.TelegramWebApp.showAlert(message);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            return 'Recent';
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, '<br>');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting TeleBlog Lite...');
    window.teleBlogApp = new TeleBlogApp();
    window.teleBlogApp.init();
});
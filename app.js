// app.js - PRODUCTION READY WITH LEGAL CHARACTERS ONLY
console.log('TeleBlog Lite App Starting...');

// Global app state
window.TeleBlogApp = {
    currentUser: null,
    currentPage: 'feed',
    
    // Initialize the application
    async initializeApp() {
        try {
            console.log('Initializing TeleBlog application...');
            
            // Wait for configuration
            if (!window.AppConfig) {
                console.log('Waiting for configuration...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log('Configuration loaded:', window.AppConfig?.environment);
            
            // Initialize Supabase
            await this.initializeSupabase();
            
            // Initialize Telegram
            await this.initializeTelegram();
            
            // Load initial content
            await this.loadInitialContent();
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError('Application failed to load. Please refresh.');
        }
    },
    
    // Initialize Supabase client
    async initializeSupabase() {
        if (window.SupabaseClient && window.SupabaseClient.init) {
            const supabase = window.SupabaseClient.init();
            if (supabase) {
                console.log('Supabase client initialized');
                
                // Test connection
                const connected = await window.SupabaseClient.testConnection();
                if (connected) {
                    console.log('Supabase connection verified');
                } else {
                    console.error('Supabase connection failed');
                    this.showError('Database connection failed. Using demo mode.');
                }
            }
        } else {
            console.error('Supabase client not available');
            this.showError('Database service unavailable.');
        }
    },
    
    // Initialize Telegram Web App
    async initializeTelegram() {
        if (window.Telegram && window.Telegram.WebApp) {
            try {
                const tg = window.Telegram.WebApp;
                console.log('Telegram Web App detected');
                
                // Expand the app
                tg.expand();
                
                // Set theme colors
                tg.setHeaderColor('#ffffff');
                tg.setBackgroundColor('#ffffff');
                
                // Get user data
                const userData = tg.initDataUnsafe?.user;
                if (userData) {
                    console.log('Telegram user detected:', userData);
                    await this.handleTelegramUser(userData);
                } else {
                    console.log('No Telegram user data - running in web mode');
                    this.showWebModeMessage();
                }
                
            } catch (error) {
                console.warn('Telegram init failed:', error);
                this.showWebModeMessage();
            }
        } else {
            console.log('Running in web browser mode');
            this.showWebModeMessage();
        }
    },
    
    // Handle Telegram user
    async handleTelegramUser(telegramUser) {
        try {
            console.log('Processing Telegram user...');
            
            if (window.SupabaseClient && window.SupabaseClient.createUser) {
                const user = await window.SupabaseClient.createUser(telegramUser);
                if (user) {
                    this.currentUser = user;
                    console.log('User processed:', user.id);
                    this.updateUserInfo(user);
                } else {
                    console.warn('User creation failed - using demo user');
                    this.createDemoUser();
                }
            } else {
                this.createDemoUser();
            }
        } catch (error) {
            console.error('User handling failed:', error);
            this.createDemoUser();
        }
    },
    
    // Create demo user for web mode
    createDemoUser() {
        this.currentUser = {
            id: 'demo-user',
            first_name: 'Guest',
            username: 'guest',
            user_type: 'general'
        };
        this.updateUserInfo(this.currentUser);
    },
    
    // Update user info in UI
    updateUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            const avatar = userInfo.querySelector('.avatar');
            const span = userInfo.querySelector('span');
            
            if (avatar) avatar.textContent = user.first_name?.charAt(0) || 'U';
            if (span) span.textContent = user.first_name || 'Guest';
        }
    },
    
    // Load initial content
    async loadInitialContent() {
        try {
            console.log('Loading initial content...');
            this.showLoading('Loading posts...');
            
            // Load posts for feed
            await this.loadPosts();
            
        } catch (error) {
            console.error('Content loading failed:', error);
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
                console.log('No posts found - showing demo content');
                posts = this.getDemoPosts();
            }
            
            this.displayPosts(posts);
            
        } catch (error) {
            console.error('Posts loading failed:', error);
            this.showError('Failed to load posts.');
        }
    },
    
    // Display posts in UI
    displayPosts(posts) {
        const container = document.getElementById('page-content');
        if (!container) {
            console.error('Page content container not found');
            return;
        }
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">No posts</div>
                    <h3>No Posts Yet</h3>
                    <p>Be the first to create a post!</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="posts-container">
                <h2>Latest Posts</h2>
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
                    username: 'admin'
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
                    username: 'support'
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
                pageContent.innerHTML = `
                    <div class="page-profile">
                        <h2>User Profile</h2>
                        <div class="profile-card">
                            <div class="profile-avatar">${this.currentUser?.first_name?.charAt(0) || 'U'}</div>
                            <div class="profile-info">
                                <h3>${this.currentUser?.first_name || 'Guest'}</h3>
                                <p>@${this.currentUser?.username || 'guest'}</p>
                                <p class="user-type">${this.currentUser?.user_type || 'general'} user</p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            default:
                this.loadPosts();
        }
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
                    <div class="error-icon">Error</div>
                    <h3>Something went wrong</h3>
                    <p>${message}</p>
                    <button onclick="TeleBlogApp.initializeApp()" class="btn">Try Again</button>
                </div>
            `;
        }
    },
    
    showWebModeMessage() {
        console.log('Web mode activated');
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

// Export for global access
console.log('TeleBlog App module loaded successfully');
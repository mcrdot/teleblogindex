// TeleBlog Lite Main Application - COMPLETELY FIXED
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
        this.showLoadingScreen();

        // Set safety timeout - NEVER get stuck again!
        const safetyTimeout = setTimeout(() => {
            console.log('🆘 Safety timeout - forcing app to show');
            this.showMainApp();
            this.hideLoadingScreen();
        }, 4000);

        try {
            // 1. Initialize Telegram (non-blocking)
            if (window.TelegramWebApp) {
                window.TelegramWebApp.init();
                console.log('💫 Telegram Web App initialized');
            }

            // 2. Initialize Supabase (non-blocking)
            if (window.SupabaseClient) {
                window.SupabaseClient.init();
                console.log('🔗 Supabase client initialized');
            }

            // 3. Quick user setup
            await this.setupUser();

            // 4. Setup UI immediately
            this.setupEventListeners();

            // 5. Load data in background
            this.loadInitialData();

            clearTimeout(safetyTimeout);
            this.initialized = true;
            console.log('✅ TeleBlog Lite initialized successfully');

        } catch (error) {
            console.error('❌ Init error:', error);
            clearTimeout(safetyTimeout);
        } finally {
            // ALWAYS hide loading and show app
            setTimeout(() => {
                this.hideLoadingScreen();
                this.showMainApp();
            }, 1000);
        }
    }

    async setupUser() {
        try {
            const telegramUser = window.TelegramWebApp?.getUser?.();
            
            if (telegramUser?.id) {
                console.log('👤 Processing Telegram user:', telegramUser.id);
                
                // Try to get existing user (with short timeout)
                this.currentUser = await Promise.race([
                    window.SupabaseClient.getUserByTelegramId(telegramUser.id),
                    new Promise(resolve => setTimeout(() => resolve(null), 1500))
                ]);

                if (!this.currentUser) {
                    // Create new user
                    this.currentUser = await window.SupabaseClient.createUser(telegramUser);
                }

                if (this.currentUser && !this.currentUser.profile_completed) {
                    this.showAuthScreen();
                    return;
                }
            }
            
            // Fallback to guest mode
            if (!this.currentUser) {
                this.currentUser = { 
                    id: null, 
                    first_name: 'Guest', 
                    user_type: 'general',
                    profile_completed: true 
                };
            }
            
        } catch (error) {
            console.warn('⚠️ User setup failed, using guest mode:', error);
            this.currentUser = { 
                id: null, 
                first_name: 'Guest', 
                user_type: 'general',
                profile_completed: true 
            };
        }
    }

    async loadInitialData() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            console.log('📥 Loading posts...');
            this.posts = await window.SupabaseClient.getPublishedPosts(5);
            console.log(`✅ Loaded ${this.posts.length} posts`);
            
            this.renderPosts();
            this.updateUserStats();
            this.updateQuickStats();
            
        } catch (error) {
            console.error('📥 Data load error:', error);
            this.posts = [];
        } finally {
            this.isLoading = false;
        }
    }

    // 🎯 UI MANAGEMENT - SMOOTH & RELIABLE
    showLoadingScreen() {
        this.setScreen('loading-screen');
    }

    hideLoadingScreen() {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.classList.remove('active');
    }

    showAuthScreen() {
        this.setScreen('auth-screen');
    }

    showMainApp() {
        this.setScreen('main-app');
        this.updateUserGreeting();
        this.renderPosts(); // Ensure posts are shown
    }

    setScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('active');
        }
    }

    updateUserGreeting() {
        const greeting = document.getElementById('user-greeting');
        if (greeting && this.currentUser) {
            const name = this.currentUser.first_name || this.currentUser.username || 'Friend';
            greeting.textContent = `Hello, ${name}!`;
        }
    }

    // ✨ POST MANAGEMENT
    async createPost(postData) {
        if (!this.currentUser?.id) {
            this.showAlert('Please log in to create posts');
            return false;
        }

        if (!postData.title?.trim()) {
            this.showAlert('Post title is required');
            return false;
        }

        if (!postData.content?.trim()) {
            this.showAlert('Post content cannot be empty');
            return false;
        }

        try {
            this.showLoading('Creating your post...');

            const result = await window.SupabaseClient.createPost({
                title: postData.title.trim(),
                content: postData.content.trim(),
                author_id: this.currentUser.id,
                tags: postData.tags || null,
                is_published: true
            });

            if (result.success) {
                this.showAlert('🎉 Post published successfully!');
                await this.loadInitialData();
                this.switchView('posts');
                return true;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Post creation error:', error);
            this.showAlert('Failed to create post: ' + error.message);
            return false;
        } finally {
            this.hideLoading();
        }
    }

    // 🎨 RENDERING - BEAUTIFUL & ENGAGING
    renderPosts() {
        const container = document.getElementById('posts-container');
        const featuredContainer = document.getElementById('featured-posts-container');
        
        if (!container) return;

        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No posts yet</h3>
                    <p>Be the first to share something amazing! ✨</p>
                    <button class="cta-button" onclick="window.teleBlogApp.switchView('create')">
                        Create First Post
                    </button>
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
            <div class="post-card" onclick="this.classList.toggle('expanded')">
                <div class="post-header">
                    <span class="author">
                        ${post.user ? post.user.first_name : (post.author_name || 'Anonymous')}
                        ${post.user?.user_type ? `<span class="user-type">${post.user.user_type}</span>` : ''}
                    </span>
                    <span class="date">${this.formatDate(post.published_at || post.created_at)}</span>
                </div>
                <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
                ${post.excerpt ? `<div class="post-excerpt">${this.escapeHtml(post.excerpt)}</div>` : ''}
                <div class="post-content">${this.escapeHtml(post.content)}</div>
                ${post.tags?.length > 0 ? `
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
                ${post.view_count !== undefined ? `
                    <div class="post-stats">
                        <span>👁️ ${post.view_count} views</span>
                        <span class="read-more">Tap to expand</span>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Render featured posts
        if (featuredContainer) {
            const featuredPosts = this.posts.slice(0, 3);
            featuredContainer.innerHTML = featuredPosts.map(post => `
                <div class="featured-post">
                    <h4>${this.escapeHtml(post.title)}</h4>
                    <p class="featured-excerpt">${this.escapeHtml(post.excerpt || post.content.substring(0, 120) + '...')}</p>
                    <div class="featured-meta">
                        <small>By ${post.user ? post.user.first_name : 'Anonymous'}</small>
                        <small>${this.formatDate(post.published_at || post.created_at)}</small>
                    </div>
                </div>
            `).join('');
        }
    }

    updateUserStats() {
        if (this.currentUser?.id) {
            window.SupabaseClient.getUserPosts(this.currentUser.id).then(posts => {
                const total = posts.length;
                const published = posts.filter(p => p.is_published).length;
                const drafts = total - published;

                document.getElementById('total-posts').textContent = total;
                document.getElementById('published-posts').textContent = published;
                document.getElementById('draft-posts').textContent = drafts;
                
                // Update profile info
                const profileName = document.getElementById('profile-name');
                const profileType = document.getElementById('profile-type');
                const profileStats = document.getElementById('profile-stats');
                
                if (profileName) profileName.textContent = this.currentUser.first_name || this.currentUser.username || 'User';
                if (profileType) profileType.textContent = `User Type: ${this.currentUser.user_type || 'general'}`;
                if (profileStats) profileStats.textContent = `Posts: ${published} published, ${drafts} drafts`;
            });
        }
    }

    updateQuickStats() {
        document.getElementById('today-posts').textContent = this.posts.length;
        document.getElementById('active-users').textContent = this.posts.length > 0 ? 'Growing' : 'New';
    }

    // 🎮 EVENT HANDLERS - SMOOTH INTERACTIONS
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

        // Character counter with visual feedback
        const postContent = document.getElementById('post-content');
        if (postContent) {
            postContent.addEventListener('input', (e) => {
                const count = e.target.value.length;
                const counter = document.getElementById('char-count');
                if (counter) counter.textContent = count;
                
                // Visual feedback
                if (count > 4000) {
                    e.target.classList.add('error');
                } else if (count > 3500) {
                    e.target.classList.add('warning');
                } else {
                    e.target.classList.remove('error', 'warning');
                }
            });
        }

        // Profile actions
        document.getElementById('change-type-btn')?.addEventListener('click', () => {
            this.showAuthScreen();
        });

        // Add click handlers for empty state CTA
        setTimeout(() => {
            document.querySelector('.cta-button')?.addEventListener('click', () => {
                this.switchView('create');
            });
        }, 1000);
    }

    async selectUserType(userType) {
        if (!this.currentUser?.id) {
            this.showMainApp();
            return;
        }

        try {
            this.showLoading('Setting up your profile...');
            
            const success = await window.SupabaseClient.updateUserType(this.currentUser.id, userType);
            
            if (success) {
                this.currentUser.user_type = userType;
                this.currentUser.profile_completed = true;
                this.showAlert('🎉 Profile setup complete!');
                this.showMainApp();
            } else {
                throw new Error('Failed to update user type');
            }
            
        } catch (error) {
            console.error('User type selection error:', error);
            this.showAlert('Failed to set user type');
            this.showMainApp();
        } finally {
            this.hideLoading();
        }
    }

    async handlePostSubmit() {
        const title = document.getElementById('post-title')?.value.trim();
        const content = document.getElementById('post-content')?.value.trim();
        const tags = document.getElementById('post-tags')?.value.trim();

        if (!title) {
            this.showAlert('Please enter a title for your post');
            return;
        }

        if (!content) {
            this.showAlert('Please enter some content for your post');
            return;
        }

        if (content.length > 4000) {
            this.showAlert('Post content cannot exceed 4000 characters');
            return;
        }

        const success = await this.createPost({
            title: title,
            content: content,
            tags: tags || null
        });

        if (success) {
            // Clear form
            document.getElementById('post-form')?.reset();
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

    // 💫 UTILITY METHODS
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        // Simple loading indicator
        console.log('⏳', message);
    }

    hideLoading() {
        this.isLoading = false;
    }

    showAlert(message) {
        console.log('💬', message);
        if (window.TelegramWebApp?.showAlert) {
            window.TelegramWebApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Recently';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;
            
            return date.toLocaleDateString();
        } catch (e) {
            return 'Recently';
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

// 🎉 INITIALIZATION - BULLETPROOF
document.addEventListener('DOMContentLoaded', () => {
    console.log('💖 TeleBlog Lite - DOM Ready!');
    
    window.teleBlogApp = new TeleBlogApp();
    
    // Start initialization (non-blocking)
    setTimeout(() => {
        window.teleBlogApp.init().catch(error => {
            console.error('💥 Init failed:', error);
            window.teleBlogApp.showMainApp();
        });
    }, 100);
    
    // Ultimate fallback - ALWAYS show app within 5 seconds
    setTimeout(() => {
        if (!window.teleBlogApp.initialized) {
            console.log('🆘 Ultimate fallback activated!');
            window.teleBlogApp.showMainApp();
        }
    }, 5000);
});
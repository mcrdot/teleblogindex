// TeleBlog - Fully Updated with Telegram Fix
class TeleBlogApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUser = null;
        this.posts = [];
        this.drafts = [];
        this.bookmarks = [];
        this.jwtToken = localStorage.getItem('teleblog_token');
        this.currentTheme = localStorage.getItem('teleblog_theme') || 'default';
        this.isLoading = false;
        
        // API configuration
        this.API_BASE_URL = 'https://teleblog-indexjs.macrotiser-pk.workers.dev';
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing TeleBlog...');
        
        // Initialize core systems
        this.initTheme();
        this.setupNavigation();
        this.setupEventListeners();
        
        // Telegram detection with multiple fallbacks
        const isTelegram = this.detectTelegramEnvironment();
        
        if (isTelegram) {
            console.log('📱 Telegram environment detected');
            this.handleTelegramInit();
        } else {
            console.log('🌐 Standard web browser detected');
            this.handleWebInit();
        }
        
        this.hideLoading();
    }

    detectTelegramEnvironment() {
        // Method 1: Check window.Telegram.WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Detected: window.Telegram.WebApp');
            return true;
        }
        
        // Method 2: Check URL parameters (common in Telegram Mini Apps)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tgWebAppStartParam') || urlParams.get('tgWebAppPlatform')) {
            console.log('Detected: Telegram URL parameters');
            return true;
        }
        
        // Method 3: Check hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get('tgWebAppData')) {
            console.log('Detected: Telegram hash parameters');
            return true;
        }
        
        // Method 4: Check user agent
        if (navigator.userAgent.includes('Telegram')) {
            console.log('Detected: Telegram user agent');
            return true;
        }
        
        return false;
    }

    handleTelegramInit() {
        // Always show Telegram button in Telegram environment
        const telegramBtn = document.getElementById('telegram-login-btn');
        if (telegramBtn) {
            telegramBtn.style.display = 'flex';
        }

        // Initialize Telegram WebApp if available
        if (window.Telegram && window.Telegram.WebApp) {
            try {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                console.log('Telegram WebApp initialized');
                
                // Try auto-auth after delay
                setTimeout(() => {
                    this.handleTelegramAuth();
                }, 1500);
            } catch (error) {
                console.error('Error initializing Telegram WebApp:', error);
            }
        } else {
            console.log('Telegram WebApp object not available, showing manual login');
        }
    }

    handleWebInit() {
        // Hide Telegram button in regular browser
        const telegramBtn = document.getElementById('telegram-login-btn');
        if (telegramBtn) {
            telegramBtn.style.display = 'none';
        }
        
        // Check existing authentication
        this.checkAuth().then(() => {
            if (this.currentUser) {
                this.loadInitialData();
                this.updateAuthUI(true);
            } else {
                this.showSection('auth');
            }
        });
    }

    // API call method
    async apiCall(endpoint, options = {}) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            // Add authorization header if user is logged in
            if (this.jwtToken && !endpoint.includes('/auth')) {
                config.headers.Authorization = `Bearer ${this.jwtToken}`;
            }

            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Telegram authentication - SIMPLIFIED
    async handleTelegramAuth() {
        console.log('🔐 Starting Telegram authentication...');
        
        let initData = '';
        
        // Get initData from Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            initData = window.Telegram.WebApp.initData;
            console.log('InitData from WebApp:', initData ? 'Available' : 'Not available');
        }
        
        // If no initData, try to get from URL
        if (!initData) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            initData = hashParams.get('tgWebAppData') || '';
            console.log('InitData from URL:', initData ? 'Available' : 'Not available');
        }

        if (!initData) {
            console.log('No authentication data available');
            this.showToast('Telegram authentication not ready. Please try again.', 'info');
            return;
        }

        this.showLoading();

        try {
            console.log('Sending auth request...');
            const result = await this.apiCall('/auth', {
                method: 'POST',
                body: JSON.stringify({ initData })
            });

            if (result.user && result.token) {
                // Success - user logged in
                this.currentUser = result.user;
                this.jwtToken = result.token;
                
                localStorage.setItem('teleblog_token', this.jwtToken);
                localStorage.setItem('teleblog_user', JSON.stringify(this.currentUser));
                
                this.updateAuthUI(true);
                this.updateUserUI();
                await this.loadInitialData();
                this.showSection('home');
                this.showToast('Welcome to TeleBlog! 🎉', 'success');
            } else {
                this.showToast('Authentication failed. Please try development login.', 'error');
            }
        } catch (error) {
            console.error('Telegram auth error:', error);
            this.showToast('Login failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Theme Management
    initTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeSelection();
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        document.body.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('teleblog_theme', this.currentTheme);
        this.updateThemeSelection();
        this.showToast(`Theme changed to ${this.getThemeDisplayName(themeName)}`, 'success');
    }

    getThemeDisplayName(themeName) {
        const themeNames = {
            'default': 'TeleBlog Theme',
            'telegram-light': 'Telegram Light',
            'telegram-dark': 'Telegram Dark'
        };
        return themeNames[themeName] || themeName;
    }

    updateThemeSelection() {
        const themeOptions = document.querySelectorAll('.theme-option');
        if (themeOptions) {
            themeOptions.forEach(option => {
                if (option.dataset.theme === this.currentTheme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        }
    }

    // Settings Management
    openSettings() {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.classList.add('active');
        }
    }

    closeSettings() {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.classList.remove('active');
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // Settings back button
        const settingsBackBtn = document.getElementById('settings-back-btn');
        if (settingsBackBtn) {
            settingsBackBtn.addEventListener('click', () => this.closeSettings());
        }
        
        // Theme selection
        const themeOptions = document.querySelectorAll('.theme-option');
        if (themeOptions) {
            themeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    this.setTheme(option.dataset.theme);
                });
            });
        }

        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems) {
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = item.dataset.section;
                    if (section) {
                        window.location.hash = section;
                    }
                });
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Development login
        const devLoginBtn = document.getElementById('dev-login-btn');
        if (devLoginBtn) {
            devLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDevLogin();
            });
        }

        // Telegram login button
        const telegramLoginBtn = document.getElementById('telegram-login-btn');
        if (telegramLoginBtn) {
            telegramLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleTelegramAuth();
            });
        }

        // Post form
        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePostSubmit();
            });
        }

        // Save draft
        const saveDraftBtn = document.getElementById('save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        // Character counter
        const postContent = document.getElementById('post-content');
        if (postContent) {
            postContent.addEventListener('input', () => this.updateCharCounter());
        }

        // Search functionality
        const searchInput = document.getElementById('posts-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const filter = document.getElementById('posts-filter')?.value || 'latest';
                this.loadPosts(filter, e.target.value);
            });
        }

        // Filter changes
        const postsFilter = document.getElementById('posts-filter');
        if (postsFilter) {
            postsFilter.addEventListener('change', (e) => {
                const searchQuery = document.getElementById('posts-search')?.value || '';
                this.loadPosts(e.target.value, searchQuery);
            });
        }
    }

    // Navigation
    setupNavigation() {
        window.addEventListener('hashchange', () => this.handleRouteChange());
        this.handleRouteChange();
    }

    handleRouteChange() {
        const hash = window.location.hash.substring(1) || 'home';
        this.showSection(hash);
    }

    showSection(sectionId) {
        const protectedSections = ['posts', 'create', 'profile'];
        if (!this.currentUser && protectedSections.includes(sectionId)) {
            this.showToast('Please login to access this section!', 'error');
            this.showSection('auth');
            return;
        }

        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        if (sections) {
            sections.forEach(section => {
                section.classList.remove('active');
            });
        }

        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems) {
            navItems.forEach(item => {
                item.classList.remove('active');
            });
        }

        // Show target section
        const targetSection = document.getElementById(sectionId);
        const targetNav = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (targetSection && targetNav) {
            targetSection.classList.add('active');
            targetNav.classList.add('active');
            this.currentSection = sectionId;
        }

        // Load section-specific data
        this.loadSectionData(sectionId);
    }

    loadSectionData(sectionId) {
        switch (sectionId) {
            case 'posts':
                this.loadPosts();
                break;
            case 'profile':
                this.loadUserStats();
                break;
        }
    }

    // Authentication
    async checkAuth() {
        if (this.jwtToken) {
            try {
                const payload = JSON.parse(atob(this.jwtToken.split('.')[1]));
                if (payload.exp > Date.now() / 1000) {
                    this.currentUser = JSON.parse(localStorage.getItem('teleblog_user'));
                    return true;
                }
            } catch (e) {
                console.log('Invalid token, clearing storage');
                this.clearAuthData();
            }
        }
        return false;
    }

    async loadInitialData() {
        await Promise.all([
            this.loadPosts(),
            this.loadUserStats()
        ]);
    }

    // Post Management
    async loadPosts(filter = 'latest', searchQuery = '') {
        if (!this.currentUser) return;

        this.showLoading();
        
        try {
            const result = await this.apiCall('/posts');
            this.posts = result.posts || [];
            this.renderPosts(this.posts);
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading posts from API:', error);
            await this.loadMockPosts();
        } finally {
            this.hideLoading();
        }
    }

    // Fallback to mock data
    async loadMockPosts() {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        this.posts = [
            {
                id: '1',
                title: 'Welcome to TeleBlog!',
                excerpt: 'Start your blogging journey with our decentralized platform built on Telegram...',
                content: 'Start your blogging journey with our decentralized platform built on Telegram.',
                author: 'TeleBlog Team',
                author_id: 'system',
                date: new Date().toISOString(),
                tags: ['welcome', 'introduction'],
                view_count: 42,
                like_count: 15,
                is_premium: false,
                read_time: '2 min read'
            }
        ];

        this.renderPosts(this.posts);
        this.showToast('Using demo data - API connection failed', 'info');
    }

    renderPosts(posts = []) {
        const postsContainer = document.getElementById('posts-container');
        if (postsContainer) {
            if (posts.length > 0) {
                postsContainer.innerHTML = posts.map(post => this.createPostCard(post)).join('');
            } else {
                postsContainer.innerHTML = this.createEmptyState('posts');
            }
        }
    }

    createPostCard(post) {
        return `
            <div class="post-card ${post.is_premium ? 'premium-post' : ''}">
                ${post.is_premium ? '<div class="premium-badge">Premium</div>' : ''}
                
                <div class="post-header">
                    <div class="post-meta">
                        <span class="post-author">${post.author || 'Unknown Author'}</span>
                        <span class="post-date">${this.formatDate(post.date)}</span>
                    </div>
                    <div class="post-stats">
                        <span class="post-stat">👁️ ${post.view_count || 0}</span>
                        <span class="post-stat">❤️ ${post.like_count || 0}</span>
                    </div>
                </div>
                
                <h3 class="post-title">${post.title}</h3>
                <p class="post-excerpt">${post.excerpt || post.content?.substring(0, 150) + '...'}</p>
                
                <div class="post-footer">
                    <div class="post-tags">
                        ${(post.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                    <span class="read-time">${post.read_time || '1 min read'}</span>
                </div>
            </div>
        `;
    }

    createEmptyState(type) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No posts yet</h3>
                <p>Be the first to share your thoughts with the community!</p>
                <button class="btn-primary" onclick="window.location.hash='create'">
                    Create First Post
                </button>
            </div>
        `;
    }

    // Post Creation
    async handlePostSubmit() {
        if (!this.currentUser) {
            this.showToast('Please login to create posts!', 'error');
            this.showSection('auth');
            return;
        }

        const titleInput = document.getElementById('post-title');
        const contentInput = document.getElementById('post-content');
        
        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            this.showToast('Please fill in both title and content!', 'error');
            return;
        }

        this.showLoading();

        try {
            const result = await this.apiCall('/posts', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    content,
                    tags: []
                })
            });

            this.showToast('Post published successfully! 🎉', 'success');
            titleInput.value = '';
            contentInput.value = '';
            await this.loadPosts();
            window.location.hash = 'posts';
            
        } catch (error) {
            console.error('Error creating post:', error);
            this.showToast('Failed to create post. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Utility Functions
    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'Unknown date';
        }
    }

    updateCharCounter() {
        const contentInput = document.getElementById('post-content');
        const charCounter = document.getElementById('char-counter');
        
        if (contentInput && charCounter) {
            const length = contentInput.value.length;
            charCounter.textContent = `${length} characters`;
            
            if (length > 1000) {
                charCounter.style.color = '#ff6b6b';
            } else {
                charCounter.style.color = 'var(--text-secondary)';
            }
        }
    }

    // Toast System
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;

        toastContainer.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.remove();
            });
        }

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Loading States
    showLoading() {
        this.isLoading = true;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        this.isLoading = false;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    // Development Login
    async handleDevLogin() {
        this.showLoading();
        
        try {
            this.currentUser = {
                id: 'dev-user-' + Date.now(),
                telegram_id: '123456789',
                username: 'devuser',
                display_name: 'Development User',
                role: 'writer',
                avatar_url: null
            };
            
            this.jwtToken = 'dev-token-' + Date.now();
            
            localStorage.setItem('teleblog_token', this.jwtToken);
            localStorage.setItem('teleblog_user', JSON.stringify(this.currentUser));
            
            this.updateAuthUI(true);
            this.updateUserUI();
            await this.loadInitialData();
            this.showSection('home');
            this.showToast('Development login successful!', 'success');
        } finally {
            this.hideLoading();
        }
    }

    // Logout
    handleLogout() {
        this.currentUser = null;
        this.jwtToken = null;
        this.posts = [];
        
        this.clearAuthData();
        this.updateAuthUI(false);
        this.updateUserUI();
        this.renderPosts();
        this.showSection('auth');
        this.showToast('Logged out successfully!', 'success');
    }

    clearAuthData() {
        localStorage.removeItem('teleblog_token');
        localStorage.removeItem('teleblog_user');
    }

    // UI Updates
    updateAuthUI(isLoggedIn) {
        const guestElements = document.querySelectorAll('.guest-only');
        const authElements = document.querySelectorAll('.auth-only');
        
        if (isLoggedIn) {
            guestElements.forEach(el => {
                if (el.style) el.style.display = 'none';
            });
            authElements.forEach(el => {
                if (el.style) el.style.display = 'flex';
            });
        } else {
            guestElements.forEach(el => {
                if (el.style) el.style.display = 'flex';
            });
            authElements.forEach(el => {
                if (el.style) el.style.display = 'none';
            });
        }
    }

    updateUserUI() {
        const profileName = document.getElementById('profile-name');
        if (profileName && this.currentUser) {
            profileName.textContent = this.currentUser.display_name;
        }

        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar && this.currentUser?.avatar_url) {
            profileAvatar.src = this.currentUser.avatar_url;
            profileAvatar.style.display = 'block';
        }
    }

    updateStats() {
        const totalPosts = document.getElementById('total-posts');
        if (totalPosts) {
            totalPosts.textContent = this.posts.length;
        }
    }

    // User Stats with API
    async loadUserStats() {
        if (!this.currentUser) return;

        try {
            const result = await this.apiCall('/profile');
            
            const totalPosts = document.getElementById('total-posts');
            const totalLikes = document.getElementById('total-likes');
            const totalViews = document.getElementById('total-views');
            
            if (totalPosts) totalPosts.textContent = result.stats?.total_posts || this.posts.length;
            if (totalLikes) totalLikes.textContent = result.stats?.total_likes || 0;
            if (totalViews) totalViews.textContent = result.stats?.total_views || 0;
            
        } catch (error) {
            console.error('Error loading user stats:', error);
            const totalPosts = document.getElementById('total-posts');
            if (totalPosts) totalPosts.textContent = this.posts.length;
        }
    }

    saveDraft() {
        const titleInput = document.getElementById('post-title');
        const contentInput = document.getElementById('post-content');
        
        if (titleInput && contentInput) {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            
            if (title || content) {
                const draft = {
                    id: Date.now().toString(),
                    title,
                    content,
                    date: new Date().toISOString()
                };
                
                this.drafts.push(draft);
                localStorage.setItem('teleblog_drafts', JSON.stringify(this.drafts));
                this.showToast('Draft saved successfully! 💾', 'success');
            } else {
                this.showToast('Nothing to save as draft', 'info');
            }
        }
    }

    // Health check for API
    async checkAPIHealth() {
        try {
            const result = await this.apiCall('/health');
            console.log('API Health:', result);
            return true;
        } catch (error) {
            console.error('API Health check failed:', error);
            return false;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.teleBlogApp = new TeleBlogApp();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeleBlogApp;
}
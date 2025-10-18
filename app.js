// TeleBlog - Fixed Telegram Mini App Authentication
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
        this.telegramInitAttempted = false;
        
        // API configuration
        this.API_BASE_URL = 'https://teleblog-indexjs.macrotiser-pk.workers.dev';
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing TeleBlog...');
        
        // Initialize core systems first
        this.initTheme();
        this.setupNavigation();
        this.setupEventListeners();
        
        // Show loading initially
        this.showLoading();
        
        // Check Telegram environment with proper timing
        setTimeout(() => {
            this.initializeApp();
        }, 100);
    }

    async initializeApp() {
        const isTelegram = this.detectTelegramEnvironment();
        
        if (isTelegram) {
            console.log('📱 Telegram environment detected - initializing WebApp');
            await this.initializeTelegramWebApp();
        } else {
            console.log('🌐 Standard web browser detected');
            this.handleWebInit();
        }
        
        this.hideLoading();
    }

    detectTelegramEnvironment() {
        // Primary detection: Check if Telegram WebApp is available
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('✅ Telegram WebApp detected');
            return true;
        }
        
        // Secondary detection: Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tgWebAppStartParam') || urlParams.get('tgWebAppPlatform')) {
            console.log('✅ Telegram URL parameters detected');
            return true;
        }
        
        // Tertiary detection: Check user agent
        if (navigator.userAgent.includes('Telegram')) {
            console.log('✅ Telegram user agent detected');
            return true;
        }
        
        console.log('❌ No Telegram environment detected');
        return false;
    }

    async initializeTelegramWebApp() {
        if (this.telegramInitAttempted) {
            console.log('⚠️ Telegram initialization already attempted');
            return;
        }
        
        this.telegramInitAttempted = true;
        
        try {
            // Ensure Telegram WebApp is available
            if (!window.Telegram?.WebApp) {
                console.error('❌ Telegram.WebApp not available after detection');
                this.handleWebInit();
                return;
            }

            console.log('🔄 Starting Telegram WebApp initialization...');
            
            // CRITICAL: Initialize Telegram WebApp in correct order
            window.Telegram.WebApp.expand(); // Expand first
            window.Telegram.WebApp.ready(); // Then mark as ready
            
            console.log('✅ Telegram WebApp initialized:', {
                platform: window.Telegram.WebApp.platform,
                version: window.Telegram.WebApp.version,
                initData: window.Telegram.WebApp.initData ? 'Available' : 'Not available',
                initDataUnsafe: window.Telegram.WebApp.initDataUnsafe
            });

            // Wait a bit for initData to populate
            setTimeout(async () => {
                await this.handleTelegramAuth();
            }, 1000);

        } catch (error) {
            console.error('❌ Telegram WebApp initialization failed:', error);
            this.handleWebInit();
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
                this.showSection('home');
            } else {
                this.showSection('auth');
            }
        });
    }

    // FIXED: Telegram authentication with proper initData handling
    async handleTelegramAuth() {
        console.log('🔐 Starting Telegram authentication...');
        
        let initData = '';
        
        // Method 1: Get from Telegram WebApp
        if (window.Telegram?.WebApp) {
            initData = window.Telegram.WebApp.initData;
            console.log('📱 InitData from WebApp:', initData ? `Available (${initData.length} chars)` : 'Not available');
        }
        
        // Method 2: Try to get from URL as fallback
        if (!initData) {
            const urlParams = new URLSearchParams(window.location.search);
            initData = urlParams.get('tgWebAppData') || '';
            console.log('🔗 InitData from URL:', initData ? 'Available' : 'Not available');
        }

        if (!initData) {
            console.log('❌ No authentication data available - showing manual login');
            this.showToast('Telegram authentication data not available. Please click "Login with Telegram" to retry.', 'info');
            
            // Make sure Telegram button is visible for manual retry
            const telegramBtn = document.getElementById('telegram-login-btn');
            if (telegramBtn) {
                telegramBtn.style.display = 'flex';
                telegramBtn.onclick = () => this.retryTelegramAuth();
            }
            return;
        }

        this.showLoading('Authenticating with Telegram...');

        try {
            console.log('🔄 Sending auth request to API...');
            const result = await this.apiCall('/auth', {
                method: 'POST',
                body: JSON.stringify({ initData })
            });

            console.log('✅ Auth response:', result);

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
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('❌ Telegram auth error:', error);
            this.showToast(`Login failed: ${error.message}`, 'error');
            
            // Show Telegram button for retry
            const telegramBtn = document.getElementById('telegram-login-btn');
            if (telegramBtn) {
                telegramBtn.style.display = 'flex';
                telegramBtn.onclick = () => this.retryTelegramAuth();
            }
        } finally {
            this.hideLoading();
        }
    }

    // Retry Telegram auth manually
    async retryTelegramAuth() {
        console.log('🔄 Manual Telegram auth retry...');
        
        // Re-initialize Telegram WebApp
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
        }
        
        await this.handleTelegramAuth();
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

            console.log(`🌐 API Call: ${endpoint}`, config);
            
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API error ${response.status}:`, errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ API call failed:', error);
            throw error;
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

        // Telegram login button - UPDATED
        const telegramLoginBtn = document.getElementById('telegram-login-btn');
        if (telegramLoginBtn) {
            telegramLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.retryTelegramAuth();
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

        this.showLoading('Loading posts...');
        
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

        this.showLoading('Publishing post...');

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
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            const messageEl = loadingOverlay.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
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
        this.showLoading('Setting up development session...');
        
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
            console.log('✅ API Health:', result);
            return true;
        } catch (error) {
            console.error('❌ API Health check failed:', error);
            return false;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.teleBlogApp = new TeleBlogApp();
});

// Debug helper - Add this to help with troubleshooting
console.log('🔧 TeleBlog Debug Mode Active');
console.log('📱 Telegram WebApp available:', !!window.Telegram?.WebApp);
console.log('🌐 Current URL:', window.location.href);
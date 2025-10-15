// TeleBlog - Enhanced Modern Telegram Mini App
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
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Enhanced TeleBlog...');
        
        // Initialize core systems
        this.initTheme();
        this.setupNavigation();
        this.setupEventListeners();
        
        // Check authentication
        await this.checkAuth();
        
        if (this.currentUser) {
            await this.loadInitialData();
            this.updateAuthUI(true);
        } else {
            this.showSection('auth');
        }
        
        this.hideLoading();
        this.setupServiceWorker();
    }

    // Enhanced Theme Management
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
        // Update theme option highlights
        document.querySelectorAll('.theme-option').forEach(option => {
            if (option.dataset.theme === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    // Settings Management
    openSettings() {
        document.getElementById('settings-overlay').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settings-overlay').classList.remove('active');
    }

    // Enhanced Event Listeners
    setupEventListeners() {
        // Settings button
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());
        
        // Settings back button
        document.getElementById('settings-back-btn')?.addEventListener('click', () => this.closeSettings());
        
        // Theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.setTheme(option.dataset.theme);
            });
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                window.location.hash = section;
            });
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Development login
        document.getElementById('dev-login-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDevLogin();
        });

        // Post form
        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePostSubmit();
            });
        }

        // Save draft
        document.getElementById('save-draft')?.addEventListener('click', () => this.saveDraft());

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

        // Mobile menu (removed since we have bottom nav now)
        // const mobileMenu = document.querySelector('.mobile-menu');
        // const navLinks = document.querySelector('.nav-links');
        // if (mobileMenu && navLinks) {
        //     mobileMenu.addEventListener('click', () => {
        //         mobileMenu.classList.toggle('active');
        //         navLinks.classList.toggle('active');
        //     });
        // }

        // Profile tabs
        document.getElementById('my-posts-btn')?.addEventListener('click', () => this.switchProfileTab('my-posts'));
        document.getElementById('drafts-btn')?.addEventListener('click', () => this.switchProfileTab('drafts'));
        document.getElementById('bookmarks-btn')?.addEventListener('click', () => this.switchProfileTab('bookmarks'));
    }

    // Enhanced Navigation
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
            this.showToast('Please login with Telegram to access this section!', 'error');
            this.showSection('auth');
            return;
        }

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

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

    // Enhanced Authentication
    async checkAuth() {
        // Check if we have a valid token
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

        // Check Telegram authentication
        if (window.Telegram && Telegram.WebApp) {
            await this.handleTelegramAuth();
        }
        
        return this.currentUser !== null;
    }

    async handleTelegramAuth() {
        const initData = Telegram.WebApp.initData;
        
        if (!initData) {
            console.log('No Telegram initData available');
            return;
        }

        this.showLoading();

        try {
            const workerUrl = 'https://teleblog-indexjs.macrotiser-pk.workers.dev';
            const response = await fetch(`${workerUrl}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            });

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status}`);
            }

            const { user, token } = await response.json();
            
            this.currentUser = user;
            this.jwtToken = token;
            
            // Store for future sessions
            localStorage.setItem('teleblog_token', token);
            localStorage.setItem('teleblog_user', JSON.stringify(user));
            
            console.log('User authenticated:', user);
            
            // Update UI and load data
            this.updateAuthUI(true);
            this.updateUserUI();
            await this.loadInitialData();
            
        } catch (error) {
            console.error('Authentication error:', error);
            this.showToast('Authentication failed. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.loadPosts(),
            this.loadDrafts(),
            this.loadBookmarks(),
            this.loadUserStats()
        ]);
    }

    // Enhanced Post Management
    async loadPosts(filter = 'latest', searchQuery = '') {
        if (!this.currentUser) return;

        this.showLoading();
        
        try {
            // Simulated API call - replace with actual worker endpoint
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Mock data - replace with actual API response
            this.posts = [
                {
                    id: '1',
                    title: 'Welcome to TeleBlog!',
                    excerpt: 'Start your blogging journey with our decentralized platform built on Telegram. Share your thoughts with the world...',
                    content: 'Start your blogging journey with our decentralized platform built on Telegram. Share your thoughts with the world and connect with like-minded individuals.',
                    author: 'TeleBlog Team',
                    author_id: 'system',
                    date: new Date().toISOString(),
                    tags: ['welcome', 'introduction', 'blogging'],
                    view_count: 42,
                    like_count: 15,
                    is_premium: false,
                    read_time: '2 min read'
                },
                {
                    id: '2', 
                    title: 'Getting Started Guide',
                    excerpt: 'Learn how to create and publish your first post on TeleBlog. This comprehensive guide covers everything from writing to publishing.',
                    content: 'Learn how to create and publish your first post on TeleBlog. This comprehensive guide covers everything from writing to publishing.',
                    author: 'TeleBlog Team',
                    author_id: 'system',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    tags: ['guide', 'tutorial', 'beginners'],
                    view_count: 28,
                    like_count: 8,
                    is_premium: false,
                    read_time: '3 min read'
                },
                {
                    id: '3',
                    title: 'The Future of Decentralized Blogging',
                    excerpt: 'Exploring how blockchain and decentralized technologies are revolutionizing content creation and ownership...',
                    content: 'Exploring how blockchain and decentralized technologies are revolutionizing content creation and ownership...',
                    author: this.currentUser.display_name,
                    author_id: this.currentUser.id,
                    date: new Date(Date.now() - 172800000).toISOString(),
                    tags: ['blockchain', 'web3', 'technology'],
                    view_count: 156,
                    like_count: 34,
                    is_premium: true,
                    read_time: '5 min read'
                }
            ];

            // Apply filters and search
            let filteredPosts = this.applyPostFilters(this.posts, filter, searchQuery);
            this.renderPosts(filteredPosts);
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showToast('Failed to load posts', 'error');
        } finally {
            this.hideLoading();
        }
    }

    applyPostFilters(posts, filter, searchQuery) {
        let filtered = [...posts];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(post => 
                post.title.toLowerCase().includes(query) ||
                post.excerpt.toLowerCase().includes(query) ||
                post.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Apply sort filter
        switch (filter) {
            case 'popular':
                filtered.sort((a, b) => b.view_count - a.view_count);
                break;
            case 'following':
                // In real implementation, filter by followed authors
                filtered = filtered.filter(post => post.author_id !== 'system');
                break;
            case 'latest':
            default:
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
        }

        return filtered;
    }

    // Enhanced Post Creation with Drafts
    async handlePostSubmit() {
        if (!this.currentUser) {
            this.showToast('Please login to create posts!', 'error');
            this.showSection('auth');
            return;
        }

        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const tags = document.getElementById('post-tags').value;
        const isPremium = document.getElementById('is-premium').checked;
        const isPublished = document.getElementById('is-published').checked;

        if (!title || !content) {
            this.showToast('Please fill in both title and content!', 'error');
            return;
        }

        this.showLoading();

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            const newPost = {
                id: Date.now().toString(),
                title,
                content,
                excerpt: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
                author: this.currentUser.display_name,
                author_id: this.currentUser.id,
                date: new Date().toISOString(),
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
                view_count: 0,
                like_count: 0,
                is_premium: isPremium,
                is_published: isPublished,
                read_time: this.calculateReadTime(content)
            };

            if (isPublished) {
                this.posts.unshift(newPost);
                this.showToast('Post published successfully! 🎉', 'success');
            } else {
                this.drafts.unshift(newPost);
                this.showToast('Post saved as draft! 💾', 'success');
            }

            // Reset form and update UI
            document.getElementById('post-form').reset();
            this.updateCharCounter();
            this.renderPosts(this.posts);
            this.updateStats();
            
            if (isPublished) {
                window.location.hash = 'posts';
            } else {
                window.location.hash = 'profile';
            }
            
        } catch (error) {
            this.showToast('Failed to publish post: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Drafts Management
    async loadDrafts() {
        if (!this.currentUser) return;
        
        // Simulated drafts - replace with actual API call
        this.drafts = [
            {
                id: 'draft-1',
                title: 'My Unfinished Thoughts',
                content: 'This is a draft post that I haven\'t finished writing yet...',
                excerpt: 'This is a draft post that I haven\'t finished writing yet...',
                date: new Date().toISOString(),
                tags: ['draft', 'thoughts']
            }
        ];
    }

    async saveDraft() {
        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const tags = document.getElementById('post-tags').value;

        if (!title && !content) {
            this.showToast('Nothing to save as draft', 'warning');
            return;
        }

        const draft = {
            id: 'draft-' + Date.now(),
            title: title || 'Untitled Draft',
            content,
            excerpt: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            date: new Date().toISOString(),
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        this.drafts.unshift(draft);
        this.showToast('Draft saved successfully! 💾', 'success');
    }

    // Bookmarks System
    async loadBookmarks() {
        if (!this.currentUser) return;
        
        // Simulated bookmarks - replace with actual API call
        this.bookmarks = [];
    }

    toggleBookmark(postId) {
        const index = this.bookmarks.findIndex(b => b.postId === postId);
        
        if (index > -1) {
            this.bookmarks.splice(index, 1);
            this.showToast('Removed from bookmarks', 'success');
        } else {
            this.bookmarks.push({ postId, date: new Date().toISOString() });
            this.showToast('Added to bookmarks', 'success');
        }
        
        // Update UI if on posts page
        this.renderPosts(this.posts);
    }

    // Enhanced UI Rendering
    renderPosts(posts = []) {
        const postsContainer = document.getElementById('posts-container');
        const profileContent = document.getElementById('profile-content');

        if (postsContainer) {
            if (posts.length > 0) {
                postsContainer.innerHTML = posts.map(post => this.createPostCard(post)).join('');
            } else {
                postsContainer.innerHTML = this.createEmptyState('posts');
            }
        }

        if (profileContent) {
            // Render user's posts in profile
            const userPosts = posts.filter(post => post.author_id === this.currentUser?.id);
            if (userPosts.length > 0) {
                profileContent.innerHTML = userPosts.map(post => this.createPostCard(post, true)).join('');
            } else {
                profileContent.innerHTML = this.createEmptyState('profile-posts');
            }
        }
    }

    createPostCard(post, showActions = false) {
        const isBookmarked = this.bookmarks.some(b => b.postId === post.id);
        const isAuthor = post.author_id === this.currentUser?.id;

        return `
            <div class="post-card ${post.is_premium ? 'premium-post' : ''}">
                ${post.is_premium ? '<div class="premium-badge">Premium</div>' : ''}
                
                <div class="post-header">
                    <div class="post-meta">
                        <span class="post-author">${post.author}</span>
                        <span class="post-date">${this.formatDate(post.date)}</span>
                    </div>
                    <div class="post-stats">
                        <span class="post-stat">👁️ ${post.view_count}</span>
                        <span class="post-stat">❤️ ${post.like_count}</span>
                        <span class="post-stat">⏱️ ${post.read_time}</span>
                    </div>
                </div>
                
                <h3 class="post-title">${post.title}</h3>
                <p class="post-excerpt">${post.excerpt}</p>
                
                <div class="post-footer">
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                    <div class="post-actions">
                        <button class="icon-btn bookmark-btn ${isBookmarked ? 'active' : ''}" 
                                onclick="teleBlogApp.toggleBookmark('${post.id}')"
                                title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
                            ${isBookmarked ? '🔖' : '📑'}
                        </button>
                        ${showActions ? `
                            <button class="icon-btn edit-btn" onclick="teleBlogApp.editPost('${post.id}')" title="Edit post">
                                ✏️
                            </button>
                            <button class="icon-btn delete-btn" onclick="teleBlogApp.deletePost('${post.id}')" title="Delete post">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createEmptyState(type) {
        const emptyStates = {
            'posts': `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No posts yet</h3>
                    <p>Be the first to share your thoughts with the community!</p>
                    <button class="btn-primary" onclick="window.location.hash='create'">
                        Create First Post
                    </button>
                </div>
            `,
            'profile-posts': `
                <div class="empty-state">
                    <div class="empty-icon">✏️</div>
                    <h3>No posts yet</h3>
                    <p>Start writing and share your ideas with the world!</p>
                    <button class="btn-primary" onclick="window.location.hash='create'">
                        Write Your First Post
                    </button>
                </div>
            `,
            'drafts': `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>No drafts</h3>
                    <p>Start writing and save your work as drafts!</p>
                </div>
            `,
            'bookmarks': `
                <div class="empty-state">
                    <div class="empty-icon">🔖</div>
                    <h3>No bookmarks</h3>
                    <p>Save interesting posts to read later!</p>
                </div>
            `
        };

        return emptyStates[type] || emptyStates['posts'];
    }

    // Utility Functions
    calculateReadTime(content) {
        const wordsPerMinute = 200;
        const words = content.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return `${minutes} min read`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    updateCharCounter() {
        const content = document.getElementById('post-content');
        const charCounter = document.getElementById('char-count');
        const wordCounter = document.getElementById('word-count');
        
        if (content && charCounter && wordCounter) {
            const text = content.value;
            const charCount = text.length;
            const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
            
            charCounter.textContent = charCount;
            wordCounter.textContent = wordCount;
            
            // Visual feedback for limits
            if (charCount > 5000) {
                charCounter.style.color = '#ef4444';
            } else if (charCount > 3000) {
                charCounter.style.color = '#f59e0b';
            } else {
                charCounter.style.color = 'inherit';
            }
        }
    }

    // Profile Tabs
    switchProfileTab(tab) {
        // Update active tab
        document.querySelectorAll('.profile-actions button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Load tab content
        switch (tab) {
            case 'drafts':
                this.renderDrafts();
                break;
            case 'bookmarks':
                this.renderBookmarks();
                break;
            case 'my-posts':
            default:
                this.renderPosts(this.posts.filter(post => post.author_id === this.currentUser?.id));
                break;
        }
    }

    renderDrafts() {
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            if (this.drafts.length > 0) {
                profileContent.innerHTML = this.drafts.map(draft => `
                    <div class="post-card draft-card">
                        <div class="post-header">
                            <span class="draft-badge">Draft</span>
                            <span class="post-date">${this.formatDate(draft.date)}</span>
                        </div>
                        <h3 class="post-title">${draft.title}</h3>
                        <p class="post-excerpt">${draft.excerpt}</p>
                        <div class="post-actions">
                            <button class="btn-outline btn-small" onclick="teleBlogApp.editDraft('${draft.id}')">
                                Continue Editing
                            </button>
                            <button class="btn-outline btn-small" onclick="teleBlogApp.deleteDraft('${draft.id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                profileContent.innerHTML = this.createEmptyState('drafts');
            }
        }
    }

    renderBookmarks() {
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            const bookmarkedPosts = this.posts.filter(post => 
                this.bookmarks.some(b => b.postId === post.id)
            );
            
            if (bookmarkedPosts.length > 0) {
                profileContent.innerHTML = bookmarkedPosts.map(post => this.createPostCard(post)).join('');
            } else {
                profileContent.innerHTML = this.createEmptyState('bookmarks');
            }
        }
    }

    // Enhanced Toast System
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Loading States
    showLoading() {
        this.isLoading = true;
        document.getElementById('loading-overlay')?.classList.add('active');
    }

    hideLoading() {
        this.isLoading = false;
        document.getElementById('loading-overlay')?.classList.remove('active');
    }

    // Service Worker for Offline Support
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered: ', registration))
                .catch(registrationError => console.log('SW registration failed: ', registrationError));
        }
    }

    // Development Login (Fallback)
    async handleDevLogin() {
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
    }

    // Logout
    handleLogout() {
        this.currentUser = null;
        this.jwtToken = null;
        this.posts = [];
        this.drafts = [];
        this.bookmarks = [];
        
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
            guestElements.forEach(el => el.style.display = 'none');
            authElements.forEach(el => el.style.display = 'flex');
        } else {
            guestElements.forEach(el => el.style.display = 'flex');
            authElements.forEach(el => el.style.display = 'none');
        }
    }

    updateUserUI() {
        const profileName = document.getElementById('profile-name');
        const profileUsername = document.getElementById('profile-username');
        const profileType = document.getElementById('profile-type');
        const userAvatar = document.getElementById('user-avatar');

        if (this.currentUser) {
            if (profileName) profileName.textContent = this.currentUser.display_name;
            if (profileUsername) {
                profileUsername.textContent = this.currentUser.username ? `@${this.currentUser.username}` : '';
            }
            if (profileType) profileType.textContent = this.currentUser.role || 'Blogger';
            if (userAvatar) {
                const fallback = userAvatar.querySelector('#avatar-fallback');
                if (fallback) fallback.textContent = this.currentUser.display_name.charAt(0).toUpperCase();
            }
        } else {
            if (profileName) profileName.textContent = 'Not logged in';
            if (profileUsername) profileUsername.textContent = '';
            if (profileType) profileType.textContent = 'Guest';
        }
    }

    updateStats() {
        const postCount = document.getElementById('post-count');
        const followerCount = document.getElementById('follower-count');
        const followingCount = document.getElementById('following-count');
        const viewCount = document.getElementById('view-count');
        const totalPosts = document.getElementById('total-posts');

        if (postCount) postCount.textContent = this.posts.filter(p => p.author_id === this.currentUser?.id).length;
        if (followerCount) followerCount.textContent = '0';
        if (followingCount) followingCount.textContent = '0';
        if (viewCount) viewCount.textContent = this.posts.reduce((sum, post) => sum + post.view_count, 0);
        if (totalPosts) totalPosts.textContent = this.posts.length;
    }

    // Placeholder methods for future implementation
    async loadUserStats() {
        // To be implemented with actual API calls
    }

    editPost(postId) {
        this.showToast('Edit feature coming soon!', 'info');
    }

    deletePost(postId) {
        if (confirm('Are you sure you want to delete this post?')) {
            this.posts = this.posts.filter(post => post.id !== postId);
            this.renderPosts(this.posts);
            this.updateStats();
            this.showToast('Post deleted successfully', 'success');
        }
    }

    editDraft(draftId) {
        const draft = this.drafts.find(d => d.id === draftId);
        if (draft) {
            document.getElementById('post-title').value = draft.title;
            document.getElementById('post-content').value = draft.content;
            document.getElementById('post-tags').value = draft.tags.join(', ');
            window.location.hash = 'create';
            this.showToast('Draft loaded for editing', 'success');
        }
    }

    deleteDraft(draftId) {
        if (confirm('Are you sure you want to delete this draft?')) {
            this.drafts = this.drafts.filter(draft => draft.id !== draftId);
            this.renderDrafts();
            this.showToast('Draft deleted', 'success');
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
// TeleBlog - Modern Telegram Mini App
class TeleBlogApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUser = null;
        this.posts = [];
        this.jwtToken = localStorage.getItem('teleblog_token');
        this.init();
    }

    async init() {
        console.log('🚀 Initializing TeleBlog...');
        
        // Initialize components
        this.setupNavigation();
        this.setupEventListeners();
        
        // Check authentication
        await this.checkAuth();
        
        if (this.currentUser) {
            await this.loadPosts();
            this.updateAuthUI(true);
        } else {
            this.showSection('auth');
        }
        
        this.hideLoading();
    }

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
                console.log('Invalid token');
            }
        }

        // Check Telegram authentication
        if (window.Telegram && Telegram.WebApp) {
            await this.handleTelegramAuth();
        }
        
        return this.currentUser !== null;
    }

// tbwrkrintgr
    async handleTelegramAuth() {
    const initData = Telegram.WebApp.initData;
    
    if (!initData) {
        console.log('No Telegram initData available');
        return;
    }

    this.showLoading();

    try {
        // 🎯 UPDATE THIS LINE WITH YOUR WORKER URL
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
        
        // Update UI and load posts
        this.updateAuthUI(true);
        this.updateUserUI();
        await this.loadPosts();
        
    } catch (error) {
        console.error('Authentication error:', error);
        this.showNotification('Authentication failed. Please try again.', 'error');
    } finally {
        this.hideLoading();
    }
}

    setupNavigation() {
        // Handle hash changes for SPA navigation
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Handle initial route
        this.handleRouteChange();
    }

    handleRouteChange() {
        const hash = window.location.hash.substring(1) || 'home';
        this.showSection(hash);
    }

    showSection(sectionId) {
        // Don't show protected sections to guests
        const protectedSections = ['posts', 'create', 'profile'];
        if (!this.currentUser && protectedSections.includes(sectionId)) {
            this.showNotification('Please login with Telegram to access this section!', 'error');
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
    }

    setupEventListeners() {
        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                window.location.hash = section;
            });
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Development login button
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

        // Character counter
        const postContent = document.getElementById('post-content');
        if (postContent) {
            postContent.addEventListener('input', () => {
                this.updateCharCounter();
            });
        }

        // Mobile menu
        const mobileMenu = document.querySelector('.mobile-menu');
        const navLinks = document.querySelector('.nav-links');
        if (mobileMenu && navLinks) {
            mobileMenu.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
        }
    }

    async handleDevLogin() {
        // Development fallback - create a mock user
        this.currentUser = {
            id: 'dev-user-123',
            telegram_id: '123456789',
            username: 'devuser',
            display_name: 'Development User',
            role: 'reader',
            avatar_url: null
        };
        
        this.jwtToken = 'dev-token-' + Date.now();
        
        localStorage.setItem('teleblog_token', this.jwtToken);
        localStorage.setItem('teleblog_user', JSON.stringify(this.currentUser));
        
        this.updateAuthUI(true);
        this.updateUserUI();
        this.showSection('home');
        this.showNotification('Development login successful!', 'success');
    }

    async handleLogout() {
        this.currentUser = null;
        this.jwtToken = null;
        this.posts = [];
        
        localStorage.removeItem('teleblog_token');
        localStorage.removeItem('teleblog_user');
        
        this.updateAuthUI(false);
        this.updateUserUI();
        this.renderPosts();
        this.showSection('auth');
        this.showNotification('Logged out successfully!', 'success');
    }

    updateAuthUI(isLoggedIn) {
        const body = document.body;
        
        if (isLoggedIn) {
            body.classList.add('logged-in');
            body.classList.remove('guest-only');
        } else {
            body.classList.add('guest-only');
            body.classList.remove('logged-in');
        }
    }

    updateUserUI() {
        const profileName = document.getElementById('profile-name');
        const profileUsername = document.getElementById('profile-username');
        const profileType = document.getElementById('profile-type');
        const postCount = document.getElementById('post-count');

        if (this.currentUser) {
            if (profileName) profileName.textContent = this.currentUser.display_name;
            if (profileUsername) profileUsername.textContent = this.currentUser.username ? `@${this.currentUser.username}` : '';
            if (profileType) profileType.textContent = this.currentUser.role || 'User';
            if (postCount) postCount.textContent = this.posts.length;
        } else {
            if (profileName) profileName.textContent = 'Not logged in';
            if (profileUsername) profileUsername.textContent = '';
            if (profileType) profileType.textContent = 'Guest';
            if (postCount) postCount.textContent = '0';
        }
    }

    async loadPosts() {
        if (!this.currentUser) return;

        try {
            // Simulated posts for now - replace with actual API call
            this.posts = [
                {
                    id: '1',
                    title: 'Welcome to TeleBlog!',
                    excerpt: 'Start your blogging journey with our decentralized platform built on Telegram.',
                    author: 'TeleBlog Team',
                    date: new Date().toISOString(),
                    tags: ['welcome', 'introduction']
                },
                {
                    id: '2', 
                    title: 'Getting Started Guide',
                    excerpt: 'Learn how to create and publish your first post on TeleBlog.',
                    author: 'TeleBlog Team',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    tags: ['guide', 'tutorial']
                }
            ];

            this.renderPosts();
            this.updateStats();
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showNotification('Failed to load posts', 'error');
        }
    }

    renderPosts() {
        const postsContainer = document.getElementById('posts-container');

        if (postsContainer) {
            if (this.posts.length > 0) {
                postsContainer.innerHTML = this.posts.map(post => `
                    <div class="post-card">
                        <div class="post-header">
                            <span class="post-author">${post.author}</span>
                            <span class="post-date">${this.formatDate(post.date)}</span>
                        </div>
                        <h3 class="post-title">${post.title}</h3>
                        <p class="post-excerpt">${post.excerpt}</p>
                        <div class="post-tags">
                            ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                postsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No posts yet. Be the first to write!</p>
                        <button class="btn-primary" onclick="window.location.hash='create'">
                            Create First Post
                        </button>
                    </div>
                `;
            }
        }
    }

    updateStats() {
        const postCount = document.getElementById('post-count');
        const followerCount = document.getElementById('follower-count');
        const followingCount = document.getElementById('following-count');

        if (postCount) postCount.textContent = this.posts.length;
        if (followerCount) followerCount.textContent = '0';
        if (followingCount) followingCount.textContent = '0';
    }

    updateCharCounter() {
        const content = document.getElementById('post-content');
        const counter = document.getElementById('char-count');
        if (content && counter) {
            counter.textContent = content.value.length;
        }
    }

    async handlePostSubmit() {
        if (!this.currentUser) {
            this.showNotification('Please login to create posts!', 'error');
            this.showSection('auth');
            return;
        }

        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const tags = document.getElementById('post-tags').value;

        if (!title || !content) {
            this.showNotification('Please fill in both title and content!', 'error');
            return;
        }

        this.showLoading();

        try {
            // Simulate API call - replace with actual worker endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add to local posts array
            const newPost = {
                id: Date.now().toString(),
                title,
                excerpt: content.substring(0, 150) + '...',
                author: this.currentUser.display_name,
                date: new Date().toISOString(),
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            };
            
            this.posts.unshift(newPost);
            
            this.showNotification('Post published successfully! 🎉', 'success');
            document.getElementById('post-form').reset();
            this.updateCharCounter();
            this.renderPosts();
            this.updateStats();
            window.location.hash = 'posts';
            
        } catch (error) {
            this.showNotification('Failed to publish post: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 1000;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification-success {
                    background: #10b981;
                }
                .notification-error {
                    background: #ef4444;
                }
                .notification-info {
                    background: #3b82f6;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 15px;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('active');
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.teleBlogApp = new TeleBlogApp();
});

// Modern Single Page App

// We need to add Supabase client initialization
import { createClient } from '@supabase/supabase-js';

// Modern Single Page App with Supabase
// Modern Single Page App with Full Supabase Integration
class TeleBlogApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUser = null;
        this.posts = [];
        this.supabase = null;
        this.authManager = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Modern TeleBlog with Full Supabase Integration...');
        
        // Initialize Supabase
        this.supabase = this.initializeSupabase();
        this.authManager = new AuthManager(this.supabase, this);
        
        // Check auth state
        await this.checkAuthState();
        
        // Initialize components
        this.setupNavigation();
        this.setupEventListeners();
        this.setupAuthHandlers();
        
        if (this.currentUser) {
            await this.loadUserData();
            await this.loadPosts();
        }
        
        // Hide loading
        this.hideLoading();
    }

    initializeSupabase() {
        return createClient(

            'https://hudrcdftoqcwxskhuahg.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZHJjZGZ0b3Fjd3hza2h1YWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTMwNjcsImV4cCI6MjA3MTY2OTA2N30.YqGQBcFC2oVJILZyvVP7OgPlOOkuqO6eF1QaABb7MCo'
        );
    }

    async checkAuthState() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            console.log('User is authenticated:', session.user.email);
            this.updateAuthUI(true);
        } else {
            console.log('No user session found');
            this.updateAuthUI(false);
            this.showSection('auth');
        }
    }

    setupAuthHandlers() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLoginSubmit(e);
            });
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignupSubmit(e);
            });
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleForgotPasswordSubmit(e);
            });
        }

        // Auth form switchers
        this.setupAuthSwitchers();
    }

    setupAuthSwitchers() {
        // Show signup form
        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('signup');
        });

        // Show login form
        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('login');
        });

        document.getElementById('show-login-from-forgot')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('login');
        });

        // Show forgot password
        document.getElementById('forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('forgot');
        });
    }

    showAuthForm(formType) {
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        // Show selected form
        const targetForm = document.getElementById(`${formType}-form`);
        if (targetForm) {
            targetForm.classList.add('active');
        }
    }

    async handleLoginSubmit(e) {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const result = await this.authManager.login(email, password);
        
        if (result.success) {
            this.showNotification('Login successful! 🎉', 'success');
            await this.loadUserData();
            await this.loadPosts();
            this.showSection('home');
        } else {
            this.showNotification(result.error, 'error');
        }
    }

    async handleSignupSubmit(e) {
        const fullName = document.getElementById('signup-fullname').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        const result = await this.authManager.signup(email, password, fullName);
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.showAuthForm('login');
        } else {
            this.showNotification(result.error, 'error');
        }
    }

    async handleForgotPasswordSubmit(e) {
        const email = document.getElementById('reset-email').value;

        const result = await this.authManager.resetPassword(email);
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.showAuthForm('login');
        } else {
            this.showNotification(result.error, 'error');
        }
    }

    async handleLogout() {
        const result = await this.authManager.logout();
        
        if (result.success) {
            this.showNotification('Logged out successfully!', 'success');
            this.currentUser = null;
            this.posts = [];
            this.updateAuthUI(false);
            this.updateUserUI();
            this.renderPosts();
            this.showSection('auth');
        } else {
            this.showNotification(result.error, 'error');
        }
    }

    updateAuthUI(isLoggedIn) {
        const body = document.body;
        
        if (isLoggedIn) {
            body.classList.add('logged-in');
            body.classList.remove('guest-only');
            
            // Update nav items
            document.querySelectorAll('.guest-only').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('.auth-only').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            body.classList.add('guest-only');
            body.classList.remove('logged-in');
            
            // Update nav items
            document.querySelectorAll('.guest-only').forEach(el => {
                el.style.display = 'block';
            });
            document.querySelectorAll('.auth-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
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

    // ... rest of your existing methods (loadUserData, loadPosts, etc.)

    async init() {
        console.log('🚀 Initializing Modern TeleBlog...');
        
        // Load theme preference
        this.loadThemePreference(); 
        // Initialize components
        this.setupNavigation();
        this.setupEventListeners();
        this.loadUserData();
        this.loadPosts();
        
        // Hide loading
        this.hideLoading();
    }

    loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
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
    
    // Add this to handle mobile menu closing
    this.closeMobileMenu();
    }

    closeMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        const navLinks = document.querySelector('.nav-links');
        if (mobileMenu && navLinks) {
            mobileMenu.classList.remove('active');
            navLinks.classList.remove('active');
        }
    }

    showSection(sectionId) {
    // Don't show protected sections to guests
    const protectedSections = ['posts', 'create', 'profile'];
    if (!this.currentUser && protectedSections.includes(sectionId)) {
        this.showNotification('Please login to access this section!', 'error');
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
    
        async loadUserData() {
        // Update to match your new user structure
        this.currentUser = {
            name: 'TeleBlog User',
            username: '@teleblogger',
            type: 'Content Creator',
            joinDate: new Date().toISOString(),
            stats: {
                posts: 0,
                followers: '0',
                following: '0'
            }
        };

        this.updateUserUI();
    }

    async loadPosts() {
        // Simulate posts loading
        this.posts = [
            {
                title: 'Welcome to TeleBlog!',
                excerpt: 'Start your blogging journey with us...',
                author: 'TeleBlog Team',
                date: new Date().toISOString()
            }
        ];

        this.renderPosts();
        this.updateStats();
    }

    updateUserUI() {
        const greeting = document.getElementById('user-greeting');
        const profileName = document.getElementById('profile-name');
        const profileUsername = document.getElementById('profile-username');
        const profileType = document.getElementById('profile-type');
        const postCount = document.getElementById('post-count');
        const followerCount = document.getElementById('follower-count');
        const followingCount = document.getElementById('following-count');

        if (this.currentUser) {
            if (greeting) greeting.textContent = `Welcome back, ${this.currentUser.name}!`;
            if (profileName) profileName.textContent = this.currentUser.name;
            if (profileUsername) profileUsername.textContent = this.currentUser.username;
            if (profileType) profileType.textContent = this.currentUser.type;
            if (postCount) postCount.textContent = this.currentUser.stats.posts;
            if (followerCount) followerCount.textContent = this.currentUser.stats.followers;
            if (followingCount) followingCount.textContent = this.currentUser.stats.following;
        }
    }

    renderPosts() {
        const postsContainer = document.getElementById('posts-container');
        const featuredContainer = document.getElementById('featured-posts');

        // For main posts feed with new card design
        if (postsContainer) {
            postsContainer.innerHTML = this.posts.length > 0 ? 
                this.posts.map(post => `
                    <div class="post-card modern-card">
                        <div class="post-header">
                            <div class="user-info">
                                <div class="avatar"></div>
                                <div>
                                    <span class="post-author">${post.author}</span>
                                    <span class="post-date">${this.formatDate(post.date)}</span>
                                </div>
                            </div>
                            <button class="menu-btn">⋯</button>
                        </div>
                        <h3 class="post-title">${post.title}</h3>
                        <p class="post-excerpt">${post.excerpt}</p>
                        <div class="post-actions">
                            <button class="action-btn">❤️ ${post.likes || 0}</button>
                            <button class="action-btn">💬 ${post.comments || 0}</button>
                            <button class="action-btn">🔄 ${post.shares || 0}</button>
                        </div>
                    </div>
                `).join('') :
                '<div class="empty-state">No posts yet. Start writing your first post!</div>';
        }

        // For featured posts (if you have a featured section)
        if (featuredContainer && this.posts.length > 0) {
            featuredContainer.innerHTML = this.posts.slice(0, 3).map(post => `
                <div class="featured-post modern-card">
                    <h4>${post.title}</h4>
                    <p>${post.excerpt}</p>
                    <span class="featured-badge">Featured</span>
                </div>
            `).join('');
        }
    }

    updateStats() {
        // const livePosts = document.getElementById('live-posts');
        // const totalPosts = document.getElementById('total-posts');
        // const publishedPosts = document.getElementById('published-posts');
        // const draftPosts = document.getElementById('draft-posts');

        // if (livePosts) livePosts.textContent = this.posts.length;
        // if (totalPosts) totalPosts.textContent = this.posts.length;
        // if (publishedPosts) publishedPosts.textContent = this.posts.length;
        // if (draftPosts) draftPosts.textContent = '0';

        const postCount = document.getElementById('post-count');
        const followerCount = document.getElementById('follower-count');
        const followingCount = document.getElementById('following-count');

        if (postCount) postCount.textContent = this.posts.length;
        if (followerCount) followerCount.textContent = this.currentUser?.stats.followers || '0';
        if (followingCount) followingCount.textContent = this.currentUser?.stats.following || '0';
    }

    updateCharCounter() {
        const content = document.getElementById('post-content');
        const counter = document.getElementById('char-count');
        if (content && counter) {
            counter.textContent = content.value.length;
        }
    }

    async handlePostSubmit() {
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const tags = document.getElementById('post-tags').value;

        if (!title || !content) {
            alert('Please fill in both title and content!');
            return;
        }

        this.showLoading();
        
        // Simulate API call
        setTimeout(() => {
            this.hideLoading();
            alert('Post published successfully! 🎉');
            document.getElementById('post-form').reset();
            this.updateCharCounter();
            window.location.hash = 'posts';
        }, 1000);
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
        return new Date(dateString).toLocaleDateString();
    }
}

// Initialize the modern app
document.addEventListener('DOMContentLoaded', () => {
    window.teleBlogApp = new TeleBlogApp();
});
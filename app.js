// Modern Single Page App

// We need to add Supabase client initialization
import { createClient } from '@supabase/supabase-js';

// Modern Single Page App with Supabase
class TeleBlogApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUser = null;
        this.posts = [];
        this.supabase = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Modern TeleBlog with Supabase...');
        
        // Initialize Supabase
        this.supabase = this.initializeSupabase();
        
        // Check auth state
        await this.checkAuthState();
        
        // Initialize components
        this.setupNavigation();
        this.setupEventListeners();
        await this.loadUserData();
        await this.loadPosts();
        
        // Hide loading
        this.hideLoading();
    }

    initializeSupabase() {
        return createClient(
            'https://your-project.supabase.co',
            'your-anon-key'
        );
    }

    async checkAuthState() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            console.log('User is authenticated:', session.user.email);
        } else {
            console.log('No user session found');
            this.showSection('auth'); // Redirect to auth section
        }
    }

    async loadUserData() {
        const { data: { user } } = await this.supabase.auth.getUser();
        
        if (user) {
            // Get user profile from users table
            const { data: userProfile, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error loading user profile:', error);
                // Create user profile if doesn't exist
                await this.createUserProfile(user);
                return;
            }

            this.currentUser = {
                id: user.id,
                email: user.email,
                name: userProfile?.full_name || user.email.split('@')[0],
                username: userProfile?.username || '@teleblogger',
                type: userProfile?.user_type || 'Blogger',
                avatar: userProfile?.avatar_url,
                stats: {
                    posts: userProfile?.post_count || 0,
                    followers: userProfile?.follower_count || '0',
                    following: userProfile?.following_count || '0'
                },
                joinDate: userProfile?.created_at || user.created_at
            };
        } else {
            this.currentUser = null;
        }

        this.updateUserUI();
    }

    async createUserProfile(user) {
        const { error } = await this.supabase
            .from('users')
            .insert([
                {
                    id: user.id,
                    email: user.email,
                    full_name: user.email.split('@')[0],
                    username: `@${user.email.split('@')[0]}`,
                    user_type: 'Blogger',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Error creating user profile:', error);
        } else {
            console.log('User profile created successfully');
            await this.loadUserData(); // Reload user data
        }
    }

    async loadPosts() {
        if (!this.currentUser) return;

        // Get posts from Supabase
        const { data: posts, error } = await this.supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading posts:', error);
            this.posts = [];
        } else {
            this.posts = posts || [];
        }

        this.renderPosts();
        this.updateStats();
    }

    // Update the post submission to use Supabase
    async handlePostSubmit() {
        if (!this.currentUser) {
            alert('Please login to create posts!');
            this.showSection('auth');
            return;
        }

        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const tags = document.getElementById('post-tags').value;

        if (!title || !content) {
            alert('Please fill in both title and content!');
            return;
        }

        this.showLoading();
        
        // Submit to Supabase
        const { data, error } = await this.supabase
            .from('posts')
            .insert([
                {
                    title: title,
                    content: content,
                    excerpt: content.substring(0, 150) + '...',
                    author: this.currentUser.name,
                    author_id: this.currentUser.id,
                    tags: tags.split(',').map(tag => tag.trim()),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ]);

        this.hideLoading();

        if (error) {
            alert('Error publishing post: ' + error.message);
        } else {
            alert('Post published successfully! 🎉');
            document.getElementById('post-form').reset();
            this.updateCharCounter();
            await this.loadPosts(); // Reload posts
            window.location.hash = 'posts';
        }
    }

    // Add auth methods
    async handleLogin(email, password) {
        this.showLoading();
        
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        this.hideLoading();

        if (error) {
            alert('Login failed: ' + error.message);
            return false;
        } else {
            await this.loadUserData();
            await this.loadPosts();
            this.showSection('home');
            return true;
        }
    }

    async handleSignup(email, password, fullName) {
        this.showLoading();
        
        const { data, error } = await this.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        this.hideLoading();

        if (error) {
            alert('Signup failed: ' + error.message);
            return false;
        } else {
            alert('Signup successful! Please check your email for verification.');
            this.showSection('auth');
            return true;
        }
    }

    async handleLogout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
        } else {
            this.currentUser = null;
            this.posts = [];
            this.updateUserUI();
            this.renderPosts();
            this.showSection('auth');
        }
    }

    // Rest of your existing methods remain the same...
    // (setupNavigation, handleRouteChange, showSection, setupEventListeners, etc.)
}

class TeleBlogApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUser = null;
        this.posts = [];
        this.init();
    }

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
        // ... existing code ...
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                // Save theme preference to localStorage
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            });
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.querySelector('.mobile-menu');
        const navLinks = document.querySelector('.nav-links');
        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenuBtn.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking nav links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });


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
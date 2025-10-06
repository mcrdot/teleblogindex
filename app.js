// Modern Single Page App
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
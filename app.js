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
        
        // Initialize components
        this.setupNavigation();
        this.setupEventListeners();
        this.loadUserData();
        this.loadPosts();
        
        // Hide loading
        this.hideLoading();
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

        // CTA buttons
        document.querySelectorAll('[data-section]').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                window.location.hash = section;
            });
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
    }

    async loadUserData() {
        // Simulate user loading
        this.currentUser = {
            name: 'TeleBlog User',
            type: 'Blogger',
            stats: {
                total: 0,
                published: 0,
                drafts: 0
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
        const profileType = document.getElementById('profile-type');
        const profileStats = document.getElementById('profile-stats');

        if (this.currentUser) {
            if (greeting) greeting.textContent = `Hello, ${this.currentUser.name}!`;
            if (profileName) profileName.textContent = this.currentUser.name;
            if (profileType) profileType.textContent = this.currentUser.type;
            if (profileStats) {
                profileStats.textContent = `${this.currentUser.stats.published} posts published`;
            }
        }
    }

    renderPosts() {
        const featuredContainer = document.getElementById('featured-posts');
        const postsFeed = document.getElementById('posts-feed');

        if (featuredContainer && this.posts.length > 0) {
            featuredContainer.innerHTML = this.posts.map(post => `
                <div class="post-card">
                    <div class="post-header">
                        <span class="post-author">${post.author}</span>
                        <span class="post-date">${this.formatDate(post.date)}</span>
                    </div>
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-excerpt">${post.excerpt}</p>
                </div>
            `).join('');
        }

        if (postsFeed) {
            postsFeed.innerHTML = this.posts.length > 0 ? 
                this.posts.map(post => `
                    <div class="post-card">
                        <div class="post-header">
                            <span class="post-author">${post.author}</span>
                            <span class="post-date">${this.formatDate(post.date)}</span>
                        </div>
                        <h3 class="post-title">${post.title}</h3>
                        <p class="post-excerpt">${post.excerpt}</p>
                    </div>
                `).join('') :
                '<div class="empty-state">No posts yet. Be the first to write!</div>';
        }
    }

    updateStats() {
        const livePosts = document.getElementById('live-posts');
        const totalPosts = document.getElementById('total-posts');
        const publishedPosts = document.getElementById('published-posts');
        const draftPosts = document.getElementById('draft-posts');

        if (livePosts) livePosts.textContent = this.posts.length;
        if (totalPosts) totalPosts.textContent = this.posts.length;
        if (publishedPosts) publishedPosts.textContent = this.posts.length;
        if (draftPosts) draftPosts.textContent = '0';
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
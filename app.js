// TeleBlog Lite - WORKING Simple Version
class TeleBlogApp {
    constructor() {
        this.currentUser = { first_name: 'Guest' };
        this.currentView = 'home';
        this.posts = [];
    }

    async init() {
        console.log('🌱 Baby TeleBlog waking up...');
        
        // Show loading screen first
        this.showScreen('loading-screen');
        
        // Gentle initialization with delay
        setTimeout(() => {
            this.setupUser();
            this.showScreen('main-app');
            this.setupEventListeners();
            this.loadSamplePosts();
        }, 2000);
    }

    setupUser() {
        // Simple user setup
        document.getElementById('user-greeting').textContent = 
            `Hello, ${this.currentUser.first_name}!`;
    }

    showScreen(screenName) {
        console.log('🖥️ Showing screen:', screenName);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('active');
        }
    }

    loadSamplePosts() {
        // Simple sample posts
        this.posts = [{
            title: 'Welcome to TeleBlog Lite! 🌟',
            content: 'This is your friendly blogging space in Telegram. Start writing and share your thoughts with the world!',
            author_name: 'TeleBlog Team',
            created_at: new Date().toISOString()
        }, {
            title: 'Getting Started Guide',
            content: 'Click the "Create" button to write your first post. You can share stories, ideas, or anything you love!',
            author_name: 'TeleBlog Team', 
            created_at: new Date().toISOString()
        }];
        
        this.renderPosts();
    }

    renderPosts() {
        const container = document.getElementById('posts-container');
        const featuredContainer = document.getElementById('featured-posts-container');
        
        if (!container) return;

        // Render main posts
        container.innerHTML = this.posts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <span class="author">${post.author_name}</span>
                    <span class="date">Today</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <div class="post-content">${post.content}</div>
            </div>
        `).join('');

        // Render featured posts (first one)
        if (featuredContainer && this.posts.length > 0) {
            featuredContainer.innerHTML = `
                <div class="featured-post">
                    <h4>${this.posts[0].title}</h4>
                    <p>${this.posts[0].content.substring(0, 100)}...</p>
                    <small>By ${this.posts[0].author_name}</small>
                </div>
            `;
        }
    }

    setupEventListeners() {
        console.log('🎮 Setting up event listeners...');
        
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

        // Post form
        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePostSubmit();
            });
        }
    }

    switchView(viewName) {
        console.log('🔄 Switching to view:', viewName);
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        this.currentView = viewName;
    }

    selectUserType(userType) {
        console.log('👤 Selected user type:', userType);
        this.currentUser.user_type = userType;
        this.showScreen('main-app');
        alert(`Welcome as ${userType}! 🎉`);
    }

    handlePostSubmit() {
        const title = document.getElementById('post-title')?.value;
        const content = document.getElementById('post-content')?.value;
        
        if (!title || !content) {
            alert('Please fill in both title and content! 📝');
            return;
        }
        
        alert('Post created successfully! 🎉\n\nTitle: ' + title + '\nContent: ' + content.substring(0, 50) + '...');
        
        // Clear form
        document.getElementById('post-form').reset();
    }
}

// Simple and reliable startup
document.addEventListener('DOMContentLoaded', () => {
    console.log('💖 DOM ready - Starting TeleBlog Lite...');
    window.teleBlogApp = new TeleBlogApp();
    window.teleBlogApp.init();
    
    // Safety net - always show main app after 5 seconds
    setTimeout(() => {
        const mainApp = document.getElementById('main-app');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (loadingScreen.classList.contains('active')) {
            console.log('🆘 Safety net activated - forcing main app');
            loadingScreen.classList.remove('active');
            mainApp.classList.add('active');
        }
    }, 5000);
});
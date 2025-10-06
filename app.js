// TeleBlog Lite - Simple & Gentle
class TeleBlogApp {
    constructor() {
        this.currentUser = { first_name: 'Guest' };
        this.currentView = 'home';
        this.posts = [];
    }

    async init() {
        console.log('🌱 Baby TeleBlog waking up...');
        
        // Gentle initialization
        setTimeout(() => {
            this.showMainApp();
            this.loadSomePosts();
        }, 1000);
    }

    showMainApp() {
        // Simple screen switching
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
        
        // Simple greeting
        document.getElementById('user-greeting').textContent = 
            `Hello, ${this.currentUser.first_name}!`;
    }

    loadSomePosts() {
        // Simple sample posts
        this.posts = [{
            title: 'Welcome to TeleBlog!',
            content: 'This is your friendly blogging space. Start writing your first post!',
            author_name: 'TeleBlog Team',
            created_at: new Date().toISOString()
        }];
        
        this.renderPosts();
    }

    renderPosts() {
        const container = document.getElementById('posts-container');
        if (!container) return;

        container.innerHTML = this.posts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <span class="author">${post.author_name}</span>
                    <span class="date">Just now</span>
                </div>
                <div class="post-content">${post.content}</div>
            </div>
        `).join('');
    }

    switchView(viewName) {
        // Simple view switching
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Simple nav update
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    }
}

// Gentle startup
document.addEventListener('DOMContentLoaded', () => {
    window.teleBlogApp = new TeleBlogApp();
    window.teleBlogApp.init();
});
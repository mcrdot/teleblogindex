// app.js - CLEAN VERSION WITHOUT SYNTAX ERRORS
console.log('🚀 TeleBlog Lite App Starting...');

// Initialize the application
async function initializeApp() {
    try {
        console.log('🔧 Initializing application...');
        
        // Wait for configuration to load
        if (!window.AppConfig) {
            console.log('⏳ Waiting for configuration...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Initialize Supabase
        if (window.SupabaseClient && window.SupabaseClient.init) {
            const supabase = window.SupabaseClient.init();
            if (supabase) {
                console.log('✅ Supabase initialized successfully');
                
                // Test connection
                const connected = await window.SupabaseClient.testConnection();
                if (connected) {
                    console.log('✅ Supabase connection verified');
                    await loadPosts();
                } else {
                    console.error('❌ Supabase connection failed');
                    showError('Database connection failed. Please check your internet connection.');
                }
            }
        } else {
            console.error('❌ Supabase client not available');
            showError('Application configuration error.');
        }

        // Initialize Telegram Web App if available
        initializeTelegramApp();

    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showError('Application failed to load.');
    }
}

// Initialize Telegram Web App
function initializeTelegramApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        try {
            const tg = window.Telegram.WebApp;
            console.log('✅ Telegram Web App detected:', tg.initDataUnsafe);
            
            // Expand the app to full height
            tg.expand();
            
            // Set theme parameters
            tg.setHeaderColor('#ffffff');
            tg.setBackgroundColor('#ffffff');
            
            // Try to get user data
            const user = tg.initDataUnsafe?.user;
            if (user) {
                console.log('👤 Telegram user detected:', user);
                handleTelegramUser(user);
            } else {
                console.log('ℹ️ No Telegram user data available - running in standalone mode');
                showStandaloneMessage();
            }
            
        } catch (error) {
            console.warn('⚠️ Telegram Web App initialization failed:', error);
            showStandaloneMessage();
        }
    } else {
        console.log('🌐 Running in web browser mode (non-Telegram)');
        showStandaloneMessage();
    }
}

// Handle Telegram user authentication
async function handleTelegramUser(telegramUser) {
    try {
        console.log('🔐 Processing Telegram user...');
        
        if (window.SupabaseClient && window.SupabaseClient.createUser) {
            const user = await window.SupabaseClient.createUser(telegramUser);
            if (user) {
                console.log('✅ User processed successfully:', user.id);
                showWelcomeMessage(user);
            } else {
                console.error('❌ Failed to process user');
                showError('User authentication failed.');
            }
        } else {
            console.warn('⚠️ Supabase client not available for user creation');
        }
    } catch (error) {
        console.error('❌ Telegram user handling failed:', error);
    }
}

// Load and display posts
async function loadPosts() {
    try {
        console.log('📝 Loading posts...');
        showLoading('Loading posts...');
        
        if (window.SupabaseClient && window.SupabaseClient.getPublishedPosts) {
            const posts = await window.SupabaseClient.getPublishedPosts(10, 0);
            
            if (posts && posts.length > 0) {
                console.log(`✅ Loaded ${posts.length} posts`);
                displayPosts(posts);
            } else {
                console.log('ℹ️ No posts found');
                showNoPostsMessage();
            }
        } else {
            console.error('❌ Supabase posts function not available');
            showError('Cannot load posts.');
        }
    } catch (error) {
        console.error('❌ Failed to load posts:', error);
        showError('Failed to load posts.');
    }
}

// Display posts in the UI
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) {
        console.error('❌ Posts container not found');
        return;
    }
    
    container.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="post-header">
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <div class="post-meta">
                    <span class="post-author">By ${escapeHtml(post.user?.first_name || 'Unknown')}</span>
                    <span class="post-date">${formatDate(post.published_at)}</span>
                </div>
            </div>
            <div class="post-content">
                <p>${escapeHtml(post.excerpt || post.content.substring(0, 150))}...</p>
            </div>
        `;
        container.appendChild(postElement);
    });
    
    hideLoading();
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

// Show loading indicator
function showLoading(message = 'Loading...') {
    let loader = document.getElementById('loading-indicator');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loading-indicator';
        loader.className = 'loading-indicator';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const container = document.getElementById('posts-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
            </div>
        `;
    }
    hideLoading();
}

// Show no posts message
function showNoPostsMessage() {
    const container = document.getElementById('posts-container');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No Posts Yet</h3>
                <p>Check back later for new content!</p>
            </div>
        `;
    }
    hideLoading();
}

// Show welcome message for authenticated users
function showWelcomeMessage(user) {
    console.log('👋 Welcome message for user:', user.first_name);
    // You can add a welcome banner or user-specific UI here
}

// Show message for standalone (non-Telegram) usage
function showStandaloneMessage() {
    console.log('🌐 App running in standalone mode');
    // You can add browser-specific UI adjustments here
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for global access if needed
window.TeleBlogApp = {
    initializeApp,
    loadPosts,
    showError
};
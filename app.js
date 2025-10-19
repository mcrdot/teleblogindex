// app.js - TeleBlog Production Version - SIMPLIFIED & FIXED

// Emergency loader timeout
setTimeout(() => {
  const loading = document.getElementById("loading-overlay");
  if (loading && loading.classList.contains('active')) {
    console.log('🆘 Emergency loader timeout - forcing removal');
    loading.classList.remove('active');
    document.getElementById("telegram-login-btn").style.display = "flex";
    showToast("Loading timeout. Please try manual login.", "error");
  }
}, 10000);

const API_BASE = "https://teleblog-indexjs.macrotiser-pk.workers.dev";
const SUPABASE_URL = "https://hudrcdftoqcwxskhuahg.supabase.co";

window.teleBlogApp = {
  currentUser: null,
  jwtToken: null,
  supabase: null
};

document.addEventListener("DOMContentLoaded", async () => {
  const loading = document.getElementById("loading-overlay");
  const loginBtn = document.getElementById("telegram-login-btn");
  const devLoginBtn = document.getElementById("dev-login-btn");

  console.log('🚀 App starting...');

  // Initialize Supabase
  window.teleBlogApp.supabase = window.supabase.createClient(SUPABASE_URL, "");

  // Check for existing session
  const savedToken = localStorage.getItem("teleblog_token");
  const savedUser = localStorage.getItem("teleblog_user");

  if (savedToken && savedUser) {
    console.log('📱 Found existing session');
    window.teleBlogApp.jwtToken = savedToken;
    window.teleBlogApp.currentUser = JSON.parse(savedUser);
    showAuthenticatedUI();
    loading.classList.remove("active");
    return;
  }

  // Check Telegram WebApp availability
  const tg = window.Telegram?.WebApp;
  
  if (tg) {
    console.log('📱 Telegram WebApp detected');
    tg.ready();
    tg.expand();
    
    // Wait a bit for Telegram to initialize
    setTimeout(() => {
      handleTelegramAuth(tg, loading);
    }, 1000);
  } else {
    console.log('🌐 Not in Telegram environment');
    // Not in Telegram - show manual login options
    loginBtn.style.display = "flex";
    loading.classList.remove("active");
  }

  // Setup event listeners
  loginBtn?.addEventListener("click", () => {
    if (tg?.initData) {
      authenticateWithTelegram(tg.initData);
    } else {
      alert("Please open this app inside Telegram to use Telegram login.");
    }
  });

  devLoginBtn?.addEventListener("click", () => {
    // Simple dev login without complex initData
    const devUser = {
      id: "dev_001",
      username: "developer",
      display_name: "Development User",
      role: "reader"
    };
    
    window.teleBlogApp.currentUser = devUser;
    window.teleBlogApp.jwtToken = "dev_token_fake_jwt_123";
    
    localStorage.setItem("teleblog_user", JSON.stringify(devUser));
    localStorage.setItem("teleblog_token", "dev_token_fake_jwt_123");
    
    showAuthenticatedUI();
    showToast("Development login successful!", "success");
  });
});

function handleTelegramAuth(tg, loading) {
  console.log('🔍 Checking Telegram initData...');
  console.log('initData:', tg.initData);
  console.log('initDataUnsafe:', tg.initDataUnsafe);
  console.log('platform:', tg.platform);
  console.log('version:', tg.version);

  if (tg.initData) {
    console.log('✅ initData available, authenticating...');
    authenticateWithTelegram(tg.initData);
  } else if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    console.log('⚠️ Using initDataUnsafe as fallback');
    // Try to reconstruct initData from unsafe data
    const user = tg.initDataUnsafe.user;
    const reconstructedData = `user=${encodeURIComponent(JSON.stringify(user))}&auth_date=${Math.floor(Date.now()/1000)}&hash=telegram_unsafe_mode`;
    authenticateWithTelegram(reconstructedData);
  } else {
    console.log('❌ No Telegram data available');
    // Show login button for manual auth
    document.getElementById("telegram-login-btn").style.display = "flex";
    loading.classList.remove("active");
    
    // Show debug info
    showToast("Telegram data not available. Using manual login.", "error");
  }
}

async function authenticateWithTelegram(initData) {
  const loading = document.getElementById("loading-overlay");
  const loginBtn = document.getElementById("telegram-login-btn");
  
  loading.classList.add("active");
  loginBtn.style.display = "none";

  try {
    console.log('🔐 Starting authentication...');
    
    const response = await fetch(`${API_BASE}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
        debug: {
          source: "telegram_webapp",
          timestamp: new Date().toISOString()
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Auth successful:', data);

    if (data.user && data.token) {
      // Store user data and token
      window.teleBlogApp.currentUser = data.user;
      window.teleBlogApp.jwtToken = data.token;
      
      localStorage.setItem("teleblog_token", data.token);
      localStorage.setItem("teleblog_user", JSON.stringify(data.user));

      showAuthenticatedUI();
      showToast(`Welcome ${data.user.display_name}!`, "success");
    } else {
      throw new Error("Invalid response from server");
    }

  } catch (error) {
    console.error("❌ Authentication failed:", error);
    
    // Show login button again
    document.getElementById("telegram-login-btn").style.display = "flex";
    
    // Show user-friendly error
    showToast("Login failed. Please try again.", "error");
    
  } finally {
    loading.classList.remove("active");
  }
}

function showAuthenticatedUI() {
  console.log('🎉 Showing authenticated UI');
  
  // Hide guest elements, show auth elements
  document.querySelectorAll('.guest-only').forEach(el => {
    el.style.display = 'none';
  });
  
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = 'block';
  });

  // Update profile information
  const profileName = document.getElementById("profile-name");
  const profileAvatar = document.getElementById("profile-avatar");
  
  if (profileName && window.teleBlogApp.currentUser) {
    profileName.textContent = window.teleBlogApp.currentUser.display_name;
  }
  
  // Load initial data
  loadPosts();
}

async function loadPosts() {
  const container = document.getElementById("posts-container");
  
  if (!container) {
    console.error('Posts container not found');
    return;
  }

  container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary-color);">Loading posts...</div>`;

  try {
    const response = await fetch(`${API_BASE}/posts`, {
      headers: {
        "Authorization": `Bearer ${window.teleBlogApp.jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.posts && data.posts.length > 0) {
      renderPosts(data.posts);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📰</div>
          <h3>No posts yet</h3>
          <p>Be the first to publish something!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Failed to load posts:", error);
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--error-color);">
        Failed to load posts. Please try again later.
      </div>
    `;
  }
}

function renderPosts(posts) {
  const container = document.getElementById("posts-container");
  
  container.innerHTML = posts.map(post => `
    <div class="post-card">
      <div class="post-header">
        <div class="post-meta">
          <span class="post-author">${escapeHtml(post.author || 'Unknown')}</span>
          <span class="post-date">${new Date(post.date).toLocaleDateString()}</span>
        </div>
      </div>
      <h3 class="post-title">${escapeHtml(post.title)}</h3>
      <p class="post-excerpt">${escapeHtml(post.excerpt || '')}</p>
      <div class="post-footer">
        <div class="post-stats">
          <span>❤️ ${post.like_count || 0}</span>
          <span>👁️ ${post.view_count || 0}</span>
        </div>
        <span class="read-time">${post.read_time || '1 min read'}</span>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Simple page switcher (keep your existing one)
function switchPage(id) {
  document.querySelectorAll(".page.auth-only").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  document.getElementById("nav-" + id).classList.add("active");
  
  // Load data for the active page
  if (id === 'home') {
    loadPosts();
  }
}
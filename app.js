// app.js - TeleBlog Production Version - FIXED AUTH ISSUE

const API_BASE = "https://teleblog-indexjs.macrotiser-pk.workers.dev";
const SUPABASE_URL = "https://hudrcdftoqcwxskhuahg.supabase.co";

window.teleBlogApp = {
  currentUser: null,
  jwtToken: null,
  supabase: null,
  tg: null
};

document.addEventListener("DOMContentLoaded", async () => {
  console.log('🚀 TeleBlog App Starting...');
  
  const loading = document.getElementById("loading-overlay");
  const loginBtn = document.getElementById("telegram-login-btn");
  const devLoginBtn = document.getElementById("dev-login-btn");

  // Initialize Supabase
  window.teleBlogApp.supabase = window.supabase.createClient(SUPABASE_URL, "");

  // Check for existing session first
  const savedToken = localStorage.getItem("teleblog_token");
  const savedUser = localStorage.getItem("teleblog_user");

  if (savedToken && savedUser) {
    console.log('✅ Found existing session');
    window.teleBlogApp.jwtToken = savedToken;
    window.teleBlogApp.currentUser = JSON.parse(savedUser);
    showAuthenticatedUI();
    loading.classList.remove("active");
    return;
  }

  // Initialize Telegram WebApp
  window.teleBlogApp.tg = window.Telegram?.WebApp;
  
  if (window.teleBlogApp.tg) {
    console.log('📱 Telegram WebApp detected');
    
    try {
      window.teleBlogApp.tg.ready();
      window.teleBlogApp.tg.expand();
      
      console.log('Telegram WebApp initialized:', {
        platform: window.teleBlogApp.tg.platform,
        version: window.teleBlogApp.tg.version,
        initData: window.teleBlogApp.tg.initData ? 'available' : 'missing',
        initDataUnsafe: window.teleBlogApp.tg.initDataUnsafe ? 'available' : 'missing'
      });

      // Try to authenticate with Telegram data
      await attemptTelegramAuth();
      
    } catch (error) {
      console.error('❌ Telegram init error:', error);
      showManualLogin();
    }
  } else {
    console.log('🌐 Not in Telegram environment');
    showManualLogin();
  }

  // Setup event listeners
  loginBtn?.addEventListener("click", async () => {
    if (window.teleBlogApp.tg?.initData) {
      await authenticateWithTelegram(window.teleBlogApp.tg.initData);
    } else {
      showToast("Telegram authentication not available in current environment", "error");
    }
  });

  devLoginBtn?.addEventListener("click", () => {
    useDevelopmentLogin();
  });

  // Emergency timeout - remove loader after 8 seconds
  setTimeout(() => {
    if (loading.classList.contains("active")) {
      console.log('🕒 Loader timeout - showing manual options');
      loading.classList.remove("active");
      showManualLogin();
    }
  }, 8000);
});

async function attemptTelegramAuth() {
  const loading = document.getElementById("loading-overlay");
  const tg = window.teleBlogApp.tg;

  console.log('🔐 Attempting Telegram authentication...');

  // Method 1: Use initData if available
  if (tg.initData) {
    console.log('✅ Using initData for authentication');
    await authenticateWithTelegram(tg.initData);
    return;
  }

  // Method 2: Use initDataUnsafe as fallback
  if (tg.initDataUnsafe?.user) {
    console.log('⚠️ Using initDataUnsafe as fallback');
    const userData = tg.initDataUnsafe.user;
    const reconstructedData = reconstructInitData(userData);
    await authenticateWithTelegram(reconstructedData);
    return;
  }

  // Method 3: Try after a short delay (Telegram might be still initializing)
  setTimeout(() => {
    if (tg.initData) {
      console.log('✅ Found initData after delay');
      authenticateWithTelegram(tg.initData);
    } else {
      console.log('❌ No Telegram data available after delay');
      showManualLogin();
    }
  }, 2000);
}

function reconstructInitData(userData) {
  // Reconstruct a basic initData string from initDataUnsafe
  const data = {
    user: JSON.stringify(userData),
    auth_date: Math.floor(Date.now() / 1000),
    hash: 'reconstructed_from_unsafe'
  };
  
  return Object.keys(data)
    .map(key => `${key}=${encodeURIComponent(data[key])}`)
    .join('&');
}

async function authenticateWithTelegram(initData) {
  const loading = document.getElementById("loading-overlay");
  
  loading.classList.add("active");
  document.getElementById("telegram-login-btn").style.display = "none";

  try {
    console.log('📡 Sending auth request to server...');
    
    const response = await fetch(`${API_BASE}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
        source: "telegram_webapp"
      }),
    });

    console.log('📨 Auth response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
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
      throw new Error("Invalid response: missing user or token");
    }

  } catch (error) {
    console.error("❌ Authentication failed:", error);
    showToast(`Authentication failed: ${error.message}`, "error");
    showManualLogin();
  } finally {
    loading.classList.remove("active");
  }
}

function showManualLogin() {
  console.log('👤 Showing manual login options');
  
  const loading = document.getElementById("loading-overlay");
  const loginBtn = document.getElementById("telegram-login-btn");
  const devLoginBtn = document.getElementById("dev-login-btn");
  
  loading.classList.remove("active");
  loginBtn.style.display = "flex";
  devLoginBtn.style.display = "flex";
  
  // Show debug info
  const tg = window.teleBlogApp.tg;
  if (tg) {
    console.log('Debug - Telegram WebApp Status:', {
      platform: tg.platform,
      version: tg.version,
      initData: tg.initData ? 'available' : 'missing',
      initDataUnsafe: tg.initDataUnsafe ? 'available' : 'missing',
      user: tg.initDataUnsafe?.user || 'no user data'
    });
  }
}

function useDevelopmentLogin() {
  console.log('🔧 Using development login');
  
  const devUser = {
    id: "dev_001",
    username: "teleblog_developer",
    display_name: "TeleBlog Developer",
    role: "reader",
    telegram_id: "dev_001"
  };
  
  window.teleBlogApp.currentUser = devUser;
  window.teleBlogApp.jwtToken = "dev_jwt_token_teleblog_2024";
  
  localStorage.setItem("teleblog_user", JSON.stringify(devUser));
  localStorage.setItem("teleblog_token", "dev_jwt_token_teleblog_2024");
  
  showAuthenticatedUI();
  showToast("Development login successful! 🚀", "success");
}

function showAuthenticatedUI() {
  console.log('🎉 Showing authenticated UI');
  
  // Hide guest elements
  document.querySelectorAll('.guest-only').forEach(el => {
    el.style.display = 'none';
  });
  
  // Show auth elements
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = 'block';
  });

  // Update user info
  const profileName = document.getElementById("profile-name");
  if (profileName && window.teleBlogApp.currentUser) {
    profileName.textContent = window.teleBlogApp.currentUser.display_name;
  }

  // Switch to home page
  switchPage('home');
}

async function loadPosts() {
  const container = document.getElementById("posts-container");
  
  if (!container) {
    console.error('Posts container not found');
    return;
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-secondary-color);">
      <div class="loader" style="margin: 0 auto 16px auto;"></div>
      Loading posts...
    </div>
  `;

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
    console.log('📝 Loaded posts:', data.posts?.length || 0);
    
    if (data.posts && data.posts.length > 0) {
      renderPosts(data.posts);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📰</div>
          <h3>No posts yet</h3>
          <p>Be the first to publish something amazing!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Failed to load posts:", error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3>Failed to load posts</h3>
        <p>Please check your connection and try again</p>
        <button class="btn" onclick="loadPosts()" style="margin-top: 12px;">Retry</button>
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
          <span class="post-author">${escapeHtml(post.author || 'Unknown Author')}</span>
          <span class="post-date">${formatDate(post.date)}</span>
        </div>
      </div>
      <h3 class="post-title">${escapeHtml(post.title)}</h3>
      <p class="post-excerpt">${escapeHtml(post.excerpt || post.content?.substring(0, 120) + '...' || 'No content available')}</p>
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

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Unknown date';
  }
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
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

// Page navigation
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
// app.js - TeleBlog Production Version - FIXED

const API_BASE = "https://teleblog-indexjs.macrotiser-pk.workers.dev";
const SUPABASE_URL = "https://hudrcdftoqcwxskhuahg.supabase.co";

window.teleBlogApp = {
  currentUser: null,
  jwtToken: null,
  supabase: null,
  isTelegramWebApp: false
};

document.addEventListener("DOMContentLoaded", async () => {
  const tg = window.Telegram?.WebApp;
  const loginBtn = document.getElementById("telegram-login-btn");
  const devLoginBtn = document.getElementById("dev-login-btn");
  const loading = document.getElementById("loading-overlay");

  window.teleBlogApp.supabase = window.supabase.createClient(SUPABASE_URL, "");
  
  // Check if we're in Telegram WebApp
  window.teleBlogApp.isTelegramWebApp = !!(tg && tg.initDataUnsafe);

  console.log('Telegram WebApp detected:', window.teleBlogApp.isTelegramWebApp);
  if (window.teleBlogApp.isTelegramWebApp) {
    console.log('WebApp version:', tg.version);
    console.log('Platform:', tg.platform);
    tg.ready();
    tg.expand();
  }

  const savedToken = localStorage.getItem("teleblog_token");
  const savedUser = localStorage.getItem("teleblog_user");

  if (savedToken && savedUser) {
    window.teleBlogApp.jwtToken = savedToken;
    window.teleBlogApp.currentUser = JSON.parse(savedUser);
    showAuthenticatedUI();
    loading.classList.remove("active");
    return;
  }

  // NEW: Wait for Telegram WebApp to fully initialize
  if (window.teleBlogApp.isTelegramWebApp) {
    // Try multiple approaches to get initData
    await waitForTelegramInit(tg, loading);
  } else {
    // Not in Telegram - show login button
    loginBtn.style.display = "flex";
    loading.classList.remove("active");
  }

  loginBtn?.addEventListener("click", async () => {
    if (window.teleBlogApp.isTelegramWebApp && tg.initData) {
      await authenticateWithTelegram(tg.initData);
    } else {
      alert("Telegram authentication not available.\nPlease open TeleBlog inside Telegram.");
    }
  });

  devLoginBtn?.addEventListener("click", () => {
    const fakeUser = {
      id: 123456789,
      first_name: "Dev",
      last_name: "User",
      username: "devuser",
      language_code: "en"
    };
    
    const fakeInitData = `user=${encodeURIComponent(JSON.stringify(fakeUser))}&hash=dev_mode`;
    authenticateWithTelegram(fakeInitData, true);
  });
});

// NEW: Function to wait for Telegram WebApp initialization
async function waitForTelegramInit(tg, loading) {
  const maxAttempts = 10;
  const delay = 500;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}: Checking for initData...`);
    
    // Check if initData is available
    if (tg.initData) {
      console.log('✅ initData found:', tg.initData);
      await authenticateWithTelegram(tg.initData);
      return;
    }
    
    // Alternative: Check initDataUnsafe
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      console.log('✅ initDataUnsafe found:', tg.initDataUnsafe.user);
      // Try to reconstruct initData string
      const userStr = JSON.stringify(tg.initDataUnsafe.user);
      const reconstructedInitData = `user=${encodeURIComponent(userStr)}&auth_date=${tg.initDataUnsafe.auth_date || Math.floor(Date.now()/1000)}&hash=${tg.initDataUnsafe.hash || 'dev_hash'}`;
      
      await authenticateWithTelegram(reconstructedInitData);
      return;
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, Telegram auth failed
  console.log('❌ Telegram authentication timeout');
  document.getElementById("telegram-login-btn").style.display = "flex";
  loading.classList.remove("active");
}

async function authenticateWithTelegram(initData, isDevMode = false) {
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
          timestamp: new Date().toISOString(),
          isDevMode,
          userAgent: navigator.userAgent
        }
      }),
    });

    const data = await response.json();
    console.log('Auth response:', data);

    if (!response.ok) {
      throw new Error(data.error || "Authentication failed");
    }

    // Store user data and token
    window.teleBlogApp.currentUser = data.user;
    window.teleBlogApp.jwtToken = data.token;
    
    localStorage.setItem("teleblog_token", data.token);
    localStorage.setItem("teleblog_user", JSON.stringify(data.user));

    console.log('✅ Authentication successful:', data.user.display_name);
    showAuthenticatedUI();

  } catch (error) {
    console.error("❌ Authentication error:", error);
    
    // Show appropriate error message
    if (error.message.includes("Telegram authentication")) {
      alert("Telegram authentication failed. Please try again or contact support.");
    } else if (error.message.includes("network") || error.message.includes("fetch")) {
      alert("Network error. Please check your connection and try again.");
    } else {
      alert("Authentication failed: " + error.message);
    }
    
    // Show login button again
    document.getElementById("telegram-login-btn").style.display = "flex";
  } finally {
    loading.classList.remove("active");
  }
}

function showAuthenticatedUI() {
  console.log('🔄 Showing authenticated UI for:', window.teleBlogApp.currentUser?.display_name);
  
  // Hide login screen
  const loginScreen = document.getElementById("login-screen");
  const mainApp = document.getElementById("main-app");
  
  if (loginScreen) loginScreen.style.display = "none";
  if (mainApp) mainApp.style.display = "block";

  // Update user info in UI
  const userInfo = document.getElementById("user-info");
  if (userInfo && window.teleBlogApp.currentUser) {
    const user = window.teleBlogApp.currentUser;
    userInfo.innerHTML = `
      <div class="user-avatar">
        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.display_name}">` : '👤'}
      </div>
      <div class="user-details">
        <div class="user-name">${user.display_name}</div>
        <div class="user-username">${user.username || 'Telegram User'}</div>
      </div>
    `;
  }

  // Load posts
  loadPosts();
}

async function loadPosts() {
  try {
    const response = await fetch(`${API_BASE}/posts`, {
      headers: {
        "Authorization": `Bearer ${window.teleBlogApp.jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const data = await response.json();
    displayPosts(data.posts || []);
  } catch (error) {
    console.error("Error loading posts:", error);
    document.getElementById("posts-container").innerHTML = `
      <div class="error-message">
        Failed to load posts. Please try again later.
      </div>
    `;
  }
}

function displayPosts(posts) {
  const container = document.getElementById("posts-container");
  
  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No posts yet</h3>
        <p>Be the first to create a post!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="post-card" onclick="viewPost(${post.id})">
      <div class="post-header">
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        ${post.is_premium ? '<span class="premium-badge">Premium</span>' : ''}
      </div>
      <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
      <div class="post-footer">
        <div class="post-meta">
          <span class="author">By ${escapeHtml(post.author)}</span>
          <span class="date">${formatDate(post.date)}</span>
          <span class="read-time">${post.read_time}</span>
        </div>
        <div class="post-stats">
          <span class="views">👁️ ${post.view_count}</span>
          <span class="likes">❤️ ${post.like_count}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function viewPost(postId) {
  alert(`View post ${postId} - Feature coming soon!`);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Navigation functions
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.app-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show target section
  document.getElementById(`${sectionName}-section`).classList.add('active');
  
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
  
  // Load section-specific content
  if (sectionName === 'posts') {
    loadPosts();
  } else if (sectionName === 'profile') {
    loadProfile();
  }
}

async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE}/profile`, {
      headers: {
        "Authorization": `Bearer ${window.teleBlogApp.jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch profile");
    }

    const data = await response.json();
    displayProfile(data);
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("profile-content").innerHTML = `
      <div class="error-message">
        Failed to load profile. Please try again later.
      </div>
    `;
  }
}

function displayProfile(data) {
  const container = document.getElementById("profile-content");
  const user = data.user;
  const stats = data.stats;
  
  container.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">
        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.display_name}">` : '👤'}
      </div>
      <div class="profile-info">
        <h2>${escapeHtml(user.display_name)}</h2>
        <p class="username">${user.username || 'No username'}</p>
        <p class="user-id">ID: ${user.telegram_id}</p>
        <p class="role">Role: ${user.role}</p>
      </div>
    </div>
    
    <div class="profile-stats">
      <div class="stat-card">
        <div class="stat-number">${stats.total_posts}</div>
        <div class="stat-label">Posts</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.total_likes}</div>
        <div class="stat-label">Likes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.total_views}</div>
        <div class="stat-label">Views</div>
      </div>
    </div>
  `;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // This will be handled by the main event listener above
  });
} else {
  // DOM already ready
  console.log('DOM already ready, initializing app...');
}
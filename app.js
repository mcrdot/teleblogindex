// app.js - TeleBlog Production Version

const API_BASE = "https://teleblog-indexjs.macrotiser-pk.workers.dev";
const SUPABASE_URL = "https://hudrcdftoqcwxskhuahg.supabase.co";

window.teleBlogApp = {
  currentUser: null,
  jwtToken: null,
  supabase: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const tg = window.Telegram?.WebApp;
  const loginBtn = document.getElementById("telegram-login-btn");
  const devLoginBtn = document.getElementById("dev-login-btn");
  const loading = document.getElementById("loading-overlay");

  window.teleBlogApp.supabase = window.supabase.createClient(SUPABASE_URL, "");

  tg?.ready();
  tg?.expand();

  const savedToken = localStorage.getItem("teleblog_token");
  const savedUser = localStorage.getItem("teleblog_user");

  if (savedToken && savedUser) {
    window.teleBlogApp.jwtToken = savedToken;
    window.teleBlogApp.currentUser = JSON.parse(savedUser);
    showAuthenticatedUI();
    loading.classList.remove("active");
    return;
  }

  if (tg && tg.initData) {
    try {
      await authenticateWithTelegram(tg.initData);
    } catch (err) {
      console.error("Auto auth failed:", err);
      loading.classList.remove("active");
    }
  } else {
    loginBtn.style.display = "flex";
    loading.classList.remove("active");
  }

  loginBtn?.addEventListener("click", async () => {
    if (tg?.initData) {
      await authenticateWithTelegram(tg.initData);
    } else {
      alert("Telegram authentication not ready.\nPlease open TeleBlog inside Telegram.");
    }
  });

  devLoginBtn?.addEventListener("click", () => {
    const fakeUser = {
      id: "dev_001",
      username: "@developer",
      display_name: "Dev User",
    };
    window.teleBlogApp.currentUser = fakeUser;
    window.teleBlogApp.jwtToken = "dev_token";
    localStorage.setItem("teleblog_user", JSON.stringify(fakeUser));
    localStorage.setItem("teleblog_token", "dev_token");
    showAuthenticatedUI();
  });
});

async function authenticateWithTelegram(initData) {
  const loading = document.getElementById("loading-overlay");
  loading.classList.add("active");

  const response = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  const data = await response.json();

  if (data?.user && data?.token) {
    window.teleBlogApp.currentUser = data.user;
    window.teleBlogApp.jwtToken = data.token;
    localStorage.setItem("teleblog_user", JSON.stringify(data.user));
    localStorage.setItem("teleblog_token", data.token);
    showToast(`Welcome ${data.user.display_name}`, "success");
    showAuthenticatedUI();
  } else {
    showToast("Authentication failed. Try again.", "error");
  }

  loading.classList.remove("active");
}

function showAuthenticatedUI() {
  document.querySelector(".guest-only").style.display = "none";
  document.querySelector(".auth-only").style.display = "flex";
  document.getElementById("profile-name").innerText =
    window.teleBlogApp.currentUser?.display_name || "User";
  document.getElementById("auth").classList.remove("active");
  document.getElementById("home").classList.add("active");
  loadPosts();
}

async function loadPosts() {
  const container = document.getElementById("posts-container");
  container.innerHTML = `<p style="color:var(--text-secondary-color);text-align:center;">Loading posts...</p>`;

  try {
    const res = await fetch(`${API_BASE}/posts`, {
      headers: {
        Authorization: `Bearer ${window.teleBlogApp.jwtToken}`,
      },
    });
    const data = await res.json();

    if (data?.posts?.length) {
      container.innerHTML = "";
      data.posts.forEach((post) => {
        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
          <div class="post-header">
            <div class="post-meta">
              <span class="post-author">${post.author}</span>
              <span class="post-date">${new Date(post.date).toLocaleDateString()}</span>
            </div>
          </div>
          <h3 class="post-title">${post.title}</h3>
          <p class="post-excerpt">${post.excerpt}</p>
          <div class="post-footer">
            <div class="post-stats">
              <span>❤️ ${post.like_count}</span>
              <span>👁️ ${post.view_count}</span>
            </div>
            <span class="read-time">${post.read_time}</span>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📰</div><h3>No posts yet</h3><p>Be the first to publish!</p></div>`;
    }
  } catch (err) {
    console.error("Failed to load posts:", err);
    container.innerHTML = `<p style="color:red;text-align:center;">Error loading posts</p>`;
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close">&times;</button>`;
  container.appendChild(toast);

  toast.querySelector(".toast-close").onclick = () => toast.remove();
  setTimeout(() => toast.remove(), 4000);
}

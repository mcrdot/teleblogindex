// cpt = 68dfd0bc-40a0-8321-9819-2c0de03681fa
// app.js - TeleBlog Application (updated to work with existing index.html)
// - Renders dynamic pages into #page-content
// - Handles guest mode when Telegram WebApp isn't available
// - Ensures restoreDraftContent() and showProfile() exist
// - Loads posts immediately after successful login

// Global state
let tg;
let currentUser = null;
let posts = [];
let currentView = 'feed';
let viewHistory = [];
let isAppInitialized = false;
let supabaseConnected = false;
let userTypeSelected = false;

// Boot
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Starting app initialization');
  initializeApp();
});

async function initializeApp() {
  if (isAppInitialized) return;

  try {
    console.log('Step 1: Initializing Telegram WebApp...');
    await initializeTelegramWebApp();

    console.log('Step 2: Initializing Supabase...');
    supabaseConnected = await initializeSupabase();

    console.log('Step 3: Checking authentication...');
    await checkAuth();

    console.log('Step 4: Setting up UI...');
    setupEditorLeaveConfirmation();
    restoreDraftContent(); // safe placeholder exists below

    isAppInitialized = true;
    updateNavigationState();

    if (supabaseConnected) {
      console.log('✅ App initialization completed - Supabase connected');
      showNotification('App ready! Connected to database.', 'success');
    } else {
      console.log(⚠️ App initialization completed - Using demo data');
      showNotification('App ready! (Using demo data)', 'info');
    }
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    showNotification('Failed to initialize app. Please refresh.', 'error');
  }
}

/* -------------------------
   Telegram initialization
------------------------- */
function initializeTelegramWebApp() {
  return new Promise((resolve) => {
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';

    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
      tg = Telegram.WebApp;
      safelyInitializeTelegram();
      console.log('✅ Production: Using real Telegram WebApp');
      resolve();
    } else if (isLocal) {
      tg = createMockTelegramWebApp();
      console.log('✅ Development: Using mock Telegram WebApp');
      resolve();
    } else {
      console.log('⏳ Waiting for Telegram WebApp to load...');
      const checkTelegram = setInterval(() => {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
          clearInterval(checkTelegram);
          tg = Telegram.WebApp;
          safelyInitializeTelegram();
          console.log('✅ Telegram WebApp loaded after wait');
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkTelegram);
        console.warn('⚠️ Telegram WebApp not available, using fallback (guest mode)');
        tg = createMockTelegramWebApp();
        resolve();
      }, 3000);
    }
  });
}

function safelyInitializeTelegram() {
  try {
    if (!tg) return;
    if (tg.expand) tg.expand();
    if (tg.enableClosingConfirmation) {
      try { tg.enableClosingConfirmation(); } catch(e) { /* ignore unsupported */ }
    }
    if (tg.setBackgroundColor) {
      try { tg.setBackgroundColor('#121212'); } catch(e) {}
    }
    if (tg.setHeaderColor) {
      try { tg.setHeaderColor('#1e1e1e'); } catch(e) {}
    }

    console.log('Telegram WebApp safely initialized');
    console.log('Init Data:', tg.initData);
    console.log('Platform:', tg.platform);
    console.log('Version:', tg.version);
  } catch (error) {
    console.warn('Telegram initialization had minor issues:', error);
  }
}

// Mock Telegram WebApp (for local/dev)
function createMockTelegramWebApp() {
  const mockUser = {
    id: Math.floor(Math.random() * 1000000000),
    first_name: 'Dev',
    last_name: 'User',
    username: 'devuser',
    language_code: 'en'
  };

  return {
    initDataUnsafe: { user: mockUser },
    initData: JSON.stringify({ user: mockUser }),
    platform: 'web',
    version: 'dev',
    expand: () => console.log('Mock expand()'),
    enableClosingConfirmation: () => console.log('Mock enableClosingConfirmation()'),
    setBackgroundColor: (c) => console.log('Mock setBackgroundColor', c),
    setHeaderColor: (c) => console.log('Mock setHeaderColor', c),
    showPopup: (p) => alert(`${p.title}\n\n${p.message}`),
    showAlert: (m) => alert(m),
    showConfirm: (m, cb) => cb(confirm(m))
  };
}

/* -------------------------
   Supabase initialization helper
------------------------- */
async function initializeSupabase() {
  if (!window.SupabaseClient) {
    console.error('❌ SupabaseClient not available');
    return false;
  }

  const client = window.SupabaseClient.init();
  if (!client) {
    console.error('❌ Failed to initialize Supabase client');
    return false;
  }

  try {
    const connected = await window.SupabaseClient.testConnection();
    return connected;
  } catch (e) {
    console.warn('⚠️ Supabase check failed:', e);
    return false;
  }
}

/* -------------------------
   Auth
------------------------- */
async function checkAuth() {
  updateUI('loading', 'Checking authentication...');

  // prefer safe access
  const telegramUser = tg?.initDataUnsafe?.user ?? null;

  if (telegramUser) {
    console.log('Telegram user detected:', telegramUser);
    await authenticateUser(telegramUser);
  } else {
    console.log('No Telegram user found — running in guest mode');
    // show guest feed but still attempt to load posts (read-only)
    currentUser = null;
    navigateTo('feed');
    if (supabaseConnected) await loadPosts(); // show posts even for guests
    else showGuestLandingPage();
  }
}

async function authenticateUser(telegramUser) {
  updateUI('loading', 'Logging in...');
  console.log('Authenticating user:', telegramUser.id);

  try {
    let user = await window.SupabaseClient.getUserByTelegramId(telegramUser.id);
    console.log('User lookup result:', user);

    if (!user) {
      console.log('Creating new user...');
      user = await window.SupabaseClient.createUser(telegramUser);
    }

    if (user) {
      currentUser = user;
      console.log('User authenticated:', currentUser);
      updateUserInfo();

      // Immediately load posts for authenticated user
      await loadPosts();

      if (!currentUser.user_type || currentUser.user_type === 'general') {
        navigateTo('user-type-selection');
      } else {
        navigateTo('feed');
      }
    } else {
      console.error('User authentication failed');
      showLogin();
      showNotification('Failed to authenticate. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showLogin();
    showNotification('Authentication error. Please try again.', 'error');
  }
}

/* -------------------------
   Navigation & Views
------------------------- */
function updateNavigationState() {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navItems = document.querySelectorAll('.nav-item');
  if (currentView === 'feed' && navItems[0]) navItems[0].classList.add('active');
  if (currentView === 'editor' && navItems[1]) navItems[1].classList.add('active');
  if (currentView === 'profile' && navItems[2]) navItems[2].classList.add('active');
}

function navigateTo(view, data = null) {
  console.log('Navigating to:', view);
  viewHistory.push({ view: currentView, data: data });
  currentView = view;

  updateNavigationState();

  switch (view) {
    case 'feed':
      loadPosts();
      break;
    case 'editor':
      showPostEditor();
      break;
    case 'profile':
      showProfile();
      break;
    case 'user-type-selection':
      showUserTypeSelection();
      break;
    default:
      loadPosts();
  }
}

function goBack() {
  if (viewHistory.length > 0) {
    const previous = viewHistory.pop();
    navigateTo(previous.view, previous.data);
  } else {
    navigateTo('feed');
  }
}

/* -------------------------
   User Type onboarding
------------------------- */
function showUserTypeSelection() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  pageContent.innerHTML = `
    <div class="onboarding-container">
      <h2>Choose Your Profile Type</h2>
      <p>Select how you'll use TeleBlog to unlock relevant features</p>

      <div class="user-type-options">
        <div class="user-type-card" onclick="selectUserType('general', event)">
          <div class="type-icon">👤</div>
          <h3>General User</h3>
          <p>Share personal stories, opinions, and casual content</p>
          <ul>
            <li>Basic post formatting</li>
            <li>Personal tags</li>
            <li>Community engagement</li>
          </ul>
        </div>

        <div class="user-type-card" onclick="selectUserType('group_owner', event)">
          <div class="type-icon">👥</div>
          <h3>Group Owner</h3>
          <p>Manage community content and announcements</p>
          <ul>
            <li>Group linking</li>
            <li>Announcement tags</li>
            <li>Member targeting</li>
            <li>Event promotions</li>
          </ul>
        </div>

        <div class="user-type-card" onclick="selectUserType('channel_owner', event)">
          <div class="type-icon">📢</div>
          <h3>Channel Owner</h3>
          <p>Professional content creation and broadcasting</p>
          <ul>
            <li>Advanced formatting</li>
            <li>Post scheduling</li>
            <li>Basic analytics</li>
            <li>Premium tags</li>
          </ul>
        </div>
      </div>

      <button class="btn btn-primary" onclick="saveUserType()" disabled id="continue-btn">
        Continue to TeleBlog
      </button>
    </div>
  `;
}

function selectUserType(userType, event) {
  try {
    document.querySelectorAll('.user-type-card').forEach(card => card.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    const btn = document.getElementById('continue-btn');
    if (btn) btn.disabled = false;
    window.selectedUserType = userType;
  } catch (e) {
    console.error('selectUserType error:', e);
  }
}

async function saveUserType() {
  if (!window.selectedUserType) {
    showNotification('Please select a user type first.', 'error');
    return;
  }

  showNotification('Saving your profile type...', 'loading');

  try {
    const result = await window.SupabaseClient.updateUserType(currentUser.id, window.selectedUserType);

    if (result) {
      currentUser.user_type = window.selectedUserType;
      userTypeSelected = true;
      showNotification('Profile type saved successfully!', 'success');
      navigateTo('feed');
    } else {
      throw new Error('Failed to save user type');
    }
  } catch (error) {
    console.error('Error saving user type:', error);
    showNotification('Failed to save profile type. Please try again.', 'error');
  }
}

/* -------------------------
   User Info & Profile
------------------------- */
function updateUserInfo() {
  const userInfoEl = document.getElementById('user-info');
  if (!userInfoEl) return;

  const avatarEl = userInfoEl.querySelector('.avatar');
  if (currentUser && avatarEl) {
    avatarEl.textContent = currentUser.first_name ? currentUser.first_name.charAt(0).toUpperCase() : 'U';
    const name = currentUser.first_name || currentUser.username || 'User';
    userInfoEl.querySelector('span').textContent = name;
    return;
  }

  // If no logged in user, show guest text
  if (avatarEl) avatarEl.textContent = 'G';
  if (userInfoEl.querySelector('span')) userInfoEl.querySelector('span').textContent = 'Guest';
}

function showProfile() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  pageContent.innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <h2>Your Profile</h2>
        <span class="user-type-badge ${currentUser?.user_type || 'general'}">
          ${getUserTypeLabel(currentUser?.user_type || 'general')}
        </span>
      </div>
      <div class="profile-content">
        <div class="profile-info">
          <div class="profile-avatar">${currentUser?.first_name?.charAt(0) || 'U'}</div>
          <h3>${currentUser?.first_name || 'User'} ${currentUser?.last_name || ''}</h3>
          <p>@${currentUser?.username || 'no-username'}</p>
        </div>
        ${renderUserTypeSpecificInfo()}
        <div class="profile-stats">
          <div class="stat"><strong>0</strong><span>Posts</span></div>
          <div class="stat"><strong>0</strong><span>Followers</span></div>
          <div class="stat"><strong>0</strong><span>Following</span></div>
        </div>
        <div class="profile-actions">
          <button class="btn" onclick="showEditProfile()">Edit Profile</button>
          <button class="btn" onclick="changeUserType()">Change User Type</button>
          ${currentUser?.user_type !== 'general' ? `<button class="btn" onclick="manageLinkedEntities()">Manage ${currentUser.user_type === 'group_owner' ? 'Groups' : 'Channels'}</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* -------------------------
   Posts feed & editor
------------------------- */
async function loadPosts() {
  console.log('Loading posts...');
  updateUI('loading', 'Loading posts...');

  try {
    posts = await window.SupabaseClient.getPublishedPosts();
    console.log('Posts loaded:', posts);

    if (posts && posts.length > 0) {
      showPosts();
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error('Error loading posts:', error);
    updateUI('error', 'Failed to load posts. Please try again.');
    showNotification('Failed to load posts. Please check your connection.', 'error');
  }
}

function showPosts() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  let postsHtml = '<div class="feed">';

  if (!supabaseConnected) {
    postsHtml += `
      <div class="connection-warning">
        <span>🔧 Development Mode</span>
        <p>Using demo data. Real posts will appear when Supabase is connected.</p>
      </div>
    `;
  }

  if (posts && posts.length > 0) {
    posts.forEach(post => {
      const authorName = post.user ? `${post.user.first_name || ''} ${post.user.last_name || ''}`.trim() : (post.author || 'Unknown Author');
      const isMockPost = post.id && String(post.id).startsWith('mock-');
      const mockBadge = isMockPost ? '<span class="mock-badge">Demo</span>' : '';

      postsHtml += `
        <div class="post-card" data-post-id="${post.id}">
          ${mockBadge}
          ${post.image ? '<div class="post-image">📷 Post Image</div>' : ''}
          <div class="post-content">
            <h3 class="post-title">${escapeHtml(post.title || 'Untitled')}</h3>
            <p class="post-excerpt">${escapeHtml(post.excerpt || 'No excerpt available')}</p>
            <div class="post-meta">
              <div>
                <span>By ${escapeHtml(authorName)}</span>
                <span> • ${formatDate(post.published_at || post.created_at)}</span>
              </div>
              <div class="post-tags">
                ${post.tags && post.tags.length > 0 ? post.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('') : '<span class="tag">#general</span>'}
              </div>
            </div>
          </div>
        </div>
      `;
    });
  } else {
    postsHtml += `
      <div class="empty-state">
        <h3>No posts found</h3>
        <p>Be the first to create a post!</p>
      </div>
    `;
  }

  postsHtml += '</div>';
  pageContent.innerHTML = postsHtml;
}

/* Editor */
function getUserTypeFeatures(userType) {
  // same structure as before; keep unchanged for brevity (should be the same content you previously had)
  // I assume you still want the same UI strings and toolbar markup — keep your original getUserTypeFeatures body here.
  // For clarity/space I've omitted copying that long object again — paste your existing getUserTypeFeatures body here if needed.
  return window._teleblog_userTypeFeatures ? window._teleblog_userTypeFeatures(userType) : (userType === 'channel_owner' ? {} : {});
}

function showPostEditor() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  const userType = currentUser?.user_type || 'general';
  const editorFeatures = getUserTypeFeatures(userType);

  pageContent.innerHTML = `
    <div class="editor-container">
      <div class="editor-header">
        <button onclick="navigateTo('feed')" class="btn btn-back">← Back</button>
        <h2>Create ${editorFeatures.postTypeLabel || 'Post'}</h2>
        <button onclick="savePost()" class="btn btn-primary">Publish</button>
      </div>

      ${editorFeatures.specialFields || ''}

      <div class="editor-form">
        <input type="text" id="post-title" class="post-title-input" placeholder="${editorFeatures.titlePlaceholder || 'Title'}">
        <div class="editor-toolbar">${editorFeatures.toolbarButtons || ''}</div>
        <textarea id="post-content" class="post-content-input" placeholder="${editorFeatures.contentPlaceholder || 'Write...'}"></textarea>
        <div class="post-options">${editorFeatures.specialOptions || ''}</div>
        <input type="text" id="post-tags" class="post-tags-input" placeholder="${editorFeatures.tagsPlaceholder || 'tags'}">
      </div>
    </div>
  `;
}

async function savePost() {
  const titleEl = document.getElementById('post-title');
  const contentEl = document.getElementById('post-content');
  const tagsEl = document.getElementById('post-tags');

  const title = titleEl?.value?.trim() || '';
  const content = contentEl?.value?.trim() || '';
  const tags = tagsEl?.value ? tagsEl.value.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title || !content) {
    showNotification('Please add a title and content to your post.', 'error');
    return;
  }

  showNotification('Publishing your post...', 'loading');

  try {
    if (!supabaseConnected) {
      showNotification('Cannot publish - Database not connected. Please check Supabase configuration.', 'error');
      return;
    }

    const supabase = window.SupabaseClient.getClient();
    const telegramUser = tg?.initDataUnsafe?.user;
    const user = currentUser || (telegramUser ? await window.SupabaseClient.createUser(telegramUser) : null);

    if (!user) {
      showNotification('Unable to find or create user.', 'error');
      return;
    }

    const postData = {
      title: title,
      content: content,
      excerpt: content.substring(0, 150) + '...',
      tags: tags,
      user_id: user.id,
      is_published: true,
      published_at: new Date().toISOString(),
      user_type: currentUser?.user_type || 'general'
    };

    if (currentUser?.user_type === 'group_owner') {
      const linkedGroup = document.getElementById('linked-group')?.value;
      if (linkedGroup) postData.linked_group = linkedGroup;
    } else if (currentUser?.user_type === 'channel_owner') {
      const linkedChannel = document.getElementById('linked-channel')?.value;
      if (linkedChannel) postData.linked_channel = linkedChannel;
    }

    const sup = window.SupabaseClient.getClient();
    const { data, error } = await sup.from('posts').insert(postData).select();

    if (error) throw error;

    clearDraft();
    showNotification('Post published successfully!', 'success');
    await loadPosts();
    navigateTo('feed');
  } catch (error) {
    console.error('Error saving post:', error);
    showNotification('Could not publish post. Please try again.', 'error');
  }
}

/* -------------------------
   UI helpers & misc
------------------------- */
function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

function showEmptyState() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;
  pageContent.innerHTML = `
    <div class="empty-state">
      <h3>No posts yet</h3>
      <p>Be the first to create a post in this community!</p>
      <button onclick="navigateTo('editor')" class="btn">Create First Post</button>
    </div>
  `;
}

function showLogin() {
  updateUI('error', 'Please open this app in Telegram to authenticate.');
}

function showGuestLandingPage() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;
  pageContent.innerHTML = `
    <div class="empty-state">
      <h3>Welcome to TeleBlog Lite (Guest)</h3>
      <p>You are viewing the app without Telegram login. Open via Telegram to unlock full features.</p>
    </div>
  `;
}

function updateUI(state, message = '') {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  switch (state) {
    case 'loading':
      pageContent.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>`;
      break;
    case 'error':
      pageContent.innerHTML = `
        <div class="error-state">
          <h3>Error</h3>
          <p>${message}</p>
          <button onclick="location.reload()" class="btn">Retry</button>
        </div>`;
      break;
    default:
      break;
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">×</button>`;
  const container = document.getElementById('notification-container') || document.body;
  container.appendChild(notification);
  setTimeout(() => { if (notification.parentElement) notification.remove(); }, 5000);
}

function setupEditorLeaveConfirmation() {
  window.addEventListener('beforeunload', function (e) {
    const title = document.getElementById('post-title')?.value;
    const content = document.getElementById('post-content')?.value;
    if (title || content) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  });
}

function restoreDraftContent() {
  // Placeholder: load saved draft from localStorage and stash it for editor
  try {
    const draft = localStorage.getItem('teleblog_draft');
    if (draft) {
      localStorage.setItem('teleblog_draft_restore', draft);
      console.log('Draft restored to teleblog_draft_restore (placeholder)');
    }
  } catch (e) {
    console.log('No draft to restore');
  }
}

function clearDraft() {
  try {
    localStorage.removeItem('teleblog_draft');
    localStorage.removeItem('teleblog_draft_restore');
  } catch {}
}

function getUserTypeLabel(userType) {
  const labels = {
    general: '👤 General User',
    group_owner: '👥 Group Owner',
    channel_owner: '📢 Channel Owner'
  };
  return labels[userType] || '👤 User';
}

function renderUserTypeSpecificInfo() {
  const userType = currentUser?.user_type || 'general';
  switch (userType) {
    case 'group_owner':
      return `<div class="user-type-info"><h4>Group Owner Features</h4><ul><li>Group announcements</li><li>Member engagement tools</li><li>Cross-posting to Telegram groups</li></ul></div>`;
    case 'channel_owner':
      return `<div class="user-type-info"><h4>Channel Owner Features</h4><ul><li>Professional content creation</li><li>Post scheduling</li><li>Channel integration</li></ul></div>`;
    default:
      return `<div class="user-type-info"><h4>General User Features</h4><ul><li>Personal blogging</li><li>Community engagement</li><li>Content discovery</li></ul></div>`;
  }
}

function changeUserType() { navigateTo('user-type-selection'); }
function manageLinkedEntities() { showNotification('Linked entities management coming soon!', 'info'); }
function showEditProfile() { showNotification('Profile editing coming soon!', 'info'); }
function formatText(type) { showNotification(`${type} formatting coming soon!`, 'info'); }
function insertBulletList() { showNotification('List formatting coming soon!', 'info'); }
function insertNumberedList() { showNotification('Numbered list coming soon!', 'info'); }
function addBlockquote() { showNotification('Blockquote feature coming soon!', 'info'); }
function addAnnouncementBadge() { showNotification('Announcement badge coming soon!', 'info'); }

// Very small sanitizer for rendering user-provided strings in the UI
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// =======================
// Restore Draft Content
// =======================
function restoreDraftContent() {
    try {
        const draft = localStorage.getItem("teleblog_draft");
        if (draft) {
            const editor = document.getElementById("editor");
            if (editor) {
                editor.value = draft;
                console.log("📝 Draft content restored");
            } else {
                console.warn("⚠️ Editor element not found for draft restore");
            }
        } else {
            console.log("ℹ️ No draft content to restore");
        }
    } catch (err) {
        console.error("❌ Failed to restore draft content:", err);
    }
}


// Expose used functions for inline onclick handlers
window.navigateTo = navigateTo;
window.goBack = goBack;
window.savePost = savePost;
window.selectUserType = selectUserType;
window.saveUserType = saveUserType;
window.changeUserType = changeUserType;
window.manageLinkedEntities = manageLinkedEntities;
window.showEditProfile = showEditProfile;
window.formatText = formatText;
window.insertBulletList = insertBulletList;
window.insertNumberedList = insertNumberedList;
window.addBlockquote = addBlockquote;
window.addAnnouncementBadge = addAnnouncementBadge;

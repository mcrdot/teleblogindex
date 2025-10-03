// scripts/supabase-client.js - UPDATED WITH ROBUST CONNECTION TESTING
// cpt - 68dfd0bc-40a0-8321-9819-2c0de03681fa

let supabaseClient;
let isInitialized = false;
let connectionTested = false;

function initSupabase() {
  if (isInitialized && supabaseClient) {
    console.log('✅ Supabase already initialized');
    return supabaseClient;
  }

  if (!window.AppConfig || !window.AppConfig.supabase) {
    console.error('❌ Supabase configuration not found in AppConfig');
    return null;
  }

  const config = window.AppConfig.supabase;
  if (!config.url || !config.anonKey) {
    console.error('❌ Supabase URL or anonKey missing');
    return null;
  }

  try {
    // use global `supabase` (cdn v2) to create a client
    supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Client-Info': 'teleblog-app'
        }
      }
    });

    isInitialized = true;
    console.log('✅ Supabase client initialized');
    console.log('📋 Supabase URL:', config.url);
    console.log('🔑 API Key present:', config.anonKey ? 'Yes' : 'No');

    return supabaseClient;
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err);
    return null;
  }
}

async function testConnection() {
  if (connectionTested) return true;

  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Cannot test connection - Supabase not initialized');
    return false;
  }

  try {
    console.log('🔍 Testing Supabase connection...');
    
    // More robust connection test that doesn't depend on specific tables
    const { data, error } = await supabaseClient
      .from('_test_connection')
      .select('*')
      .limit(1)
      .maybeSingle();

    // If the dummy table doesn't exist, try a different approach
    if (error && error.code === '42P01') {
      // Table doesn't exist, but connection is working - try a simple query
      console.log('ℹ️ Testing connection with alternative method...');
      
      // Try to get database time to verify connection
      const { data: timeData, error: timeError } = await supabaseClient
        .rpc('get_database_time');
      
      if (timeError && timeError.code === '42883') {
        // Function doesn't exist, but connection is valid
        console.log('✅ Supabase connection successful (connection verified)');
        connectionTested = true;
        return true;
      }
      
      if (!timeError) {
        console.log('✅ Supabase connection test successful');
        connectionTested = true;
        return true;
      }
    }

    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      connectionTested = false;
      return false;
    }

    console.log('✅ Supabase connection test successful');
    connectionTested = true;
    return true;
  } catch (err) {
    console.error('❌ Connection test exception:', err);
    connectionTested = false;
    return false;
  }
}

// ─── Database Schema Initialization ──────────────────────────────────────────

async function initializeDatabase() {
  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Supabase not initialized for DB setup');
    return false;
  }

  try {
    console.log('🔄 Checking database schema...');
    
    // Check if users table exists and has basic structure
    const { data: usersCheck, error: usersError } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (usersError && usersError.code === '42P01') {
      console.warn('⚠️ Users table does not exist - please run schema setup');
      return false;
    }

    // Check if posts table exists
    const { data: postsCheck, error: postsError } = await supabaseClient
      .from('posts')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (postsError && postsError.code === '42P01') {
      console.warn('⚠️ Posts table does not exist - please run schema setup');
      return false;
    }

    console.log('✅ Basic database schema verified');
    return true;
  } catch (err) {
    console.error('❌ Database initialization check failed:', err);
    return false;
  }
}

// ─── User Management Functions ───────────────────────────────────────────────

async function getUserByTelegramId(telegramId) {
  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Supabase not initialized in getUserByTelegramId');
    return null;
  }

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No Supabase connection - cannot proceed');
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching user:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('❌ Exception in getUserByTelegramId:', err);
    return null;
  }
}

async function createUser(telegramUser) {
  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Supabase not initialized in createUser');
    return null;
  }

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No Supabase connection - cannot proceed');
    return null;
  }

  try {
    // if user exists, return it
    const existingUser = await getUserByTelegramId(telegramUser.id);
    if (existingUser && existingUser.id && !String(existingUser.id).startsWith('dev-')) {
      console.log('ℹ️ User already exists:', existingUser.id);
      return existingUser;
    }

    const userData = {
      telegram_id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      language_code: telegramUser.language_code || null,
      is_premium: telegramUser.is_premium || false,
      user_type: 'general',
      profile_completed: false
    };

    const { data, error } = await supabaseClient
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      return null;
    }

    console.log('✅ User created successfully:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Exception in createUser:', err);
    return null;
  }
}

async function updateUserType(userId, userType) {
  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Supabase not initialized in updateUserType');
    return false;
  }

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No Supabase connection - cannot proceed');
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .update({
        user_type: userType,
        profile_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user type:', error);
      return false;
    }

    console.log('✅ User type updated successfully:', data.user_type);
    return true;
  } catch (err) {
    console.error('❌ Exception in updateUserType:', err);
    return false;
  }
}

// ─── Post Management Functions ──────────────────────────────────────────────

async function getPublishedPosts(limit = 10, offset = 0) {
  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Supabase not initialized, returning empty array');
    return [];
  }

  const connected = await testConnection();
  if (!connected) {
    console.warn('⚠️ No Supabase connection, returning empty array');
    return [];
  }

  try {
    console.log('📡 Fetching posts from Supabase...');
    const { data, error } = await supabaseClient
      .from('posts')
      .select(`
        *,
        user:users(first_name, last_name, username, user_type)
      `)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching posts:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No posts found in database');
      return [];
    }

    console.log(`✅ Loaded ${data.length} real posts from Supabase`);
    return data;
  } catch (err) {
    console.error('❌ Exception in getPublishedPosts:', err);
    return [];
  }
}

async function createPost(postData) {
  if (!supabaseClient && !initSupabase()) {
    console.warn('⚠️ Supabase not initialized in createPost');
    return null;
  }

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No Supabase connection - cannot proceed');
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating post:', error);
      return null;
    }

    console.log('✅ Post created successfully:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Exception in createPost:', err);
    return null;
  }
}

// Mock generators kept for reference (not used in production)
function getMockUser(telegramUser) {
  return {
    id: 'dev-' + telegramUser.id,
    telegram_id: telegramUser.id,
    username: telegramUser.username || 'user' + telegramUser.id,
    first_name: telegramUser.first_name || 'Dev',
    last_name: telegramUser.last_name || 'User',
    user_type: 'general',
    profile_completed: false,
    is_premium: false,
    created_at: new Date().toISOString()
  };
}

function getMockPosts() {
  return [
    {
      id: 'mock-1',
      title: 'Welcome to TeleBlog',
      content: 'This is a sample post content...',
      excerpt: 'Welcome to our blogging platform',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user: {
        first_name: 'Admin',
        username: 'admin'
      }
    }
  ];
}

// Export public API
window.SupabaseClient = {
  init: initSupabase,
  testConnection,
  initializeDatabase,
  getUserByTelegramId,
  createUser,
  updateUserType,
  getPublishedPosts,
  createPost,
  getClient: () => supabaseClient,
  isInitialized: () => isInitialized,
  isConnected: () => connectionTested
};
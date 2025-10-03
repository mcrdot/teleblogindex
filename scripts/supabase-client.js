// cpt - 68dfd0bc-40a0-8321-9819-2c0de03681fa
// scripts/supabase-client.js - UPDATED WITH USER TYPE SUPPORT (hardened)

// NOTE: This file expects window.AppConfig to be present with AppConfig.supabase.url and AppConfig.supabase.anonKey

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
    const { data, error } = await supabaseClient
      .from('posts')
      .select('id')
      .limit(1);

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

// ─── Supabase helper functions ────────────────────────────────────────────────

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
      // do not include created_at/updated_at; Supabase will apply defaults
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

// Update user type
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
        profile_completed: true
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
    // same mock posts as before...
  ];
}

// Export public API
window.SupabaseClient = {
  init: initSupabase,
  testConnection,
  getUserByTelegramId,
  createUser,
  updateUserType,
  getPublishedPosts,
  getClient: () => supabaseClient,
  isInitialized: () => isInitialized,
  isConnected: () => connectionTested
};

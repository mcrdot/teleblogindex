// scripts/supabase-client.js - DEBUGGING VERSION
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
    
    // Simple connection test using a system table
    const { data, error } = await supabaseClient
      .from('posts')
      .select('count')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      console.log('🔧 Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
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
    console.log(`🔍 Fetching user with telegram_id: ${telegramId}`);
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching user:', error);
      console.log('🔧 User fetch error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return null;
    }

    console.log('✅ User fetch result:', data ? 'User found' : 'User not found');
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
    if (existingUser && existingUser.id) {
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

    console.log('📝 Creating new user:', userData);
    const { data, error } = await supabaseClient
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      console.log('🔧 User creation error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return null;
    }

    console.log('✅ User created successfully:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Exception in createUser:', err);
    return null;
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
      console.log('🔧 Posts fetch error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No posts found in database');
      return [];
    }

    console.log(`✅ Loaded ${data.length} posts from Supabase`);
    return data;
  } catch (err) {
    console.error('❌ Exception in getPublishedPosts:', err);
    return [];
  }
}

// Export public API
window.SupabaseClient = {
  init: initSupabase,
  testConnection,
  getUserByTelegramId,
  createUser,
  getPublishedPosts,
  getClient: () => supabaseClient,
  isInitialized: () => isInitialized,
  isConnected: () => connectionTested
};
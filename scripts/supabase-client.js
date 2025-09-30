// 3bd959cb-628a-4deb-ba9b-ed609025f9aa
// ------------------------------------
// scripts/supabase-client.js
let supabaseClient;
let isInitialized = false;
let connectionTested = false;

function initSupabase() {
    if (isInitialized) {
        console.log('✅ Supabase already initialized');
        return supabaseClient;
    }

    if (!window.AppConfig || !window.AppConfig.supabase) {
        console.error("❌ Supabase configuration not found in AppConfig");
        return null;
    }

    const config = window.AppConfig.supabase;
    
    if (!config.url || !config.anonKey) {
        console.error("❌ Supabase URL or anonKey missing");
        return null;
    }

    try {
        supabaseClient = window.supabase.createClient(
            config.url,
            config.anonKey,
            {
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
            }
        );
        
        isInitialized = true;
        console.log("✅ Supabase client initialized");
        console.log("📋 Supabase URL:", config.url);
        console.log("🔑 API Key present:", config.anonKey ? 'Yes' : 'No');
        
        return supabaseClient;
    } catch (err) {
        console.error("❌ Failed to initialize Supabase client:", err);
        return null;
    }
}

// Test Supabase connection
async function testConnection() {
    if (connectionTested) return true;
    
    if (!supabaseClient && !initSupabase()) {
        console.warn("⚠️ Cannot test connection - Supabase not initialized");
        return false;
    }

    try {
        console.log("🔍 Testing Supabase connection...");
        const { data, error } = await supabaseClient
            .from('posts')
            .select('id')
            .limit(1);

        if (error) {
            console.error("❌ Supabase connection test failed:", error);
            
            if (error.message.includes('JWT')) {
                console.error("🔑 API Key issue: Invalid or expired JWT");
            } else if (error.message.includes('401')) {
                console.error("🔐 Authentication issue: Invalid API key");
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                console.error("🌐 Network issue: Cannot reach Supabase");
            }
            
            return false;
        }

        console.log("✅ Supabase connection test successful");
        connectionTested = true;
        return true;
    } catch (err) {
        console.error("❌ Connection test exception:", err);
        return false;
    }
}

// ─── Supabase helper functions ────────────────────────────────────────────────

async function getUserByTelegramId(telegramId) {
    if (!supabaseClient && !initSupabase()) {
        console.warn("⚠️ Supabase not initialized in getUserByTelegramId");
        return null;
    }

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        console.warn("⚠️ No Supabase connection, using mock user");
        return getMockUser({ id: telegramId });
    }

    try {
        const { data, error } = await supabaseClient
            .from("users")
            .select("*")
            .eq("telegram_id", telegramId)
            .maybeSingle();

        if (error) {
            console.error("❌ Error fetching user:", error);
            return getMockUser({ id: telegramId });
        }

        return data;
    } catch (err) {
        console.error("❌ Exception in getUserByTelegramId:", err);
        return getMockUser({ id: telegramId });
    }
}

async function createUser(telegramUser) {
    if (!supabaseClient && !initSupabase()) {
        console.warn("⚠️ Supabase not initialized in createUser");
        return getMockUser(telegramUser);
    }

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        console.warn("⚠️ No Supabase connection, using mock user");
        return getMockUser(telegramUser);
    }

    try {
        const existingUser = await getUserByTelegramId(telegramUser.id);
        if (existingUser && existingUser.id && !existingUser.id.startsWith('dev-')) {
            console.log("ℹ️ User already exists:", existingUser.id);
            return existingUser;
        }

        const userData = {
            telegram_id: telegramUser.id,
            username: telegramUser.username || null,
            first_name: telegramUser.first_name || null,
            last_name: telegramUser.last_name || null,
            language_code: telegramUser.language_code || null,
            is_premium: telegramUser.is_premium || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseClient
            .from("users")
            .insert(userData)
            .select()
            .single();

        if (error) {
            console.error("❌ Error creating user:", error);
            return getMockUser(telegramUser);
        }

        console.log("✅ User created successfully:", data.id);
        return data;
    } catch (err) {
        console.error("❌ Exception in createUser:", err);
        return getMockUser(telegramUser);
    }
}

async function getPublishedPosts(limit = 10, offset = 0) {
    if (!supabaseClient && !initSupabase()) {
        console.warn("⚠️ Supabase not initialized, returning mock posts");
        return getMockPosts();
    }

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        console.warn("⚠️ No Supabase connection, using mock posts");
        return getMockPosts();
    }

    try {
        console.log("📡 Fetching posts from Supabase...");
        const { data, error } = await supabaseClient
            .from("posts")
            .select(`
                *,
                user:users(first_name, last_name, username)
            `)
            .eq("is_published", true)
            .order("published_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("❌ Error fetching posts:", error);
            console.log("🔄 Falling back to mock posts");
            return getMockPosts();
        }

        if (!data || data.length === 0) {
            console.warn("⚠️ No posts found in database, showing mock posts");
            return getMockPosts();
        }

        console.log(`✅ Loaded ${data.length} real posts from Supabase`);
        return data;
    } catch (err) {
        console.error("❌ Exception in getPublishedPosts:", err);
        return getMockPosts();
    }
}

// ─── Mock Generators ─────────────────────────────────────────────────────────

function getMockUser(telegramUser) {
    console.log("👤 Using mock user for development");
    return {
        id: "dev-" + telegramUser.id,
        telegram_id: telegramUser.id,
        username: telegramUser.username || "user" + telegramUser.id,
        first_name: telegramUser.first_name || "Dev",
        last_name: telegramUser.last_name || "User",
        is_premium: false,
        created_at: new Date().toISOString(),
    };
}

function getMockPosts() {
    console.log("📋 Using mock posts for development");
    return [
        {
            id: "mock-1",
            title: "Welcome to TeleBlog! 🎉",
            excerpt: "This is a demo post showing how TeleBlog works. In production, you'll see real posts from your Supabase database.",
            content: "This is mock content for development purposes. When your Supabase connection is working, you'll see real blog posts here.",
            tags: ["welcome", "demo"],
            image: null,
            user: { first_name: "TeleBlog", last_name: "Team", username: "teleblog" },
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            is_published: true
        },
        {
            id: "mock-2",
            title: "Getting Started Guide",
            excerpt: "Learn how to create amazing blog posts and engage with your audience on Telegram.",
            content: "This is another mock post. Check your Supabase configuration to see real posts.",
            tags: ["tutorial", "beginners"],
            image: null,
            user: { first_name: "Guide", last_name: "Bot", username: "guidebot" },
            published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            is_published: true
        },
        {
            id: "mock-3",
            title: "Monetization Tips",
            excerpt: "Discover how to earn revenue from your content while providing value to readers.",
            content: "Mock content about monetization strategies.",
            tags: ["monetization", "earnings"],
            image: null,
            user: { first_name: "Revenue", last_name: "Expert", username: "earnings" },
            published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            is_published: true
        }
    ];
}

// ─── Export ───────────────────────────────────────────────────────────────────

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
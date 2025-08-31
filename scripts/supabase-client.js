// scripts/supabase-client.js
let supabaseClient;

function initSupabase() {
    if (!window.AppConfig || !window.AppConfig.supabase) {
        console.error("Supabase configuration not found");
        return null;
    }
    
    // Create Supabase client
    supabaseClient = window.supabase.createClient(
        window.AppConfig.supabase.url,
        window.AppConfig.supabase.anonKey
    );
    
    console.log("Supabase client initialized");
    return supabaseClient;
}

// Supabase helper functions
async function getUserByTelegramId(telegramId) {
    if (!supabaseClient) {
        console.warn("Supabase not initialized");
        return null;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle(); // Use maybeSingle instead of single to handle no results
        
        if (error) {
            console.error("Error fetching user:", error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error("Exception in getUserByTelegramId:", error);
        return null;
    }
}

async function createUser(telegramUser) {
    if (!supabaseClient) {
        console.warn("Supabase not initialized");
        return null;
    }
    
    try {
        // First try to get the user (in case they already exist)
        const existingUser = await getUserByTelegramId(telegramUser.id);
        if (existingUser) {
            return existingUser;
        }
        
        // If user doesn't exist, create a new one
        const userData = {
            telegram_id: telegramUser.id,
            username: telegramUser.username,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
        
        if (error) {
            console.error("Error creating user:", error);
            
            // If insert fails, return a mock user for development
            return {
                id: 'dev-' + telegramUser.id,
                telegram_id: telegramUser.id,
                username: telegramUser.username || 'user' + telegramUser.id,
                first_name: telegramUser.first_name || 'Dev',
                last_name: telegramUser.last_name || 'User',
                is_premium: false,
                created_at: new Date().toISOString()
            };
        }
        
        return data;
    } catch (error) {
        console.error("Exception in createUser:", error);
        
        // Return mock user on error for development
        return {
            id: 'dev-' + telegramUser.id,
            telegram_id: telegramUser.id,
            username: telegramUser.username || 'user' + telegramUser.id,
            first_name: telegramUser.first_name || 'Dev',
            last_name: telegramUser.last_name || 'User',
            is_premium: false,
            created_at: new Date().toISOString()
        };
    }
}

async function getPublishedPosts(limit = 10, offset = 0) {
    if (!supabaseClient) {
        console.warn("Supabase not initialized, using mock posts");
        return getMockPosts();
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select(`
                *,
                user:users(first_name, last_name, username)
            `)
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) {
            console.error("Error fetching posts:", error);
            return getMockPosts();
        }
        
        // If no posts found, return mock posts
        if (!data || data.length === 0) {
            return getMockPosts();
        }
        
        return data;
    } catch (error) {
        console.error("Exception in getPublishedPosts:", error);
        return getMockPosts();
    }
}

// Helper function to generate mock posts for development
function getMockPosts() {
    return [
        {
            id: 'mock-1',
            title: "Getting Started with TeleBlog",
            excerpt: "Learn how to create your first blog post on Telegram's newest blogging platform.",
            tags: ["beginners", "tutorial"],
            image: true,
            user: { first_name: "TeleBlog", last_name: "Team", username: "teleblog" },
            published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'mock-2',
            title: "Monetizing Your Content with Ads",
            excerpt: "Discover how to maximize your earnings through strategic ad placement in your articles.",
            tags: ["monetization", "ads"],
            image: false,
            user: { first_name: "Monetization", last_name: "Expert", username: "ad_expert" },
            published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'mock-3',
            title: "Building an Audience on Telegram",
            excerpt: "Strategies for growing your reader base and engaging with your community.",
            tags: ["audience", "growth"],
            image: true,
            user: { first_name: "Growth", last_name: "Guru", username: "growth_guru" },
            published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
}

// Make functions available globally
window.SupabaseClient = {
    init: initSupabase,
    getUserByTelegramId,
    createUser,
    getPublishedPosts,
    getClient: () => supabaseClient
};
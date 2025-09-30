// scripts/supabase-client.js
let supabaseClient;

function initSupabase() {
    if (!window.AppConfig || !window.AppConfig.supabase) {
        console.error("Supabase configuration not found in AppConfig");
        return null;
    }

    try {
        supabaseClient = window.supabase.createClient(
            window.AppConfig.supabase.url,
            window.AppConfig.supabase.anonKey
        );
        console.log("✅ Supabase client initialized with URL:", window.AppConfig.supabase.url);
    } catch (err) {
        console.error("❌ Failed to initialize Supabase client:", err);
        return null;
    }

    return supabaseClient;
}

// ─── Supabase helper functions ────────────────────────────────────────────────

async function getUserByTelegramId(telegramId) {
    if (!supabaseClient) {
        console.warn("⚠️ Supabase not initialized in getUserByTelegramId");
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from("users")
            .select("*")
            .eq("telegram_id", telegramId)
            .maybeSingle();

        console.log("🔎 getUserByTelegramId result:", { data, error });

        if (error) {
            console.error("❌ Error fetching user:", error);
            return null;
        }

        return data;
    } catch (err) {
        console.error("❌ Exception in getUserByTelegramId:", err);
        return null;
    }
}

async function createUser(telegramUser) {
    if (!supabaseClient) {
        console.warn("⚠️ Supabase not initialized in createUser");
        return null;
    }

    try {
        const existingUser = await getUserByTelegramId(telegramUser.id);
        if (existingUser) {
            console.log("ℹ️ User already exists:", existingUser);
            return existingUser;
        }

        const userData = {
            telegram_id: telegramUser.id,
            username: telegramUser.username || null,
            first_name: telegramUser.first_name || null,
            last_name: telegramUser.last_name || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseClient
            .from("users")
            .insert(userData)
            .select()
            .single();

        console.log("📝 createUser insert result:", { data, error });

        if (error) {
            console.error("❌ Error creating user:", error);
            return getMockUser(telegramUser);
        }

        return data;
    } catch (err) {
        console.error("❌ Exception in createUser:", err);
        return getMockUser(telegramUser);
    }
}

async function getPublishedPosts(limit = 10, offset = 0) {
    if (!supabaseClient) {
        console.warn("⚠️ Supabase not initialized, returning mock posts");
        return getMockPosts();
    }

    try {
        const { data, error } = await supabaseClient
            .from("posts")
            .select(
                `
                *,
                user:users(first_name, last_name, username)
            `
            )
            .eq("is_published", true)
            .order("published_at", { ascending: false })
            .range(offset, offset + limit - 1);

        console.log("📰 getPublishedPosts result:", { data, error });

        if (error) {
            console.error("❌ Error fetching posts:", error);
            return getMockPosts();
        }

        if (!data || data.length === 0) {
            console.warn("⚠️ No posts found, returning mock posts");
            return getMockPosts();
        }

        return data;
    } catch (err) {
        console.error("❌ Exception in getPublishedPosts:", err);
        return getMockPosts();
    }
}

// ─── Mock Generators ─────────────────────────────────────────────────────────

function getMockUser(telegramUser) {
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
    return [
        {
            id: "mock-1",
            title: "Getting Started with TeleBlog",
            excerpt:
                "Learn how to create your first blog post on Telegram's newest blogging platform.",
            tags: ["beginners", "tutorial"],
            image: true,
            user: { first_name: "TeleBlog", last_name: "Team", username: "teleblog" },
            published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: "mock-2",
            title: "Monetizing Your Content with Ads",
            excerpt:
                "Discover how to maximize your earnings through strategic ad placement in your articles.",
            tags: ["monetization", "ads"],
            image: false,
            user: {
                first_name: "Monetization",
                last_name: "Expert",
                username: "ad_expert",
            },
            published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: "mock-3",
            title: "Building an Audience on Telegram",
            excerpt:
                "Strategies for growing your reader base and engaging with your community.",
            tags: ["audience", "growth"],
            image: true,
            user: {
                first_name: "Growth",
                last_name: "Guru",
                username: "growth_guru",
            },
            published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ];
}

// ─── Export ───────────────────────────────────────────────────────────────────

window.SupabaseClient = {
    init: initSupabase,
    getUserByTelegramId,
    createUser,
    getPublishedPosts,
    getClient: () => supabaseClient,
};
// Supabase Client - OPTIMIZED FOR YOUR EXACT DATABASE STRUCTURE
class SupabaseClient {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.tableNames = {
            users: 'users',
            posts: 'posts',
            ad_impressions: 'ad_impressions'
        };
    }

    init() {
        if (this.isInitialized && this.client) {
            return this.client;
        }

        if (!window.AppConfig || !window.AppConfig.supabase) {
            console.error('Supabase configuration not found');
            return null;
        }

        const config = window.AppConfig.supabase;
        if (!config.url || !config.anonKey) {
            console.error('Supabase URL or anonKey missing');
            return null;
        }

        try {
            this.client = window.supabase.createClient(config.url, config.anonKey, {
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

            this.isInitialized = true;
            console.log('Supabase client initialized with optimized structure');
            return this.client;
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return null;
        }
    }

    async testConnection() {
        if (!this.client && !this.init()) {
            return false;
        }

        try {
            const { data, error } = await this.client
                .from(this.tableNames.users)
                .select('id')
                .limit(1);

            if (error) {
                console.error('Supabase connection test failed:', error);
                return false;
            }

            console.log('Supabase connection successful');
            return true;
        } catch (error) {
            console.error('Connection test exception:', error);
            return false;
        }
    }

    // User Management - OPTIMIZED FOR YOUR STRUCTURE
    async getUserByTelegramId(telegramId) {
        if (!this.client && !this.init()) return null;

        try {
            const { data, error } = await this.client
                .from(this.tableNames.users)
                .select('*')
                .eq('telegram_id', telegramId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Exception in getUserByTelegramId:', error);
            return null;
        }
    }

    async createUser(telegramUser) {
        if (!this.client && !this.init()) return null;

        try {
            // Check if user exists
            const existingUser = await this.getUserByTelegramId(telegramUser.id);
            if (existingUser) {
                console.log('User already exists:', existingUser.id);
                return existingUser;
            }

            // Use your EXACT table structure
            const userData = {
                telegram_id: telegramUser.id,
                username: telegramUser.username || null,
                first_name: telegramUser.first_name || null,
                last_name: telegramUser.last_name || null,
                is_premium: telegramUser.is_premium || false,
                user_type: 'general',
                profile_completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log('Creating user with optimized structure:', userData);
            
            const { data, error } = await this.client
                .from(this.tableNames.users)
                .insert(userData)
                .select()
                .single();

            if (error) {
                console.error('Error creating user:', error);
                return null;
            }

            console.log('User created successfully:', data.id);
            return data;
        } catch (error) {
            console.error('Exception in createUser:', error);
            return null;
        }
    }

    async updateUserType(userId, userType) {
        if (!this.client && !this.init()) return false;

        try {
            const validTypes = ['general', 'group_admin', 'channel_admin'];
            if (!validTypes.includes(userType)) {
                console.error('Invalid user type:', userType);
                return false;
            }

            const { error } = await this.client
                .from(this.tableNames.users)
                .update({
                    user_type: userType,
                    profile_completed: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('Error updating user type:', error);
                return false;
            }

            console.log('User type updated successfully');
            return true;
        } catch (error) {
            console.error('Exception in updateUserType:', error);
            return false;
        }
    }

    // Post Management - OPTIMIZED FOR YOUR STRUCTURE
    async getPublishedPosts(limit = 10, offset = 0) {
        if (!this.client && !this.init()) return [];

        try {
            const { data, error } = await this.client
                .from(this.tableNames.posts)
                .select(`
                    id,
                    title,
                    content,
                    excerpt,
                    tags,
                    is_published,
                    view_count,
                    created_at,
                    published_at,
                    user:users!posts_user_id_fkey(first_name, username, user_type)
                `)
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error fetching posts with join:', error);
                // Fallback without join
                return await this.getPublishedPostsBasic(limit, offset);
            }

            return data || [];
        } catch (error) {
            console.error('Exception in getPublishedPosts:', error);
            return [];
        }
    }

    async getPublishedPostsBasic(limit = 10, offset = 0) {
        try {
            const { data, error } = await this.client
                .from(this.tableNames.posts)
                .select('*')
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error in basic posts fetch:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Exception in getPublishedPostsBasic:', error);
            return [];
        }
    }

    async createPost(postData) {
        if (!this.client && !this.init()) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            // Use your EXACT posts table structure
            const postPayload = {
                user_id: postData.author_id,
                title: postData.title || 'Untitled',
                content: postData.content,
                excerpt: postData.excerpt || this.generateExcerpt(postData.content),
                tags: postData.tags ? postData.tags.split(',').map(tag => tag.trim()) : [],
                is_published: postData.is_published !== false,
                is_premium: postData.is_premium || false,
                view_count: 0,
                created_at: new Date().toISOString(),
                published_at: postData.is_published !== false ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            };

            console.log('Creating post with optimized structure:', postPayload);
            
            const { data, error } = await this.client
                .from(this.tableNames.posts)
                .insert(postPayload)
                .select()
                .single();

            if (error) {
                console.error('Error creating post:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data };
        } catch (error) {
            console.error('Exception in createPost:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserPosts(userId) {
        if (!this.client && !this.init()) return [];

        try {
            const { data, error } = await this.client
                .from(this.tableNames.posts)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user posts:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Exception in getUserPosts:', error);
            return [];
        }
    }

    // Utility to generate excerpt from content
    generateExcerpt(content, length = 150) {
        if (!content) return '';
        // Remove markdown and HTML tags
        const plainText = content.replace(/[#*_`\[\]()]/g, '').replace(/<[^>]*>/g, '');
        return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
    }

    // Record ad impression (for future monetization)
    async recordAdImpression(adData) {
        if (!this.client && !this.init()) return false;

        try {
            const { error } = await this.client
                .from(this.tableNames.ad_impressions)
                .insert({
                    user_id: adData.user_id || null,
                    post_id: adData.post_id || null,
                    ad_network: adData.ad_network || 'monetag',
                    revenue_estimate: adData.revenue_estimate || null,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error recording ad impression:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Exception in recordAdImpression:', error);
            return false;
        }
    }

    // Get user by ID
    async getUserById(userId) {
        if (!this.client && !this.init()) return null;

        try {
            const { data, error } = await this.client
                .from(this.tableNames.users)
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user by ID:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Exception in getUserById:', error);
            return null;
        }
    }
}

// Create global instance
window.SupabaseClient = new SupabaseClient();
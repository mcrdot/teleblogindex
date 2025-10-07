// Authentication Manager for TeleBlog
class AuthManager {
    constructor(supabaseClient, appInstance) {
        this.supabase = supabaseClient;
        this.app = appInstance;
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN') {
                this.app.loadUserData();
                this.app.loadPosts();
                this.app.showSection('home');
            } else if (event === 'SIGNED_OUT') {
                this.app.currentUser = null;
                this.app.posts = [];
                this.app.updateUserUI();
                this.app.renderPosts();
                this.app.showSection('auth');
            }
        });
    }

    async login(email, password) {
        if (!email || !password) {
            throw new Error('Please enter both email and password');
        }

        this.app.showLoading();
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            this.app.hideLoading();

            if (error) throw error;
            
            return {
                success: true,
                user: data.user,
                message: 'Login successful!'
            };
        } catch (error) {
            this.app.hideLoading();
            return {
                success: false,
                error: error.message
            };
        }
    }

    async signup(email, password, fullName, username) {
        if (!email || !password || !fullName) {
            throw new Error('Please fill all required fields');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        this.app.showLoading();
        
        try {
            // Sign up with Supabase Auth
            const { data, error } = await this.supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        username: username || `@${email.split('@')[0]}`
                    }
                }
            });

            this.app.hideLoading();

            if (error) throw error;
            
            return {
                success: true,
                user: data.user,
                message: 'Signup successful! Please check your email for verification.'
            };
        } catch (error) {
            this.app.hideLoading();
            return {
                success: false,
                error: error.message
            };
        }
    }

    async logout() {
        this.app.showLoading();
        
        try {
            const { error } = await this.supabase.auth.signOut();
            this.app.hideLoading();

            if (error) throw error;
            
            return {
                success: true,
                message: 'Logged out successfully'
            };
        } catch (error) {
            this.app.hideLoading();
            return {
                success: false,
                error: error.message
            };
        }
    }

    async resetPassword(email) {
        if (!email) {
            throw new Error('Please enter your email address');
        }

        this.app.showLoading();
        
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim());
            this.app.hideLoading();

            if (error) throw error;
            
            return {
                success: true,
                message: 'Password reset instructions sent to your email!'
            };
        } catch (error) {
            this.app.hideLoading();
            return {
                success: false,
                error: error.message
            };
        }
    }
}
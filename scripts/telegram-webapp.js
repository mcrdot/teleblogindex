// 🤱 SUPER-CHARGED Telegram WebApp Integration
class TelegramWebApp {
    constructor() {
        this.webApp = null;
        this.user = null;
        this.initData = null;
        this.isTelegram = false;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return this.isTelegram;

        console.log('🔐 Initializing Telegram WebApp Authentication...');

        if (window.Telegram && window.Telegram.WebApp) {
            this.webApp = window.Telegram.WebApp;
            this.isTelegram = true;
            
            // EXPAND and READY - Critical for auth!
            this.webApp.expand();
            this.webApp.ready();
            
            // Get user data PROPERLY
            this.initData = this.webApp.initDataUnsafe;
            this.user = this.initData?.user;
            
            console.log('✅ Telegram WebApp Initialized:', {
                platform: this.webApp.platform,
                version: this.webApp.version,
                user: this.user ? 'User Found' : 'No User Data',
                initData: this.initData ? 'Available' : 'Missing'
            });

            // Setup theme
            this.setupTheme();
            
            this.isInitialized = true;
            return true;
        } else {
            console.warn('❌ Telegram WebApp not detected - Running in standalone mode');
            this.isTelegram = false;
            this.isInitialized = true;
            return false;
        }
    }

    getUser() {
        if (!this.user && this.webApp) {
            // Try to get user data again
            this.user = this.webApp.initDataUnsafe?.user;
        }
        return this.user;
    }

    hasValidUser() {
        return !!(this.user && this.user.id);
    }

    getInitData() {
        return this.initData;
    }

    // ... rest of your existing methods
}

window.TelegramWebApp = new TelegramWebApp();
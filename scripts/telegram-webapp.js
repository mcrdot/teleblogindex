// Telegram Web App Integration
class TelegramWebApp {
    constructor() {
        this.webApp = null;
        this.user = null;
        this.initData = null;
        this.isTelegram = false;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) {
            return this.isTelegram;
        }

        if (window.Telegram && window.Telegram.WebApp) {
            this.webApp = window.Telegram.WebApp;
            this.isTelegram = true;
            this.isInitialized = true;
            
            // Initialize Telegram Web App
            this.webApp.ready();
            this.webApp.expand();
            this.webApp.enableClosingConfirmation();
            
            // Get user data
            this.initData = this.webApp.initDataUnsafe;
            this.user = this.initData.user;
            
            // Setup theme
            this.setupTheme();
            
            console.log('Telegram Web App initialized:', {
                platform: this.webApp.platform,
                version: this.webApp.version,
                user: this.user
            });
            
            return true;
        } else {
            console.warn('Telegram Web App not detected - running in standalone mode');
            this.isTelegram = false;
            this.isInitialized = true;
            return false;
        }
    }

    getUser() {
        return this.user;
    }

    isTelegramWebApp() {
        return this.isTelegram;
    }

    showAlert(message) {
        if (this.webApp) {
            this.webApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    showConfirm(message, callback) {
        if (this.webApp) {
            this.webApp.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            callback(result);
        }
    }

    closeApp() {
        if (this.webApp) {
            this.webApp.close();
        }
    }

    setupTheme() {
        if (this.webApp) {
            // Apply Telegram theme colors
            document.documentElement.style.setProperty('--tg-theme-bg-color', this.webApp.themeParams.bg_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-text-color', this.webApp.themeParams.text_color || '#000000');
            document.documentElement.style.setProperty('--tg-theme-hint-color', this.webApp.themeParams.hint_color || '#999999');
            document.documentElement.style.setProperty('--tg-theme-link-color', this.webApp.themeParams.link_color || '#2481cc');
            document.documentElement.style.setProperty('--tg-theme-button-color', this.webApp.themeParams.button_color || '#2481cc');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', this.webApp.themeParams.button_text_color || '#ffffff');
            
            // Set background color
            document.body.style.backgroundColor = this.webApp.themeParams.bg_color || '#ffffff';
        }
    }

    // Get init data for verification
    getInitData() {
        return this.initData;
    }

    // Check if user data is available
    hasUserData() {
        return !!(this.user && this.user.id);
    }

    // Get platform information
    getPlatform() {
        return this.webApp ? this.webApp.platform : 'unknown';
    }

    // Check if app is expanded
    isExpanded() {
        return this.webApp ? this.webApp.isExpanded : true;
    }
}

// Create global instance
window.TelegramWebApp = new TelegramWebApp();
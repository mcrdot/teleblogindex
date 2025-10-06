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
            this.isInitialized = true;fvf
            
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

   // In your telegram-webapp.js, UPDATE the setupTheme method:
setupTheme() {
    if (this.webApp) {
        // Use Telegram theme but ensure brightness
        const bgColor = this.webApp.themeParams.bg_color || '#ffffff';
        const textColor = this.webApp.themeParams.text_color || '#000000';
        
        // Ensure colors are bright enough
        const safeBgColor = this.ensureLightColor(bgColor);
        const safeTextColor = this.ensureDarkColor(textColor);
        
        document.documentElement.style.setProperty('--tg-theme-bg-color', safeBgColor);
        document.documentElement.style.setProperty('--tg-theme-text-color', safeTextColor);
        document.documentElement.style.setProperty('--tg-theme-hint-color', this.webApp.themeParams.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', this.webApp.themeParams.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', this.webApp.themeParams.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', this.webApp.themeParams.button_text_color || '#ffffff');
        
        // Set body background to ensure brightness
        document.body.style.backgroundColor = safeBgColor;
        document.body.style.color = safeTextColor;
    } else {
        // Standalone mode - force light theme
        this.forceLightTheme();
    }
},

// Add these helper methods:
ensureLightColor(color) {
    // If color is too dark, return white
    if (this.isColorDark(color)) {
        return '#ffffff';
    }
    return color;
},

ensureDarkColor(color) {
    // If color is too light, return black
    if (!this.isColorDark(color)) {
        return '#000000';
    }
    return color;
},

isColorDark(color) {
    // Convert to RGB and calculate brightness
    const rgb = this.hexToRgb(color);
    if (!rgb) return false;
    
    // Calculate perceived brightness
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness < 128;
},

hexToRgb(hex) {
    // Convert hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
},

forceLightTheme() {
    document.documentElement.style.setProperty('--tg-theme-bg-color', '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', '#999999');
    document.documentElement.style.setProperty('--tg-theme-link-color', '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-color', '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', '#ffffff');
    
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#000000';
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
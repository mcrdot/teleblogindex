// theme.js - ENHANCED VERSION WITH BETTER ERROR HANDLING

class ThemeManager {
    constructor() {
        this.currentTheme = this.getSavedTheme() || 'light';
        this.init();
    }

    init() {
        // Wait for DOM to be ready if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.applyTheme(this.currentTheme));
        } else {
            this.applyTheme(this.currentTheme);
        }
        
        this.setupEventListeners();
        console.log('Theme manager initialized:', this.currentTheme);
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        } else {
            console.warn('Theme toggle button not found');
            // Create fallback toggle if needed
            this.createFallbackToggle();
        }
    }

    createFallbackToggle() {
        // Only create if in development mode or no toggle exists
        if (document.getElementById('theme-toggle')) return;
        
        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'btn';
        toggle.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        toggle.style.position = 'fixed';
        toggle.style.top = '10px';
        toggle.style.right = '10px';
        toggle.style.zIndex = '1001';
        
        toggle.addEventListener('click', () => this.toggleTheme());
        document.body.appendChild(toggle);
    }

    getSavedTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (error) {
            console.warn('Could not access localStorage:', error);
            return 'light';
        }
    }

    saveTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            console.warn('Could not save theme to localStorage:', error);
        }
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        
        // Remove both possible theme classes
        document.documentElement.classList.remove('dark', 'light');
        
        // Add the current theme class
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.add('light');
        }
        
        this.updateToggleButton(theme);
        this.saveTheme(theme);
        
        // Also update Telegram theme if available
        if (window.Telegram?.WebApp) {
            try {
                const colorScheme = theme === 'dark' ? 'dark' : 'light';
                window.Telegram.WebApp.setHeaderColor(colorScheme);
                window.Telegram.WebApp.setBackgroundColor(colorScheme);
            } catch (error) {
                console.warn('Could not update Telegram theme:', error);
            }
        }
        
        console.log('Theme applied:', theme);
        
        // Dispatch event for other components to listen to
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    updateToggleButton(theme) {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
            toggleBtn.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    // Method to force refresh theme on dynamic content
    refreshTheme() {
        this.applyTheme(this.currentTheme);
    }
    
    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager
let themeManager;

function initializeTheme() {
    themeManager = new ThemeManager();
    window.themeManager = themeManager;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
    initializeTheme();
}

// Export for global access
window.ThemeManager = ThemeManager;

// Legacy support for direct script inclusion
document.addEventListener('DOMContentLoaded', function() {
    // Ensure theme is applied even if class initialization fails
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
});
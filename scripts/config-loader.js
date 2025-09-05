// scripts/config-loader.js
(async function() {
    try {
        // Load configuration
        const response = await fetch('/config.json');
        if (response.ok) {
            const config = await response.json();
            window.APP_CONFIG = config;
            console.log('Configuration loaded successfully');
            
            // Initialize based on environment
            initializeEnvironment();
        } else {
            throw new Error('Config file not found');
        }
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback to development mode
        window.APP_CONFIG = {
            IS_DEVELOPMENT: true,
            TELEGRAM_BOT_TOKEN: '',
            TELEGRAM_BOT_TOKEN_2: '',
            SUPABASE_URL: 'https://hudrcdftoqcwxskhuahg.supabase.co',
            SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZHJjZGZ0b3Fjd3hza2h1YWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTMwNjcsImV4cCI6MjA3MTY2OTA2N30.YqGQBcFC2oVJILZyvVP7OgPlOOkuqO6eF1QaABb7MCo',
            MONETAG_ZONE_ID: '9803188'
        };
        initializeEnvironment();
    }
})();

function initializeEnvironment() {
    // Set up ads based on environment
    if (window.APP_CONFIG.IS_DEVELOPMENT) {
        console.log('Running in development mode');
        setupDevelopmentAds();
    } else {
        console.log('Running in production mode');
        setupProductionAds();
    }
}

function setupDevelopmentAds() {
    // Replace Monetag ads with dummy content during development
    const originalScriptLoad = document.createElement('script').src;
    Object.defineProperty(document.createElement('script'), 'src', {
        get: function() { return this._src; },
        set: function(value) {
            this._src = value;
            if (value.includes('libtl.com/sdk.js')) {
                console.log('Monetag ad blocked in development mode');
                // Don't load the actual script
                return;
            }
            // Load other scripts normally
            originalScriptLoad.call(this, value);
        }
    });
    
    // Add dummy ad content
    window.addEventListener('DOMContentLoaded', function() {
        const adContainer = document.getElementById('ad-container');
        if (adContainer) {
            adContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; background: #2d2d2d; border-radius: 8px;">
                    <h3>Development Ad Preview</h3>
                    <p>Real Monetag ad would appear here in production</p>
                    <p style="font-size: 12px; color: #a0a0a0;">Zone ID: ${window.APP_CONFIG.MONETAG_ZONE_ID}</p>
                </div>
            `;
        }
    });
}

function setupProductionAds() {
    // Load real Monetag ads only in production
    if (!window.APP_CONFIG.IS_DEVELOPMENT) {
        const script = document.createElement('script');
        script.src = '//libtl.com/sdk.js';
        script.setAttribute('data-zone', window.APP_CONFIG.MONETAG_ZONE_ID);
        script.setAttribute('data-sdk', 'show_' + window.APP_CONFIG.MONETAG_ZONE_ID);
        document.head.appendChild(script);
    }
}
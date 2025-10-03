// scripts/config-loader.js - UPDATED
(async function() {
    try {
        // Try to load production config first
        const response = await fetch('/config.production.json');
        if (response.ok) {
            const config = await response.json();
            window.AppConfig = {
                supabase: {
                    url: config.SUPABASE_URL,
                    anonKey: config.SUPABASE_ANON_KEY
                },
                telegram: {
                    botToken: config.TELEGRAM_BOT_TOKEN,
                    webAppUrl: "https://mcrdot.github.io/teleblog-lite/"
                },
                environment: config.IS_DEVELOPMENT ? "development" : "production"
            };
            console.log('✅ Production configuration loaded successfully');
        } else {
            throw new Error('Production config not found');
        }
    } catch (error) {
        console.error('❌ Failed to load production config:', error);
        // Fallback to direct configuration
        window.AppConfig = {
            supabase: {
                url: "https://hudrcdftoqcwxskhuahg.supabase.co",
                anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZHJjZGZ0b3Fjd3hza2h1YWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTMwNjcsImV4cCI6MjA3MTY2OTA2N30.YqGQBcFC2oVJILZyvVP7OgPlOOkuqO6eF1QaABb7MCo"
            },
            telegram: {
                botToken: "8032387671:AAF_v7iLV43XqqE4wtEw2JD6jgvm0CcjYPE",
                webAppUrl: "https://mcrdot.github.io/teleblog-lite/"
            },
            environment: "production"
        };
        console.log('⚠️ Using direct configuration fallback');
    }
    
    initializeEnvironment();
})();

function initializeEnvironment() {
    // Set up based on environment
    if (window.AppConfig.environment === "development") {
        console.log('🔧 Running in development mode');
    } else {
        console.log('🚀 Running in production mode');
    }
}
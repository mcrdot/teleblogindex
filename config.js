// config.js - Enhanced with Supabase configuration
const SUPABASE_CONFIG = {
    url: "https://hudrcdftoqcwxskhuahg.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZHJjZGZ0b3Fjd3hza2h1YWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTMwNjcsImV4cCI6MjA3MTY2OTA2N30.YqGQBcFC2oVJILZyvVP7OgPlOOkuqO6eF1QaABb7MCo"
};

// Environment detection
const IS_LOCAL = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';
const IS_PRODUCTION = !IS_LOCAL && typeof Telegram !== 'undefined' && Telegram.WebApp;

// Set the appropriate Telegram WebApp URL
const TELEGRAM_WEBAPP_URL = IS_PRODUCTION ? 
    'https://telegram.org/js/telegram-web-app.js' : 
    'telegram-web-app.js';

// Load the appropriate script
const telegramScript = document.createElement('script');
telegramScript.src = TELEGRAM_WEBAPP_URL;
document.head.appendChild(telegramScript);

// Make config available globally
window.AppConfig = {
    supabase: SUPABASE_CONFIG,
    isLocal: IS_LOCAL,
    isProduction: IS_PRODUCTION,
    telegramWebAppUrl: TELEGRAM_WEBAPP_URL,
    bot: {
        username: 'TeleBlogLiteBot', // Your bot username
        webAppUrl: 'https://mcrdot.github.io/teleblog-lite' // Your GitHub Pages URL
    }
};

console.log("AppConfig initialized:", {
    isLocal: IS_LOCAL,
    isProduction: IS_PRODUCTION,
    supabaseUrl: SUPABASE_CONFIG.url
});


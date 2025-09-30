// config.js - Enhanced with proper Supabase configuration
const SUPABASE_CONFIG = {
    url: "https://hudrcdftoqcwxskhuahg.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZHJjZGZ0b3Fjd3hza2h1YWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTMwNjcsImV4cCI6MjA3MTY2OTA2N30.YqGQBcFC2oVJILZyvVP7OgPlOOkuqO6eF1QaABb7MCo"
};

// Environment detection
const IS_LOCAL = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.protocol === 'file:';

const IS_PRODUCTION = !IS_LOCAL && typeof Telegram !== 'undefined' && Telegram.WebApp;

// Enhanced configuration with fallbacks
window.AppConfig = {
    supabase: SUPABASE_CONFIG,
    isLocal: IS_LOCAL,
    isProduction: IS_PRODUCTION,
    appVersion: '1.0.0',
    debug: IS_LOCAL
};

console.log("AppConfig initialized:", {
    isLocal: IS_LOCAL,
    isProduction: IS_PRODUCTION,
    supabaseUrl: SUPABASE_CONFIG.url ? 'Configured' : 'Missing',
    supabaseKey: SUPABASE_CONFIG.anonKey ? 'Configured' : 'Missing'
});

// Validate Supabase configuration
if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    console.error('❌ Supabase configuration is incomplete!');
} else {
    console.log('✅ Supabase configuration validated');
}
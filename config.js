// TeleBlog Lite Configuration
window.AppConfig = {
    version: '1.0.0',
    environment: 'production',
    
    // Supabase Configuration - YOUR EXACT CREDENTIALS
    supabase: {
        url: 'https://hudrcdftoqcwxskhuahg.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZHJjZGZ0b3Fjd3hza2h1YWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTMwNjcsImV4cCI6MjA3MTY2OTA2N30.YqGQBcFC2oVJILZyvVP7OgPlOOkuqO6eF1QaABb7MCo'
    },
    
    // Telegram Configuration - YOUR BOT DETAILS
    telegram: {
        botUsername: 'TeleBlogOfficialBot',
        botToken: '8032387671:AAF_v7iLV43XqqE4wtEw2JD6jgvm0CcjYPE'
    },
    
    // App Settings
    app: {
        name: 'TeleBlog Lite',
        postsPerPage: 10,
        maxPostLength: 4000,
        enableDebug: true
    },
    
    // Feature Flags
    features: {
        enableUserRegistration: true,
        enablePostCreation: true,
        enableComments: false,
        enableNotifications: true,
        enableAds: false // Set to true when ready for Monetag
    },
    
    // URLs
    urls: {
        worker: 'https://teleblog-lite-bot.macrotiser-pk.workers.dev/',
        github: 'https://github.com/mcrdot/teleblog-lite',
        liveApp: 'https://mcrdot.github.io/teleblog-lite/'
    }
};

console.log('TeleBlog Lite Config Loaded - Production Ready');
// config.js - Updated for production (fallback)
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

console.log('✅ Direct configuration loaded as fallback');
// deploy-bot.js - Simple webhook setup
const BOT_TOKEN = '8383872604:AAFpex_Sxol0m_v1IUa5yIW6oKyeppon0C0';

async function setWebhook() {
    // Replace with your actual worker URL after deployment
    // https://teleblog-lite-bot.macrotiser-pk.workers.dev/
    const WEBHOOK_URL = 'https://teleblog-lite-bot.macrotiser-pk.workers.dev/webhook';
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        console.log('Webhook setup result:', result);
        return result;
    } catch (error) {
        console.error('Error setting webhook:', error);
        return { error: error.message };
    }
}

// Run if in Node.js environment
if (typeof window === 'undefined') {
    setWebhook();
} else {
    // For browser testing
    window.setTelegramWebhook = setWebhook;
    console.log('Run setTelegramWebhook() to setup webhook');
}
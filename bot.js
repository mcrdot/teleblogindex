// bot.js - Telegram Bot Webhook Handler
const TELEGRAM_BOT_TOKEN = window.AppConfig?.bot?.token || '8032387671:AAFqCA2lH9d_o_3I0kSXwhYkR7K4Y8kXKcE';
const WEB_APP_URL = window.AppConfig?.bot?.webAppUrl || 'https://mcrdot.github.io/teleblog-lite';

async function handleBotUpdate(update) {
    if (!update.message) return;
    
    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    
    console.log("Bot received message:", text); // Debug log
    
    // Handle commands
    if (text.startsWith('/start')) {
        await sendStartMessage(chatId);
    } else if (text.startsWith('/help')) {
        await sendHelpMessage(chatId);
    } else if (text.startsWith('/menu')) {
        await sendMainMenu(chatId);
    } else if (text.startsWith('/posts')) {
        await sendLatestPosts(chatId);
    } else {
        await sendUnknownCommand(chatId);
    }
}

async function sendStartMessage(chatId) {
    const message = `📝 Welcome to TeleBlog Lite!\n\n` +
                   `A lightweight blogging platform right inside Telegram. ` +
                   `Read articles, follow writers, and start your own blog!\n\n` +
                   `Tap the button below to get started:`;
    
    const keyboard = {
        inline_keyboard: [[
            {
                text: "🚀 Open TeleBlog Lite",
                web_app: { url: WEB_APP_URL }
            }
        ]]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
}

async function sendHelpMessage(chatId) {
    const message = `🤖 TeleBlog Lite Bot Help\n\n` +
                   `Available commands:\n` +
                   `/start - Launch the TeleBlog Lite app\n` +
                   `/menu - Show main options\n` +
                   `/posts - Browse latest articles\n` +
                   `/help - Show this help message\n\n` +
                   `Need more assistance? Contact support.`;
    
    await sendTelegramMessage(chatId, message);
}

async function sendMainMenu(chatId) {
    const message = `📱 TeleBlog Lite Main Menu\n\n` +
                   `What would you like to do?`;
    
    const keyboard = {
        inline_keyboard: [
            [{
                text: "📖 Read Articles",
                web_app: { url: `${WEB_APP_URL}?ref=bot_menu` }
            }],
            [{
                text: "✍️ Start Writing",
                web_app: { url: `${WEB_APP_URL}?ref=bot_write` }
            }],
            [{
                text: "⭐ Featured Content",
                web_app: { url: `${WEB_APP_URL}?ref=bot_featured` }
            }]
        ]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
}

async function sendLatestPosts(chatId) {
    // This would fetch from your Supabase database
    const message = `📚 Latest Articles on TeleBlog Lite\n\n` +
                   `1. "Getting Started with Blogging" by TeleBlog Team\n` +
                   `2. "Monetization Strategies" by Expert Writer\n` +
                   `3. "Audience Building" by Growth Guru\n\n` +
                   `Open the app to read these articles:`;
    
    const keyboard = {
        inline_keyboard: [[
            {
                text: "📖 Read Latest Posts",
                web_app: { url: `${WEB_APP_URL}?ref=bot_posts` }
            }
        ]]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
}

async function sendUnknownCommand(chatId) {
    const message = `❓ Unknown command\n\n` +
                   `I didn't recognize that command. Here's what I can do:\n\n` +
                   `/start - Launch TeleBlog Lite\n` +
                   `/menu - Show main options\n` +
                   `/help - Get assistance\n\n` +
                   `Try one of these commands or open the app directly:`;
    
    const keyboard = {
        inline_keyboard: [[
            {
                text: "📱 Open App",
                web_app: { url: WEB_APP_URL }
            }
        ]]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
}

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log("Message sent result:", result); // Debug log
        return result;
    } catch (error) {
        console.error('Error sending message:', error);
        return null;
    }
}

// Test function to verify bot connection
async function testBotConnection() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const result = await response.json();
        console.log("Bot connection test:", result);
        return result;
    } catch (error) {
        console.error("Bot connection test failed:", error);
        return null;
    }
}

// Make functions available for Cloudflare Worker
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleBotUpdate, testBotConnection };
} else {
    window.TelegramBot = { 
        handleBotUpdate, 
        sendTelegramMessage,
        testBotConnection,
        TELEGRAM_BOT_TOKEN,
        WEB_APP_URL
    };
}

// Auto-test if in browser
if (typeof window !== 'undefined') {
    setTimeout(() => {
        console.log("Testing bot connection...");
        testBotConnection().then(result => {
            if (result && result.ok) {
                console.log("✅ Bot is connected:", result.result.username);
            } else {
                console.log("❌ Bot connection failed");
            }
        });
    }, 1000);
}
// worker/worker.js - Cloudflare Worker for Telegram Bot
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const update = await request.json();
        
        // Simple command handling
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          
          let responseText = '';
          
          if (text.startsWith('/start')) {
            responseText = `📝 Welcome to TeleBlog Lite!\n\nA lightweight blogging platform inside Telegram.\n\nOpen the app: https://your-username.github.io/teleblog-lite`;
          } else if (text.startsWith('/help')) {
            responseText = `🤖 Help:\n/start - Launch app\n/menu - Show options\n/posts - Browse articles\n/help - This message`;
          } else if (text.startsWith('/menu')) {
            responseText = `📱 Main Menu:\n\n• Read articles\n• Start writing\n• Featured content\n\nOpen app for full features.`;
          } else if (text.startsWith('/posts')) {
            responseText = `📚 Latest Posts:\n\n1. Getting Started Guide\n2. Monetization Tips\n3. Audience Building\n\nOpen app to read.`;
          } else {
            responseText = `❓ Unknown command. Try /help for options.`;
          }
          
          // Send response back to Telegram
          await fetch(`https://api.telegram.org/bot8032387671:AAFqCA2lH9d_o_3I0kSXwhYkR7K4Y8kXKcE/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: responseText
            })
          });
        }
        
        return new Response('OK');
      } catch (error) {
        return new Response('Error', { status: 500 });
      }
    }
    
    return new Response('TeleBlog Lite Bot Worker');
  }
}
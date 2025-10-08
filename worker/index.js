// TeleBlog Authentication Worker
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const url = new URL(request.url);
    
    // Auth endpoint
    if (url.pathname === '/auth' && request.method === 'POST') {
      return handleAuth(request, env);
    }
    
    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

async function handleAuth(request, env) {
  try {
    const { initData } = await request.json();
    
    if (!initData) {
      return jsonResponse({ error: 'No initData provided' }, 400);
    }

    // Validate Telegram initData
    const isValid = await validateTelegramInitData(initData, env.BOT_TOKEN);
    if (!isValid) {
      return jsonResponse({ error: 'Invalid Telegram authentication' }, 401);
    }

    // Parse user data from initData
    const userData = parseInitData(initData);
    if (!userData?.id) {
      return jsonResponse({ error: 'No user data found' }, 400);
    }

    // Check if user exists in database
    const existingUser = await getUserFromDatabase(userData.id, env);
    
    let user;
    if (existingUser) {
      // Update existing user
      user = await updateUserInDatabase(existingUser.id, userData, env);
    } else {
      // Create new user
      user = await createUserInDatabase(userData, env);
    }

    // Create JWT token
    const token = await createJWTToken(user, env.JWT_SECRET);

    return jsonResponse({
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        avatar_url: userData.photo_url
      },
      token
    });

  } catch (error) {
    console.error('Auth error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// Validate Telegram WebApp initData
async function validateTelegramInitData(initData, botToken) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return false;

    // Remove hash and sort remaining parameters
    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key from bot token
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the data
    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(botToken)
    );

    const secret = new Uint8Array(signature);
    const key = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const dataSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(dataCheckString)
    );

    // Compare hashes
    const expectedHash = Array.from(new Uint8Array(dataSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hash === expectedHash;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

// Parse initData and extract user information
function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  
  if (!userStr) return null;
  
  try {
    return JSON.parse(decodeURIComponent(userStr));
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

// Database operations
async function getUserFromDatabase(telegramId, env) {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegramId}`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Database query failed');
    
    const users = await response.json();
    return users[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function createUserInDatabase(userData, env) {
  const user = {
    telegram_id: userData.id.toString(),
    username: userData.username || null,
    first_name: userData.first_name || null,
    last_name: userData.last_name || null,
    display_name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.username || 'Telegram User',
    role: 'reader',
    profile_completed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(user)
    });

    if (!response.ok) throw new Error('User creation failed');
    
    const users = await response.json();
    return users[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function updateUserInDatabase(userId, userData, env) {
  const updates = {
    username: userData.username || null,
    first_name: userData.first_name || null,
    last_name: userData.last_name || null,
    display_name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.username || 'Telegram User',
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('User update failed');
    
    const users = await response.json();
    return users[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// JWT Token creation
async function createJWTToken(user, jwtSecret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: user.id,
    telegram_id: user.telegram_id,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const encoder = new TextEncoder();
  
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Helper function for JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read user data from JSON file
    const dataPath = path.join(process.cwd(), 'data', 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Find user
    const user = data.users.find(
      (u: any) => u.username === username && u.password === password
    );

    if (user) {
      // In a real application, you would:
      // 1. Hash the password and compare hashes
      // 2. Generate a JWT token
      // 3. Set secure cookies
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Login API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

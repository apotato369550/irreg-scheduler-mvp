import type { APIRoute } from "astro";

// Mark this endpoint as server-rendered
export const prerender = false;

// Embedded user data to avoid file system issues
const users = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    email: "admin@example.com",
  },
  {
    id: 2,
    username: "user",
    password: "user123",
    email: "user@example.com",
  },
];

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log("Login attempt for username:", username);

    // Validate input
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find user
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      console.log("Login successful for user:", username);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      console.log("Login failed for user:", username);
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Login API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

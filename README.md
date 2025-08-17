# Irreg Scheduler MVP

A scheduling application built with Astro and React components.

## Features

- **Login System**: Secure authentication with JSON-based user storage
- **Modern UI**: Beautiful, responsive design with gradient backgrounds
- **API Integration**: RESTful API endpoints for user authentication

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:4321`

## Login System

The application includes a complete login system with the following features:

### Demo Credentials

- **Admin User**: username: `admin`, password: `admin123`
- **Regular User**: username: `user`, password: `user123`

### How to Use

1. Navigate to `/login` or click the "Go to Login Page" button on the homepage
2. Enter your credentials
3. The system will validate against the stored user data in `data/data.json`

### File Structure

```
├── data/
│   └── data.json          # User credentials storage
├── src/
│   ├── components/
│   │   ├── Login.jsx      # React login component
│   │   └── Login.module.css # Login component styles
│   ├── pages/
│   │   ├── api/
│   │   │   └── login.ts   # Login API endpoint
│   │   ├── index.astro    # Homepage
│   │   └── login.astro    # Login page
│   └── layouts/
│       └── Layout.astro   # Main layout component
```

## API Endpoints

### POST /api/login

Authenticates a user with username and password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

## Development

### Adding New Users

To add new users, edit the `data/data.json` file:

```json
{
  "users": [
    {
      "id": 3,
      "username": "newuser",
      "password": "newpass123",
      "email": "newuser@example.com"
    }
  ]
}
```

### Security Notes

⚠️ **Important**: This is a development/demo setup. In production:

1. **Never store plain-text passwords** - use bcrypt or similar hashing
2. **Implement proper session management** - use JWT tokens or secure cookies
3. **Use HTTPS** for all authentication requests
4. **Implement rate limiting** to prevent brute force attacks
5. **Use a proper database** instead of JSON files

## Future Enhancements

- [ ] Database integration (PostgreSQL, MongoDB, etc.)
- [ ] Password hashing with bcrypt
- [ ] JWT token authentication
- [ ] User registration system
- [ ] Password reset functionality
- [ ] Role-based access control

## Technologies Used

- **Astro**: Static site generator and framework
- **React**: Interactive UI components
- **TypeScript**: Type-safe API development
- **CSS Modules**: Scoped styling for components

## License

This project is open source and available under the [MIT License](LICENSE).


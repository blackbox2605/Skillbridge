# SkillBridge

SkillBridge is a full-stack web application built with the MERN stack (MongoDB, Express.js, React.js, Node.js) and styled with Tailwind CSS. It serves as a platform for students and instructors to share different kinds of skills.

## Features

- User authentication (JWT)
- User roles (Student and Instructor)
- Responsive design with Tailwind CSS
- Dashboard for users to track their progress

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing

### Frontend
- React.js
- React Router for navigation
- Axios for API requests
- Tailwind CSS for styling
- React Icons

## Project Structure

```
SkillBridge/
├── client/               # Frontend React application
│   ├── public/           # Static files
│   ├── src/              # React source files
│   │   ├── assets/       # Images, fonts, etc.
│   │   ├── components/   # Reusable components
│   │   ├── context/      # Context API for state management
│   │   ├── pages/        # Page components
│   │   └── utils/        # Utility functions
│   ├── index.html        # HTML template
│   └── package.json      # Frontend dependencies
│
├── server/               # Backend Node.js/Express application
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── .env              # Environment variables
│   ├── index.js          # Server entry point
│   └── package.json      # Backend dependencies
│
└── README.md             # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/skillbridge.git
   cd skillbridge
   ```

2. Install backend dependencies
   ```bash
   cd server
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../client
   npm install
   ```

4. Create a `.env` file in the server directory and add your environment variables
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/skillbridge
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=30d
   ```

### Running the Application

1. Start the backend server
   ```bash
   cd server
   npm run dev
   ```

2. Start the frontend client
   ```bash
   cd ../client
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

 ### 🌐 Live Website

The application is live and running at:

👉 **[https://skillbridge-frontend-two.vercel.app/](https://skillbridge-frontend-two.vercel.app/)**

---

## License

This project is licensed under the MIT License.

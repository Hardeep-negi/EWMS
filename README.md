# Employee Wellbeing Monitoring System

MERN stack foundation for a department-based Employee Wellbeing Monitoring System.

## User-side features

- Separate Employee and HR portals with role-aware JWT authentication
- Development, Marketing, and Sales department selection verified by the backend at login
- HR registrations can sign in directly to their assigned department portal
- Personal wellbeing dashboard with current score, risk level, and recent check-ins
- Daily/weekly mood, stress, workload, overtime, and leave check-in form
- Trend view for personal wellbeing history
- Anonymous concern channel
- Profile and notification preferences
- Express API with MongoDB models for users, check-ins, concerns, and scoring

## Setup

```bash
pnpm install
pnpm dev
```

Create `server/.env` before connecting MongoDB:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/employee_wellbeing
JWT_SECRET=replace-this-with-a-long-secret
CLIENT_URL=http://localhost:5173
```

The React app runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

The frontend now uses the backend as the source of truth. Sign up, login, check-ins, and concerns will not be saved locally; they require the Express server and MongoDB connection.

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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-project-sender@gmail.com
SMTP_PASS=your-16-character-google-app-password
EMAIL_FROM=Employee Wellbeing Monitoring System <your-project-sender@gmail.com>
```

For email verification, edit **`server/.env`** (never the frontend environment file) and enter the Gmail address created for this project as `SMTP_USER`, its Google App Password as `SMTP_PASS`, and the same sender in `EMAIL_FROM`. Gmail uses `smtp.gmail.com` and port `465` with implicit TLS. Keep the real values private: `server/.env` is ignored by Git, while [server/.env.example](server/.env.example) contains only safe placeholders.

`MONGO_URI` connects the API to MongoDB, `JWT_SECRET` signs login tokens, `CLIENT_URL` is the address permitted by CORS, and the SMTP values send employee and Super Admin verification codes. The client must never receive `SMTP_PASS`, `JWT_SECRET`, or `MONGO_URI`.

### Account workflows

- New employees receive a six-digit email code that expires after five minutes. They must verify it before login. Use **Resend code** only after the 60-second cooldown.
- New HR registrations are pending until the verified Super Admin for the same department approves them.
- One verified Super Admin can exist for each of Development, Marketing, and Sales. Register each from the **Super Admin** button on the home page, verify its email code, then use it to review the department's HR registrations.
- Existing accounts remain compatible: records created before OTP support are treated as already verified, and existing HR records retain their approved status. Review legacy records before production if those assumptions do not match your organization.

The React app runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

The frontend now uses the backend as the source of truth. Sign up, login, check-ins, and concerns will not be saved locally; they require the Express server and MongoDB connection.

## Production and Render deployment

Deploy this repository as two Render services from the same branch:

1. Create a **Web Service** for the API with root directory `server`, build command `npm install`, and start command `npm start`.
2. Set these API environment variables in Render:

   ```env
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=a-long-random-production-secret
   CLIENT_URL=https://your-frontend-name.onrender.com
   NODE_ENV=production
   ```

3. Create a **Static Site** for the frontend with root directory `client`, build command `npm install && npm run build`, and publish directory `dist`.
4. Set the frontend environment variable before deploying it:

   ```env
   VITE_API_URL=https://your-backend-name.onrender.com/api
   ```

`CLIENT_URL` must be the deployed frontend URL, while `VITE_API_URL` must be the deployed backend API URL. Do not commit `.env` files or real secrets.

## Verification

Run `pnpm test` for deterministic server checks covering score bounds/versioning, shift-clock calculations, evening reminder timing, and reminder snoozing. Run `pnpm build` to create the production frontend bundle.

## Wellness reminders

- Optional in-app wellness reminders are shift-aware, configurable in the employee profile, and never contribute to wellbeing scores or performance data.
- HR and employee accounts can be created directly from their respective portals. Keep access to the HR portal limited to the people you authorize.

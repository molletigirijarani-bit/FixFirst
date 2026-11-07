# FixFirst — Repair Before Replace

FixFirst is a full-stack social-impact platform designed to encourage people to repair household items, appliances, and electronics instead of immediately replacing them. It connects customers with skilled local repair professionals, provides a real-time repair-versus-replacement cost comparison calculator, and features three role-based dashboards with end-to-end authorization.

---

## 🚀 Key Features

### 👤 Customer Workflow
- **FixFirst Landing & Sustainability Branding**: Modern nature-inspired hero section, impact metrics, and sustainability mission.
- **Repair vs. Replacement Cost Calculator**: Real-time savings and percentage calculation with zero-division protection and input validation.
- **Find a Repairer Directory**: Search and filter repair professionals by service category and geographic area. Sample demonstration listings are clearly labelled.
- **Submit Repair Requests**: Authenticated request submission with item name, issue description, locality, and contact details.
- **Track My Repairs**: Real-time tracking of submitted requests, status badges (`Pending`, `In Progress`, `Completed`), assigned repairer details, and safe deletion for eligible unassigned pending requests.
- **Verified Customer Reviews**: Customers can submit verified reviews with ratings (1–5) and comments only for completed repairs they own. Reviewer name is securely derived from the customer's account.

### 🛠️ Repairer Workflow
- **Role-based Authentication**: Safe public registration as a repairer (public admin creation is strictly disallowed).
- **Repairer Dashboard**:
  - Live database-backed overview statistics: Available Unclaimed, Total Assigned, In Progress, Completed.
  - **Available Requests Tab**: Real-time list of unclaimed customer requests with customer contact information shielded for privacy.
  - **Atomic Claiming**: Concurrency-safe request acceptance via MongoDB atomic query (`findOneAndUpdate`) preventing double-claiming.
  - **My Assigned Work Tab**: Filter by status and update progress from `In Progress` to `Completed`.
  - Strict authorization: Repairers cannot edit other repairers' jobs, revert completed work, or delete customer requests.

### 🛡️ Administrator Workflow
- **Secure Provisioning**: Admin accounts cannot be registered publicly; created via dedicated CLI seed script (`scripts/createAdmin.js`) requiring explicit credentials and safety confirmation (`--promote`) for existing accounts.
- **System Overview & Metrics**: Real-time aggregation of total registered customers, repairers, requests, and status breakdown.
- **Global Request Management**: Search and filter all requests across the platform, update statuses, or remove invalid/spam requests.
- **User Account Management**: View all registered users with role badges, search by name/email, and filter by role (`customer`, `repairer`, `admin`) without exposing password hashes.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (v19), React Router (v7), Vite (v8), Vanilla CSS3 with responsive typography and nature-inspired palette.
- **Backend**: Node.js, Express.js (v5), RESTful Architecture.
- **Database**: MongoDB (local Community Server by default; Atlas supported by changing the connection URI) with Mongoose (v9) schema models and atomic transitions.
- **Authentication & Security**: JSON Web Tokens (JWT), bcryptjs password hashing (10 salt rounds), custom role authorization middleware, mass-assignment guards, contact info privacy shields, and CORS configuration.

---

## 📂 Project Structure

```text
fixfirst/
├── frontend/                   # React Frontend
│   ├── public/                 # Static assets and icons
│   ├── src/
│   │   ├── admin/
│   │   │   └── AdminDashboard.jsx    # Admin metrics, user list, request management
│   │   ├── customer/
│   │   │   └── CustomerDashboard.jsx # Landing page, calculator, request form, tracking
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Role-based dashboard router
│   │   │   ├── Login.jsx             # JWT Login screen
│   │   │   └── Register.jsx          # Customer/Repairer registration
│   │   ├── repairer/
│   │   │   └── RepairerDashboard.jsx # Claim requests, progress update, live stats
│   │   ├── services/
│   │   │   └── api.js                # Centralized API fetch wrapper with token injection
│   │   ├── App.css                   # Global styling, responsive design
│   │   ├── App.jsx                   # Route definition & role guards
│   │   └── main.jsx                  # React entry point
│   ├── .env.example
│   ├── package.json
│   ├── vercel.json             # SPA routing rewrite for Vercel
│   └── vite.config.js
├── backend/                    # Node.js / Express Backend
│   ├── config/
│   │   └── db.js               # MongoDB connection logic
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification & role authorization (protect, authorize)
│   │   └── adminMiddleware.js  # Admin-only gatekeeper
│   ├── models/
│   │   ├── RepairRequest.js    # Mongoose schema for repair items with customer/repairer refs
│   │   ├── Review.js           # Mongoose schema for customer reviews with unique index
│   │   └── User.js             # Mongoose schema for users with role enum
│   ├── routes/
│   │   ├── authRoutes.js       # Register, login, session /me, and admin user listing
│   │   ├── providerRoutes.js   # Repairer listings & directory
│   │   ├── repairRoutes.js     # CRUD, atomic claim, status update, stats
│   │   └── reviewRoutes.js     # Reviews & ratings
│   ├── scripts/
│   │   └── createAdmin.js      # CLI tool to provision administrator safely
│   ├── tests/
│   │   └── api.test.js         # Isolated test suite with live-database safety guard
│   ├── .env.example
│   ├── package.json
│   └── server.js               # Express entry point
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and keep your own secret values private:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/fixfirst
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Optional: use a separate database only when running the workflow tests
# TEST_MONGO_URI=mongodb://127.0.0.1:27017/fixfirst_test
```
Make sure MongoDB Community Server is running before starting the backend.

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🏃 Local Setup & Development

### 1. Backend Setup
Open a terminal in the project root:
```bash
cd backend
npm install
# Copy .env.example to .env and configure MongoDB + JWT_SECRET
npm run dev
```
The backend health check is available at `http://localhost:5000/`.

### 2. Frontend Setup
Open a second terminal in the project root:
```bash
cd frontend
npm install
npm run dev
```
You can also use `npm start` to launch Vite. The frontend runs at `http://localhost:5173`.

---

## 🔑 Provisioning an Administrator Account

Public registration (`/register`) is strictly restricted to **Customer** and **Repairer** roles.

To create an administrator account, use the CLI utility from the `backend` directory:
```bash
cd backend
node scripts/createAdmin.js "<Full Name>" "<Email>" "<Password>"
```

Example:
```bash
node scripts/createAdmin.js "System Administrator" admin@fixfirst.local "YourSecretPassword123!"
```

To prevent accidental modification or privilege escalation, promoting an existing customer or repairer account requires the explicit `--promote` flag:
```bash
node scripts/createAdmin.js "Jane Admin" jane@example.com "NewAdminPassword123!" --promote
```

---

## 🧪 Automated Testing

A dedicated test suite is located in `backend/tests/api.test.js`.

### Safety Guard
To protect production and application records from accidental modification or deletion, the test runner activates a safety guard and will **never** execute destructive integration tests against the primary `MONGO_URI`.

To run the test suite, provide a dedicated test database in `TEST_MONGO_URI`:
```bash
# In backend/.env:
TEST_MONGO_URI=mongodb://127.0.0.1:27017/fixfirst_test

cd backend
npm test
```

When configured, the suite runs full end-to-end checks (customer registration, login, repair creation, privacy shields on unclaimed requests, atomic claims, concurrency collision prevention, status transitions, review ownership, and teardown cleanup).

---

## 🌐 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer or repairer |
| `POST` | `/api/auth/login` | Public | Login and receive JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/api/auth/users` | Admin Only | List registered users with role breakdown |

### Repair Requests (`/api/repairs`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/repairs` | Customer | Create a repair request (`status: Pending`) |
| `GET` | `/api/repairs/my-repairs`| Customer | Get logged-in customer's own requests |
| `GET` | `/api/repairs/available` | Repairer / Admin | Get unclaimed requests (shields phone and email) |
| `GET` | `/api/repairs/assigned` | Repairer / Admin | Get repairer's assigned requests with contact details |
| `POST` | `/api/repairs/:id/claim`| Repairer | Atomically claim an unassigned request (`Pending` -> `In Progress`) |
| `PUT` | `/api/repairs/:id/status`| Repairer / Admin | Update status (`In Progress` -> `Completed`, prevents illegal reverts) |
| `DELETE`| `/api/repairs/:id` | Customer / Admin | Delete request (customer: own & pending only) |
| `GET` | `/api/repairs/stats` | Authenticated | Real-time role-specific dashboard metrics |
| `GET` | `/api/repairs` | Authenticated | Role-filtered request list (admin: all, repairer: available/assigned, customer: own) |

### Providers & Reviews (`/api/providers`, `/api/reviews`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/providers` | Public | Directory search and category filter (clearly distinguishes demo vs real members) |
| `GET` | `/api/reviews` | Public | Verified reviews for completed repairs and providers |
| `POST` | `/api/reviews` | Customer | Submit review for completed repair (strictly validates ownership and prevents duplicates) |

---

## 🚢 Deployment Guidelines

### Frontend (Vercel)
1. Set Root Directory to `frontend`.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variable: `VITE_API_URL=https://your-backend-domain.com/api`.
6. SPA routing rewrite is configured via `frontend/vercel.json`.

### Backend (Render / Railway / DigitalOcean / Heroku)
1. Set Root Directory to `server`.
2. Build Command: `npm install`.
3. Start Command: `npm start`.
4. Add Environment Variables:
   - `PORT=5000`
   - `MONGO_URI=mongodb+srv://...`
   - `JWT_SECRET=your_production_secret`
   - `CLIENT_URL=https://your-frontend-domain.vercel.app`

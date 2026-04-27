# BookFlow – Ticket Booking App

A full-stack ticket booking app where you can book **movies**, **hotels**, and **travel** (flights, trains, buses) in one place, with login and payment receipt generation.

## Features

- **Login & Register** – Create an account or sign in to book and view receipts.
- **Movies** – Browse movies, pick a showtime, choose number of tickets, confirm and pay.
- **Hotels** – Choose a hotel, set number of nights, confirm and pay.
- **Travel** – Book flights, trains, or buses; confirm and pay.
- **My Bookings** – List of all your bookings with links to receipts.
- **Receipt** – After each booking you get a receipt with Booking ID, Payment ID, and details. Use **Print / Save PDF** to print or save as PDF.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, CSS Modules
- **Backend:** Node.js, Express, JWT auth, in-memory store (replace with a DB in production)

## Quick Start

### 1. Install dependencies

```bash
# Backend
cd "E:\web project\backend"
npm install

# Frontend
cd "E:\web project\frontend"
npm install
```

### 2. Run the app

**Terminal 1 – backend (port 3001):**
```bash
cd "E:\web project\backend"
npm run dev
```

**Terminal 2 – frontend (port 5173):**
```bash
cd "E:\web project\frontend"
npm run dev
```

Open **http://localhost:5173** in your browser.

### 3. Demo login

- **Email:** `demo@bookflow.com`  
- **Password:** `demo123`  

Or register a new account from the login page.

## Project Structure

```
web project/
├── backend/
│   ├── server.js       # Express API: auth, catalog, bookings, receipt
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Layout, nav
│   │   ├── context/     # AuthContext
│   │   ├── pages/      # Login, Register, Home, Movies, Hotels, Travel, MyBookings, Receipt
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
└── README.md
```

## Receipt & PDF

After completing a booking you are redirected to the receipt page. Click **Print / Save PDF** to open the browser print dialog; choose "Save as PDF" (or your system's equivalent) to download a PDF receipt.

## Notes

- Data is stored in memory; restarting the backend clears users (except the demo user in code) and bookings.
- For production, add a real database and replace `JWT_SECRET` with a secure secret.

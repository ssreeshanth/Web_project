# 🎟️ BookFlow – Ticket Booking Platform

---

## 📖 Overview

**BookFlow** is a full-stack ticket booking application that allows users to book **movies**, **hotels**, and **travel services** (flights, trains, buses) from a single interface.

It includes secure authentication, booking management, and receipt generation with printable PDF support.

---

## ✨ Features

### 🔐 Authentication

* User registration and login
* JWT-based authentication
* Persistent session handling

### 🎬 Movies Booking

* Browse available movies
* Select showtime and ticket count
* Confirm booking with receipt generation

### 🏨 Hotel Booking

* Choose hotels and number of nights
* Instant booking confirmation

### ✈️ Travel Booking

* Book flights, trains, and buses
* Unified booking workflow

### 📄 Booking Management

* View all bookings in **My Bookings**
* Access detailed receipts anytime

### 🧾 Receipt System

* Auto-generated receipt with:

  * Booking ID
  * Payment ID
  * Booking details
* Export as **PDF via browser print**

---

## 🛠️ Tech Stack

| Layer    | Technology                   |
| -------- | ---------------------------- |
| Frontend | React 18, Vite, React Router |
| Styling  | CSS Modules                  |
| Backend  | Node.js, Express             |
| Auth     | JWT                          |
| Storage  | In-memory (for development)  |

---

## 📁 Project Structure

```bash
web-project/
│
├── backend/
│   ├── server.js            # Express API (auth, bookings, catalog)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # App pages
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## ⚙️ Getting Started

### 🔹 Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### ▶️ Run the Application

**Backend (Port 3001)**

```bash
cd backend
npm run dev
```

**Frontend (Port 5173)**

```bash
cd frontend
npm run dev
```

---

### 🌐 Access the App

```
http://localhost:5173
```

---

## 🔑 Demo Credentials

* **Email:** [demo@bookflow.com](mailto:demo@bookflow.com)
* **Password:** demo123

Or create a new account from the registration page.

---

## 🧾 Receipt & PDF Export

After completing a booking:

1. You’ll be redirected to the receipt page
2. Click **Print / Save PDF**
3. Choose **Save as PDF** to download

---

## ⚠️ Notes

* Data is stored **in-memory** → resets on server restart
* Replace with a database (MongoDB/MySQL) for production
* Update `JWT_SECRET` before deploying

---

## 🚀 Future Improvements

* 💾 Database integration (MongoDB / PostgreSQL)
* 💳 Payment gateway integration
* 🔔 Email/SMS notifications
* 📱 Mobile responsive UI enhancements
* ☁️ Cloud deployment

---

## 🤝 Contributing

Contributions are welcome.
Feel free to fork the repository and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

🔗 https://github.com/ssreeshanth

---

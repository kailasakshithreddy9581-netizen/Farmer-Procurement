# 📁 Project Structure & Files Guide

## Complete File Structure

```
farmer-procurement/
│
├── 📄 README.md                    # Main project description
├── 📄 QUICK_START.md              # 5-minute setup guide ⭐ START HERE
├── 📄 DEPLOYMENT_GUIDE.md         # Deploy to production
├── 📄 PROJECT_STRUCTURE.md        # This file
├── 📄 setup.sh                    # Auto setup script
│
├── server/                         # Backend (Express + MongoDB)
│   ├── 📄 server.js              # Main Express server with all APIs
│   ├── 📄 package.json           # Backend dependencies
│   ├── 📄 .env.example           # Environment template
│   └── 📄 .env                   # Create this locally
│
└── client/                         # Frontend (React)
    ├── public/
    │   └── 📄 index.html         # HTML template
    ├── src/
    │   ├── 📄 App.jsx            # Main app component
    │   ├── 📄 App.css            # Main styling
    │   ├── 📄 index.js           # Entry point
    │   ├── components/
    │   │   ├── 📄 FarmerRegistration.jsx
    │   │   ├── 📄 SlotBooking.jsx
    │   │   ├── 📄 QueueDashboard.jsx
    │   │   ├── 📄 PaymentStatus.jsx
    │   │   └── 📄 AdminPanel.jsx
    │   └── styles/
    │       ├── 📄 Registration.css
    │       ├── 📄 SlotBooking.css
    │       ├── 📄 QueueDashboard.css
    │       ├── 📄 PaymentStatus.css
    │       └── 📄 AdminPanel.css
    ├── 📄 package.json           # Frontend dependencies
    ├── 📄 .env.example           # Environment template
    └── 📄 .env                   # Create this locally
```

## 📋 What Each File Does

### Root Level
| File | Purpose |
|------|---------|
| `README.md` | Project overview & features |
| `QUICK_START.md` | ⭐ START HERE - 5 min setup |
| `DEPLOYMENT_GUIDE.md` | Production deployment steps |
| `setup.sh` | Auto-setup script |

### Backend (`server/`)
| File | Purpose |
|------|---------|
| `server.js` | All APIs, database models, Socket.io |
| `package.json` | Express, mongoose, socket.io dependencies |
| `.env.example` | Template for environment variables |

### Frontend (`client/`)
| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app, navigation, routing |
| `src/App.css` | Global styles, navbar, dashboard |
| `src/index.js` | React entry point |
| `public/index.html` | HTML template |

### Components (`client/src/components/`)
| Component | Purpose |
|-----------|---------|
| `FarmerRegistration.jsx` | Registration form |
| `SlotBooking.jsx` | Calendar slot selection |
| `QueueDashboard.jsx` | Real-time queue status |
| `PaymentStatus.jsx` | Payment tracking |
| `AdminPanel.jsx` | Slot management |

### Styles (`client/src/styles/`)
| File | Purpose |
|------|---------|
| `Registration.css` | Registration form styling |
| `SlotBooking.css` | Slot cards & calendar |
| `QueueDashboard.css` | Queue list styling |
| `PaymentStatus.css` | Payment card styling |
| `AdminPanel.css` | Admin panel styling |

---

## 🚀 How to Use These Files

### 1️⃣ First Time Setup (Follow in Order)

1. Read: `QUICK_START.md` ⭐
2. Run: `setup.sh` (or manual npm install)
3. Create: `.env` files in `server/` and `client/`
4. Test: Run locally
5. Read: `README.md` for features

### 2️⃣ For Deployment

1. Read: `DEPLOYMENT_GUIDE.md`
2. Push to GitHub
3. Deploy backend to Railway/Render
4. Deploy frontend to Vercel
5. Update `.env` with live URLs

### 3️⃣ For Development

- Edit components in `client/src/components/`
- Edit styles in `client/src/styles/`
- Edit backend in `server/server.js`
- Restart servers to see changes

---

## 📦 What's Pre-Built

✅ **Complete Backend**
- Farmer registration API
- Slot management
- Booking system
- Queue management
- Payment processing
- Real-time updates (Socket.io)
- MongoDB integration

✅ **Complete Frontend**
- Registration form
- Slot booking UI
- Queue dashboard
- Payment tracking
- Admin panel
- Responsive design
- Framer Motion animations

✅ **Database**
- Farmer schema
- Slot schema
- Booking schema
- Payment schema

✅ **Production Ready**
- Error handling
- Input validation
- CORS enabled
- Environment variables
- Deployment guides

---

## 🔧 Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io (real-time)
- Twilio (SMS)

### Frontend
- React 18
- Framer Motion
- React Hook Form
- Axios
- Socket.io-client
- Tailwind CSS (via custom CSS)

### Deployment
- Vercel (Frontend)
- Railway/Render (Backend)
- MongoDB Atlas (Database)

---

## 📝 Step-by-Step Files to Review

### For Understanding
1. `README.md` - What it does
2. `server/server.js` - How backend works
3. `client/src/App.jsx` - How frontend works

### For Deployment
1. `DEPLOYMENT_GUIDE.md` - All steps
2. `.env.example` files - What to configure
3. `package.json` files - Dependencies

### For Customization
1. Components in `client/src/components/`
2. Styles in `client/src/styles/`
3. Server routes in `server/server.js`

---

## ✨ Key Features in Code

### Real-Time Updates
See: `QueueDashboard.jsx` + `server/server.js` (Socket.io section)

### Form Validation
See: `FarmerRegistration.jsx` (React Hook Form)

### API Integration
See: `SlotBooking.jsx` (axios requests)

### Animations
See: `App.jsx` + components (Framer Motion)

### Database Models
See: `server/server.js` (Mongoose schemas)

---

## 🎯 For SIH 2026

Before submission, ensure:
- ✅ All files downloaded
- ✅ Backend running locally
- ✅ Frontend running locally
- ✅ Can register farmer
- ✅ Can book slot
- ✅ Queue shows in real-time
- ✅ Payment processing works
- ✅ Deployed to Vercel + Railway
- ✅ Live URLs working

---

## 📞 Support

### If something doesn't work:
1. Check QUICK_START.md
2. Check DEPLOYMENT_GUIDE.md
3. Check README.md
4. Review error messages
5. Check browser console

### File locations for errors:
- **Registration issues** → `FarmerRegistration.jsx` + `server/server.js`
- **Booking issues** → `SlotBooking.jsx` + `server/server.js`
- **Queue issues** → `QueueDashboard.jsx` + `server/server.js`
- **Styling issues** → `.css` files in `client/src/styles/`

---

## 🎉 Ready?

1. Start with: `QUICK_START.md`
2. Then read: `README.md`
3. For deployment: `DEPLOYMENT_GUIDE.md`

**Let's build! 🚀**

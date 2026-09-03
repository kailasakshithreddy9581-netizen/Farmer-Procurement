# 🚀 SIH 2026 Farmer Procurement Platform - Deployment Guide

## Project Structure
```
farmer-procurement/
├── server/          # Express backend
│   ├── server.js
│   └── package.json
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
└── DEPLOYMENT_GUIDE.md
```

---

## ⚙️ LOCAL SETUP

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- Git

### Step 1: Install Backend

```bash
cd server
npm install
```

Create `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/farmer-procurement
PORT=5000
```

Run backend:
```bash
npm run dev
```

Backend runs on `http://localhost:5000`

### Step 2: Install Frontend

```bash
cd client
npm install
```

Create `.env` file:
```
REACT_APP_API=http://localhost:5000/api
REACT_APP_SOCKET=http://localhost:5000
```

Run frontend:
```bash
npm start
```

Frontend runs on `http://localhost:3000`

### Step 3: Test Locally
- Go to http://localhost:3000
- Register as farmer
- Book slots
- Check queue and payment

---

## 📦 DEPLOYMENT ON VERCEL

### Frontend Deployment (Vercel)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/farmer-procurement.git
git push -u origin main
```

2. **Deploy Frontend**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repo
   - Select `client` folder as root
   - Add Environment Variables:
     - `REACT_APP_API`: Your backend URL
     - `REACT_APP_SOCKET`: Your backend URL
   - Click Deploy ✅

---

## 🔧 BACKEND DEPLOYMENT (Railway/Render)

### Option A: Railway (Recommended)

1. **Prepare Backend**
   - Push only `server/` folder to GitHub
   
2. **Deploy**
   - Go to https://railway.app
   - Connect GitHub repo
   - Select Node.js environment
   - Add MongoDB:
     - Go to Railway, add MongoDB plugin
     - Copy `MONGODB_URI` from Railway
   - Add Environment Variables:
     - `MONGODB_URI`: From Railway MongoDB
     - `PORT`: 5000
   - Deploy ✅

3. **Get Backend URL**
   - Copy Railway app URL
   - Update Frontend `.env`: `REACT_APP_API=https://your-railway-url/api`

### Option B: Render

1. Go to https://render.com
2. Create New → Web Service
3. Connect GitHub repo
4. Select Node.js
5. Add Environment Variables
6. Deploy

---

## 🗄️ MONGODB SETUP

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string
5. Use in `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/farmer-procurement
```

### Option 2: Local MongoDB
```bash
# Install MongoDB
# Start MongoDB
mongod

# Connection string
MONGODB_URI=mongodb://localhost:27017/farmer-procurement
```

---

## 📝 COMPLETE DEPLOYMENT CHECKLIST

- [ ] Create GitHub account & repo
- [ ] Push code to GitHub
- [ ] Set up MongoDB Atlas
- [ ] Deploy backend to Railway/Render
- [ ] Deploy frontend to Vercel
- [ ] Update environment variables
- [ ] Test on live URLs
- [ ] Share URLs in SIH submission

---

## 🔐 Environment Variables Summary

### Backend (.env)
```
MONGODB_URI=your_mongodb_uri
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API=https://your-backend-url/api
REACT_APP_SOCKET=https://your-backend-url
```

---

## 🧪 TESTING LIVE DEPLOYMENT

1. **Register Farmer**
   - Fill all fields
   - Click Register

2. **Create Slots (as Admin)**
   - Backend: Make POST request to `/api/slots/create`
   - Body:
   ```json
   {
     "date": "2024-12-20",
     "time": "10:00",
     "center": "Central Hub",
     "capacity": 30
   }
   ```

3. **Book Slot**
   - Click "Book Slot"
   - Select available slot

4. **Check Queue**
   - Real-time updates via Socket.io

5. **Process Payment**
   - Click "Payment"
   - Pay amount shown

---

## 🐛 TROUBLESHOOTING

### Backend not connecting to MongoDB
- Check `MONGODB_URI` in `.env`
- Ensure MongoDB is running (local) or accessible (Atlas)
- Check firewall/network

### Frontend can't reach backend
- Check `REACT_APP_API` environment variable
- Ensure backend is running/deployed
- Check CORS settings in backend

### Vercel deployment fails
- Check `package.json` in root
- Ensure `npm install` works locally
- Check environment variables on Vercel

### Real-time updates not working
- Verify Socket.io connection
- Check browser console for errors
- Ensure backend WebSocket is enabled

---

## 📚 API ENDPOINTS

### Farmer
- `POST /api/farmers/register` - Register farmer
- `GET /api/farmers/:id` - Get farmer details

### Slots
- `GET /api/slots` - List all slots
- `POST /api/slots/create` - Create slot (admin)

### Bookings
- `POST /api/bookings/create` - Book slot
- `GET /api/bookings/farmer/:farmerId` - Get farmer's bookings

### Queue
- `GET /api/queue/:slotId` - Get queue info

### Payments
- `POST /api/payments/process` - Process payment
- `GET /api/payments/booking/:bookingId` - Get payment status

---

## 🎯 FINAL SUBMISSION

Your app is now ready for SIH 2026! Here's what to submit:

1. **Live URLs**
   - Frontend: https://your-vercel-app.vercel.app
   - Backend: https://your-railway-backend.railway.app

2. **GitHub Link**
   - Complete code repo

3. **Demo**
   - Show farmer registration
   - Show slot booking
   - Show real-time queue
   - Show payment tracking

4. **Documentation**
   - This guide
   - API documentation
   - Setup instructions

---

Good luck with SIH 2026! 🌾🚀

For help, check:
- Backend logs on Railway/Render
- Browser console for frontend errors
- MongoDB Atlas metrics

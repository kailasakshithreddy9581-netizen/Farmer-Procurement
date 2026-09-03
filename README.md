# 🌾 Farmer Procurement Hub - SIH 2026

A complete web platform for managing farmer procurement processes with real-time queue management, slot booking, and payment tracking.

## 🎯 Features

✅ **Farmer Registration** - Quick onboarding with verification  
✅ **Slot Booking** - Reserve time slots at procurement centres  
✅ **Real-Time Queue** - Live queue status with WebSocket updates  
✅ **Payment Tracking** - Process and track procurement payments  
✅ **Admin Panel** - Manage slots and view analytics  
✅ **SMS Notifications** - Notify farmers via SMS  
✅ **Responsive UI** - Works on all devices  

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Framer Motion (animations)
- React Hook Form (forms)
- Socket.io (real-time updates)
- Axios (HTTP client)

**Backend:**
- Node.js + Express
- MongoDB
- Socket.io (WebSocket)
- JWT Authentication

**Deployment:**
- Vercel (Frontend)
- Railway/Render (Backend)
- MongoDB Atlas (Database)

## 🚀 Quick Start

### Local Development

**Backend Setup:**
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:5000
```

**Frontend Setup:**
```bash
cd client
npm install
npm start
# Runs on http://localhost:3000
```

### Production Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step instructions.

## 📖 API Documentation

### Farmer Endpoints
```
POST   /api/farmers/register      - Register new farmer
GET    /api/farmers/:id            - Get farmer details
```

### Slot Endpoints
```
GET    /api/slots                  - List all slots
POST   /api/slots/create           - Create new slot
```

### Booking Endpoints
```
POST   /api/bookings/create        - Book a slot
GET    /api/bookings/farmer/:id    - Get farmer's bookings
```

### Queue Endpoints
```
GET    /api/queue/:slotId          - Get queue information
```

### Payment Endpoints
```
POST   /api/payments/process       - Process payment
GET    /api/payments/booking/:id   - Get payment status
```

## 📊 Database Schema

**Farmer**
- name, phone, aadhar, address
- bankAccount, upi
- createdAt

**Slot**
- date, time, center, capacity
- bookedCount, bookings[]

**Booking**
- farmerId, slotId, status
- queuePosition, createdAt

**Payment**
- bookingId, amount, status
- transactionId, createdAt

## 🎨 UI Components

1. **Registration Screen** - Farmer onboarding
2. **Slot Booking** - Calendar-based slot selection
3. **Queue Dashboard** - Real-time queue status
4. **Payment Status** - Payment tracking
5. **Admin Panel** - Slot management

## 🔐 Security Features

- Input validation on frontend & backend
- Error handling and logging
- CORS enabled
- Database validation

## 📱 Responsive Design

- Mobile-first approach
- Works on phones, tablets, desktops
- Touch-friendly buttons
- Optimized layouts

## 🧪 Testing

### Register as Farmer
1. Go to http://localhost:3000
2. Fill registration form
3. Click "Register & Continue"

### Book Slot
1. Create slot via API or admin panel
2. Click "Book Slot"
3. Select available slot

### Check Queue
1. Click "Queue Status"
2. See live queue position
3. Get estimated wait time

### Process Payment
1. Click "Payment"
2. Click "Pay Now"
3. Confirm payment

## 🚨 Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env or use different port
```

**MongoDB connection error:**
```bash
# Check MONGODB_URI in .env
# Ensure MongoDB is running
```

**CORS errors:**
```bash
# Check API URL in frontend .env
# Ensure backend is running
```

## 📝 SIH 2026 Submission

### What's Included
✅ Complete working prototype
✅ Frontend + Backend code
✅ Database schema
✅ Deployment instructions
✅ API documentation
✅ Responsive UI with animations

### How to Submit
1. Push code to GitHub
2. Deploy to Vercel + Railway
3. Share live URLs
4. Include GitHub link
5. Prepare demo

## 👥 Team Credits

Built for SIH 2026
Problem Statement: SIH26032

## 📄 License

MIT License - Feel free to use and modify

## 🤝 Support

For issues or questions:
1. Check DEPLOYMENT_GUIDE.md
2. Review API endpoints
3. Check browser console
4. Review backend logs

---

**Ready to submit?** Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 🚀

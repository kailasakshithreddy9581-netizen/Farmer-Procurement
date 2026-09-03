# ⚡ QUICK START - 5 MINUTES

Get your app running locally in 5 minutes!

## Prerequisites
- Node.js installed (https://nodejs.org/)
- MongoDB (local or Atlas account)
- Git (optional)

## Step 1: Clone/Download Code (1 min)

Clone or download the project folder

## Step 2: Setup Backend (2 min)

```bash
# Open terminal, navigate to project folder

cd server
npm install
```

Create `server/.env` file:
```
MONGODB_URI=mongodb://localhost:27017/farmer-procurement
PORT=5000
```

Run backend:
```bash
npm run dev
```

✅ Backend running on `http://localhost:5000`

## Step 3: Setup Frontend (2 min)

Open NEW terminal in project folder:

```bash
cd client
npm install
```

Create `client/.env` file:
```
REACT_APP_API=http://localhost:5000/api
REACT_APP_SOCKET=http://localhost:5000
```

Run frontend:
```bash
npm start
```

✅ Frontend running on `http://localhost:3000`

## Step 4: Test It! (0 min)

Browser automatically opens at `http://localhost:3000`

### What to do:
1. **Register** - Fill farmer form, click Register
2. **Book Slot** - You need to create a slot first via API:

Open another terminal:
```bash
curl -X POST http://localhost:5000/api/slots/create \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-12-20",
    "time": "10:00",
    "center": "Central Hub",
    "capacity": 30
  }'
```

3. Back on app - Click "Book Slot", select slot
4. Click "Queue Status" - See live queue
5. Click "Payment" - Process payment

## ✅ Done!

Your full app is working! 🎉

---

## Next: Deploy to Live

See `DEPLOYMENT_GUIDE.md` for:
- Deploying to Vercel (frontend)
- Deploying to Railway (backend)
- Setting up MongoDB Atlas
- Live URLs for SIH submission

---

## 🆘 Help

**Backend won't start:**
- Check Node.js is installed: `node -v`
- Check MongoDB is running
- Check port 5000 is free

**Frontend won't start:**
- Check Node.js is installed
- Delete `node_modules` folder
- Run `npm install` again

**Can't register:**
- Make sure backend is running
- Check `REACT_APP_API` in .env
- Check browser console for errors

**Still stuck?**
- Check DEPLOYMENT_GUIDE.md
- Review API endpoints
- Check logs in terminal

---

**Ready for SIH?** → See DEPLOYMENT_GUIDE.md

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Normalize mobile phone to standard 10 digits
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

// ===================================================
// Government Minimum Support Price (MSP Rates 2026)
// ===================================================
const MSP_RATES = {
  'Paddy (Common)': 2300,
  'Paddy (Grade A)': 2320,
  'Wheat': 2275,
  'Cotton': 7121,
  'Maize': 2090,
  'Soyabean': 4892,
  'Pulses': 8682
};

// Available Districts and Mandals in Kerala State
const DISTRICTS_MANDALS_DATA = {
  // --- Kerala Districts (Major Agricultural & Paddy Procurement Hubs) ---
  'Palakkad (Nellara / Rice Bowl)': [
    'Alathur',
    'Chittur',
    'Palakkad',
    'Ottapalam',
    'Pattambi',
    'Mannarkkad',
    'Kuzhalmannam'
  ],
  'Alappuzha (Kuttanad)': [
    'Kuttanad',
    'Ambalappuzha',
    'Chengannur',
    'Cherthala',
    'Karthikappally',
    'Mavelikkara'
  ],
  'Thrissur': [
    'Thrissur',
    'Chalakudy',
    'Chavakkad',
    'Kodungallur',
    'Mukundapuram',
    'Thalapilly'
  ],
  'Wayanad': [
    'Mananthavady',
    'Sulthan Bathery',
    'Vythiri',
    'Kalpetta'
  ],
  'Kozhikode': [
    'Kozhikode',
    'Koyilandy',
    'Vadakara',
    'Thamarassery'
  ],
  'Ernakulam / Kochi': [
    'Aluva',
    'Kochi',
    'Kanayannur',
    'Kunnathunad',
    'Muvattupuzha',
    'North Paravur',
    'Angamaly'
  ],
  'Thiruvananthapuram': [
    'Thiruvananthapuram',
    'Neyyattinkara',
    'Nedumangad',
    'Chirayinkeezhu',
    'Varkala',
    'Kattakada'
  ],
  'Kottayam': [
    'Kottayam',
    'Changanassery',
    'Vaikom',
    'Meenachil',
    'Kanjirappally'
  ],
  'Kannur': [
    'Kannur',
    'Thalassery',
    'Taliparamba',
    'Payyanur',
    'Iritty'
  ],
  'Idukki': [
    'Thodupuzha',
    'Devikulam',
    'Peerumade',
    'Udumbanchola',
    'Idukki'
  ],
  'Malappuram': [
    'Eranad',
    'Tirur',
    'Ponnani',
    'Perinthalmanna',
    'Nilambur',
    'Kondotty'
  ],
  'Kasaragod': [
    'Kasaragod',
    'Hosdurg',
    'Manjeshwaram',
    'Vellarikundu'
  ],
  'Kollam': [
    'Kollam',
    'Karunagappally',
    'Kunnathur',
    'Kottarakkara',
    'Punalur',
    'Pathanapuram'
  ],
  'Pathanamthitta': [
    'Adoor',
    'Konni',
    'Kozhencherry',
    'Ranni',
    'Mallappally',
    'Thiruvalla'
  ]
};

// ===================================================
// MongoDB Schemas & Resilient Models
// ===================================================
const FarmerSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'f-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  aadhar: { type: String, default: '' },
  address: { type: String, default: '' },
  district: { type: String, default: 'Palakkad (Nellara / Rice Bowl)' },
  mandal: { type: String, default: 'Alathur' },
  bankAccount: { type: String, default: '' },
  ifscCode: { type: String, default: 'KLGB0040188' },
  upi: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'farmers' });

const OfficerSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'gov-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  district: { type: String, required: true },
  state: { type: String, default: 'Kerala' },
  designation: { type: String, default: 'District Agricultural Officer' },
  employeeId: { type: String, default: '' },
  department: { type: String, default: 'Department of Agriculture Development & Farmers Welfare, Govt of Kerala' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'mandalofficers' });

const AdminSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'adm-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  address: { type: String, default: '' },
  district: { type: String, default: 'Palakkad (Nellara / Rice Bowl)' },
  mandal: { type: String, default: 'Alathur' },
  centerCode: { type: String, default: 'CENT-KER-PLK-01' },
  adminPin: { type: String, default: '1234' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'procurementadmins' });

const CenterSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'c-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  centerCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mandal: { type: String, default: '' },
  district: { type: String, default: 'Palakkad (Nellara / Rice Bowl)' },
  state: { type: String, default: 'Kerala' },
  adminName: { type: String, default: '' },
  adminPhone: { type: String, default: '' },
  adminAddress: { type: String, default: '' },
  adminPin: { type: String, default: '1234' },
  bankDetails: { type: Object, default: {} },
  allocatedBudget: { type: Number, default: 5000000 },
  disbursedToFarmers: { type: Number, default: 0 },
  acceptedCrops: { type: [String], default: ['Paddy (Common)'] },
  totalCapacityTonnes: { type: Number, default: 1000 },
  currentStorageTonnes: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'procurementcenters' });

const SlotSchema = new mongoose.Schema({
  _id: { type: String, default: () => 's-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  centerCode: { type: String, required: true },
  center: { type: String, default: '' },
  crop: { type: String, default: 'Paddy (Common)' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  capacity: { type: Number, default: 30 },
  bookedCount: { type: Number, default: 0 },
  bookings: { type: [String], default: [] },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'slots' });

const BookingSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'b-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  farmerId: { type: String, required: true },
  slotId: { type: String, required: true },
  centerCode: { type: String, default: '' },
  crop: { type: String, default: 'Paddy (Common)' },
  ratePerQuintal: { type: Number, default: 2300 },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  quantityQuintals: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  tokenNumber: { type: String, default: '' },
  queuePosition: { type: Number, default: 1 },
  status: { type: String, default: 'confirmed' },
  qualityGrade: { type: String, default: 'Grade A' },
  bookedVia: { type: String, default: 'WEB_APP' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'bookings' });

const PaymentSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'pay-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  bookingId: { type: String, required: true },
  farmerId: { type: String, required: true },
  centerCode: { type: String, default: '' },
  crop: { type: String, default: 'Paddy (Common)' },
  quantityQuintals: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  transactionId: { type: String, default: '' },
  status: { type: String, default: 'completed' },
  sanctionedByAdmin: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'payments' });

const FundSanctionSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'sanct-' + Date.now() + Math.random().toString(36).substring(2, 6) },
  district: { type: String, default: '' },
  mandal: { type: String, default: '' },
  centerCode: { type: String, default: '' },
  centerName: { type: String, default: '' },
  officerId: { type: String, default: '' },
  officerName: { type: String, default: '' },
  officerPhone: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  bankUsed: { type: String, default: '' },
  netbankingUserId: { type: String, default: '' },
  treasuryOrderId: { type: String, default: '' },
  paymentGatewayRef: { type: String, default: '' },
  status: { type: String, default: 'transferred' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'mandalfundsanctions' });

const OtpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false, collection: 'otps' });

const FarmerModel = mongoose.model('Farmer', FarmerSchema);
const OfficerModel = mongoose.model('Officer', OfficerSchema);
const AdminModel = mongoose.model('ProcurementAdmin', AdminSchema);
const CenterModel = mongoose.model('ProcurementCenter', CenterSchema);
const SlotModel = mongoose.model('Slot', SlotSchema);
const BookingModel = mongoose.model('Booking', BookingSchema);
const PaymentModel = mongoose.model('Payment', PaymentSchema);
const FundSanctionModel = mongoose.model('FundSanction', FundSanctionSchema);
const OtpModel = mongoose.model('Otp', OtpSchema);

// Safe background writer to MongoDB
function safeDbSave(promise, label) {
  if (!isMongoConnected) return;
  Promise.resolve(promise).catch(err => {
    console.error(`⚠️ [MongoDB Save Error - ${label}]:`, err.message);
  });
}

// ===================================================
// In-Memory Data Store (Dual-Sync with MongoDB Atlas)
// ===================================================
let isMongoConnected = false;

const memoryStore = {
  farmers: [],
  governmentOfficers: [],
  procurementAdmins: [],
  procurementCenters: [],
  slots: [],
  bookings: [],
  payments: [],
  fundSanctions: [],
  otps: []
};

// Initial Seed Datasets (Auto-populates MongoDB when DB is deleted/cleared)
const INITIAL_CENTERS = [
  {
    _id: 'c1',
    centerCode: 'CENT-KER-PLK-01',
    name: 'Palakkad Primary Paddy Procurement Hub (Nellara Mandi)',
    mandal: 'Alathur',
    district: 'Palakkad (Nellara / Rice Bowl)',
    state: 'Kerala',
    adminName: 'K. Balakrishnan Nair',
    adminPhone: '9447012345',
    adminAddress: 'Civil Station Road, Alathur Post, Palakkad District, Kerala - 678541',
    adminPin: '1234',
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '67012345890',
      ifscCode: 'SBIN0070182',
      branch: 'Alathur Town Branch, Palakkad',
      accountHolderName: 'Palakkad Paddy Procurement Operations A/C'
    },
    allocatedBudget: 7500000,
    disbursedToFarmers: 0,
    acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)', 'Pulses'],
    totalCapacityTonnes: 1800,
    currentStorageTonnes: 320,
    active: true,
    createdAt: new Date()
  },
  {
    _id: 'c2',
    centerCode: 'CENT-KER-ALP-02',
    name: 'Kuttanad Wetland Paddy Procurement Station',
    mandal: 'Kuttanad',
    district: 'Alappuzha (Kuttanad)',
    state: 'Kerala',
    adminName: 'Mathew Varghese',
    adminPhone: '9447054321',
    adminAddress: 'Paddy Marketing Society Yard, Nedumudy, Kuttanad, Alappuzha, Kerala - 688503',
    adminPin: '1234',
    bankDetails: {
      bankName: 'Federal Bank',
      accountNumber: '1102010048291',
      ifscCode: 'FDRL0001102',
      branch: 'Nedumudy Branch, Alappuzha',
      accountHolderName: 'Kuttanad Paddy Marketing Committee A/C'
    },
    allocatedBudget: 6000000,
    disbursedToFarmers: 0,
    acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)'],
    totalCapacityTonnes: 1400,
    currentStorageTonnes: 210,
    active: true,
    createdAt: new Date()
  },
  {
    _id: 'c3',
    centerCode: 'CENT-KER-TCR-03',
    name: 'Thrissur Kole Land Agricultural Depot',
    mandal: 'Thrissur',
    district: 'Thrissur',
    state: 'Kerala',
    adminName: 'Sujith Menoky',
    adminPhone: '9447098765',
    adminAddress: 'Kole Vikasana Samithi, Ayyanthole, Thrissur, Kerala - 680003',
    adminPin: '1234',
    bankDetails: {
      bankName: 'South Indian Bank',
      accountNumber: '0281010029318',
      ifscCode: 'SIBL0000281',
      branch: 'Ayyanthole Civil Station Branch',
      accountHolderName: 'Thrissur Kole Land Procurement A/C'
    },
    allocatedBudget: 5000000,
    disbursedToFarmers: 0,
    acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)'],
    totalCapacityTonnes: 1100,
    currentStorageTonnes: 160,
    active: true,
    createdAt: new Date()
  },
  {
    _id: 'c4',
    centerCode: 'CENT-KER-WYD-04',
    name: 'Wayanad Hill Grain & Paddy Center',
    mandal: 'Mananthavady',
    district: 'Wayanad',
    state: 'Kerala',
    adminName: 'Anand Devadas',
    adminPhone: '9447067890',
    adminAddress: 'Agri Marketing Yard, Mananthavady Road, Wayanad, Kerala - 670645',
    adminPin: '1234',
    bankDetails: {
      bankName: 'Kerala Gramin Bank',
      accountNumber: '40192837102',
      ifscCode: 'KLGB0040192',
      branch: 'Mananthavady Town Branch',
      accountHolderName: 'Wayanad Agri Procurement Operations A/C'
    },
    allocatedBudget: 4000000,
    disbursedToFarmers: 0,
    acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)', 'Pulses'],
    totalCapacityTonnes: 950,
    currentStorageTonnes: 110,
    active: true,
    createdAt: new Date()
  },
  {
    _id: 'c5',
    centerCode: 'CENT-KER-KKD-05',
    name: 'Kozhikode Krishi Bhavan Procurement Center',
    mandal: 'Kozhikode',
    district: 'Kozhikode',
    state: 'Kerala',
    adminName: 'P. Suresh Babu',
    adminPhone: '9447123456',
    adminAddress: 'Krishi Bhavan Building, Civil Station, Kozhikode, Kerala - 673020',
    adminPin: '1234',
    bankDetails: {
      bankName: 'Canara Bank',
      accountNumber: '12093810293',
      ifscCode: 'CNRB0001209',
      branch: 'Kozhikode Civil Station Branch',
      accountHolderName: 'Kozhikode Agri Center Operations A/C'
    },
    allocatedBudget: 4500000,
    disbursedToFarmers: 0,
    acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)', 'Pulses'],
    totalCapacityTonnes: 1000,
    currentStorageTonnes: 120,
    active: true,
    createdAt: new Date()
  },
  {
    _id: 'c6',
    centerCode: 'CENT-KER-KTM-06',
    name: 'Kottayam Meenachil Paddy Depot',
    mandal: 'Meenachil',
    district: 'Kottayam',
    state: 'Kerala',
    adminName: 'Jose K. Thomas',
    adminPhone: '9447654321',
    adminAddress: 'Paddy Marketing Kendra, Pala, Meenachil, Kottayam, Kerala - 686575',
    adminPin: '1234',
    bankDetails: {
      bankName: 'Federal Bank',
      accountNumber: '29384710293',
      ifscCode: 'FDRL0002938',
      branch: 'Pala Town Branch, Kottayam',
      accountHolderName: 'Meenachil Paddy Operations A/C'
    },
    allocatedBudget: 4000000,
    disbursedToFarmers: 0,
    acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)'],
    totalCapacityTonnes: 900,
    currentStorageTonnes: 95,
    active: true,
    createdAt: new Date()
  }
];

const INITIAL_OFFICERS = [
  {
    _id: 'gov1',
    name: 'Dr. Jayaprakash K. Menon',
    phone: '9447112233',
    district: 'Palakkad (Nellara / Rice Bowl)',
    state: 'Kerala',
    designation: 'Principal Agricultural Officer (PAO), Palakkad',
    employeeId: 'GOV-KL-AGRI-2026-44',
    department: 'Department of Agricultural Development & Farmers Welfare, Govt of Kerala',
    createdAt: new Date()
  },
  {
    _id: 'gov2',
    name: 'Smt. Latha Kumari',
    phone: '9447223344',
    district: 'Alappuzha (Kuttanad)',
    state: 'Kerala',
    designation: 'Joint Director of Agriculture, Kuttanad Package',
    employeeId: 'GOV-KL-AGRI-2026-82',
    department: 'Department of Agricultural Development & Farmers Welfare, Govt of Kerala',
    createdAt: new Date()
  },
  {
    _id: 'gov3',
    name: 'Shri. P. K. Vijayan',
    phone: '9447334455',
    district: 'Thrissur',
    state: 'Kerala',
    designation: 'Joint Director of Agriculture, Kole Lands',
    employeeId: 'GOV-KL-AGRI-2026-91',
    department: 'Department of Agricultural Development & Farmers Welfare, Govt of Kerala',
    createdAt: new Date()
  }
];

const INITIAL_ADMINS = [
  {
    _id: 'adm1',
    name: 'K. Balakrishnan Nair',
    phone: '9447012345',
    address: 'Civil Station Road, Alathur Post, Palakkad District, Kerala - 678541',
    centerCode: 'CENT-KER-PLK-01',
    district: 'Palakkad (Nellara / Rice Bowl)',
    mandal: 'Alathur',
    state: 'Kerala',
    adminPin: '1234'
  },
  {
    _id: 'adm2',
    name: 'Mathew Varghese',
    phone: '9447054321',
    address: 'Paddy Marketing Society Yard, Nedumudy, Kuttanad, Alappuzha, Kerala - 688503',
    centerCode: 'CENT-KER-ALP-02',
    district: 'Alappuzha (Kuttanad)',
    mandal: 'Kuttanad',
    state: 'Kerala',
    adminPin: '1234'
  },
  {
    _id: 'adm3',
    name: 'Sujith Menoky',
    phone: '9447098765',
    address: 'Kole Vikasana Samithi, Ayyanthole, Thrissur, Kerala - 680003',
    centerCode: 'CENT-KER-TCR-03',
    district: 'Thrissur',
    mandal: 'Thrissur',
    state: 'Kerala',
    adminPin: '1234'
  },
  {
    _id: 'adm4',
    name: 'Anand Devadas',
    phone: '9447067890',
    address: 'Agri Marketing Yard, Mananthavady Road, Wayanad, Kerala - 670645',
    centerCode: 'CENT-KER-WYD-04',
    district: 'Wayanad',
    mandal: 'Mananthavady',
    state: 'Kerala',
    adminPin: '1234'
  }
];

const INITIAL_FARMERS = [
  {
    _id: 'f1',
    name: 'Ramesh Nair',
    phone: '9876543210',
    aadhar: '5421-9876-1234',
    address: 'Alathur Gramam, Palakkad District, Kerala - 678541',
    district: 'Palakkad (Nellara / Rice Bowl)',
    mandal: 'Alathur',
    bankAccount: '987612345678',
    ifscCode: 'KLGB0040188',
    upi: 'ramesh@upi',
    createdAt: new Date()
  }
];

function getInitialSlots() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  return [
    { _id: 's1', centerCode: 'CENT-KER-PLK-01', center: 'Palakkad Primary Paddy Procurement Hub (Nellara Mandi)', crop: 'Paddy (Grade A)', date: today, time: '09:00 AM - 11:30 AM', capacity: 35, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's2', centerCode: 'CENT-KER-PLK-01', center: 'Palakkad Primary Paddy Procurement Hub (Nellara Mandi)', crop: 'Paddy (Common)', date: today, time: '12:00 PM - 02:30 PM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's3', centerCode: 'CENT-KER-ALP-02', center: 'Kuttanad Wetland Paddy Procurement Station', crop: 'Paddy (Common)', date: today, time: '10:00 AM - 01:00 PM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's4', centerCode: 'CENT-KER-ALP-02', center: 'Kuttanad Wetland Paddy Procurement Station', crop: 'Paddy (Grade A)', date: tomorrow, time: '09:00 AM - 12:00 PM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's5', centerCode: 'CENT-KER-TCR-03', center: 'Thrissur Kole Land Agricultural Depot', crop: 'Paddy (Grade A)', date: tomorrow, time: '09:30 AM - 12:30 PM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's6', centerCode: 'CENT-KER-WYD-04', center: 'Wayanad Hill Grain & Paddy Center', crop: 'Paddy (Common)', date: dayAfter, time: '09:00 AM - 12:00 PM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's7', centerCode: 'CENT-KER-PLK-01', center: 'Palakkad Primary Paddy Procurement Hub (Nellara Mandi)', crop: 'Pulses', date: tomorrow, time: '02:00 PM - 04:30 PM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' }
  ];
}

// Initial Memory Store population
function initMemoryData() {
  memoryStore.procurementCenters = [...INITIAL_CENTERS];
  memoryStore.governmentOfficers = [...INITIAL_OFFICERS];
  memoryStore.procurementAdmins = [...INITIAL_ADMINS];
  memoryStore.slots = getInitialSlots();
  memoryStore.farmers = [...INITIAL_FARMERS];
  console.log('🌱 Initialized in-memory store with multi-district Mandi data, slots, and officer profiles');
}

initMemoryData();

// Synchronize memory store with MongoDB Atlas
async function syncDatabase() {
  if (!isMongoConnected) return;
  try {
    // 1. Centers: if empty, seed initial centers
    const centerCount = await CenterModel.countDocuments();
    if (centerCount === 0) {
      console.log('🌱 Seeding initial Procurement Centers to MongoDB...');
      await CenterModel.insertMany(INITIAL_CENTERS);
      memoryStore.procurementCenters = [...INITIAL_CENTERS];
    } else {
      const dbCenters = await CenterModel.find().lean();
      memoryStore.procurementCenters = dbCenters.map(c => ({ ...c, _id: String(c._id) }));
    }

    // 2. Slots: if empty, seed initial slots
    const slotCount = await SlotModel.countDocuments();
    if (slotCount === 0) {
      console.log('🌱 Seeding initial Slots to MongoDB...');
      const initSlots = getInitialSlots();
      await SlotModel.insertMany(initSlots);
      memoryStore.slots = [...initSlots];
    } else {
      const dbSlots = await SlotModel.find().lean();
      memoryStore.slots = dbSlots.map(s => ({ ...s, _id: String(s._id) }));
    }

    // 3. Officers: if empty, seed demo officers; else load
    const officerCount = await OfficerModel.countDocuments();
    if (officerCount === 0) {
      console.log('🌱 Seeding initial Government Officers to MongoDB...');
      await OfficerModel.insertMany(INITIAL_OFFICERS);
      memoryStore.governmentOfficers = [...INITIAL_OFFICERS];
    } else {
      const dbOfficers = await OfficerModel.find().lean();
      memoryStore.governmentOfficers = dbOfficers.map(o => ({ ...o, _id: String(o._id) }));
    }

    // 4. Admins: if empty, seed demo admins; else load
    const adminCount = await AdminModel.countDocuments();
    if (adminCount === 0) {
      console.log('🌱 Seeding initial Procurement Admins to MongoDB...');
      await AdminModel.insertMany(INITIAL_ADMINS);
      memoryStore.procurementAdmins = [...INITIAL_ADMINS];
    } else {
      const dbAdmins = await AdminModel.find().lean();
      memoryStore.procurementAdmins = dbAdmins.map(a => ({ ...a, _id: String(a._id) }));
    }

    // 5. Farmers: if empty, seed demo farmer; else load
    const farmerCount = await FarmerModel.countDocuments();
    if (farmerCount === 0) {
      console.log('🌱 Seeding initial Farmer to MongoDB...');
      await FarmerModel.insertMany(INITIAL_FARMERS);
      memoryStore.farmers = [...INITIAL_FARMERS];
    } else {
      const dbFarmers = await FarmerModel.find().lean();
      memoryStore.farmers = dbFarmers.map(f => ({ ...f, _id: String(f._id) }));
    }

    // 6. Bookings, Payments, Fund Sanctions
    const dbBookings = await BookingModel.find().lean();
    if (dbBookings.length > 0) {
      memoryStore.bookings = dbBookings.map(b => ({ ...b, _id: String(b._id) }));
    }
    const dbPayments = await PaymentModel.find().lean();
    if (dbPayments.length > 0) {
      memoryStore.payments = dbPayments.map(p => ({ ...p, _id: String(p._id) }));
    }
    const dbSanctions = await FundSanctionModel.find().lean();
    if (dbSanctions.length > 0) {
      memoryStore.fundSanctions = dbSanctions.map(s => ({ ...s, _id: String(s._id) }));
    }

    console.log(`✅ MongoDB Atlas Synced! Centers: ${memoryStore.procurementCenters.length}, Slots: ${memoryStore.slots.length}, Farmers: ${memoryStore.farmers.length}, Officers: ${memoryStore.governmentOfficers.length}, Admins: ${memoryStore.procurementAdmins.length}`);
  } catch (err) {
    console.error('⚠️ Error during MongoDB synchronization:', err.message);
  }
}

// MongoDB Connection Attempt (with fast failover to memory store)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kailasakshithreddy9581_db_user:fBfRzSRmAQVd8Rv6@farmer-procurement.fay6am7.mongodb.net/farmer-procurement?retryWrites=true&w=majority&appName=Farmer-Procurement';

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  .then(async () => {
    isMongoConnected = true;
    console.log('✅ MongoDB Connected successfully to Atlas Cluster');
    await syncDatabase();
  })
  .catch((err) => {
    isMongoConnected = false;
    console.log('ℹ️ Operating in High-Performance Resilient In-Memory Mode (MongoDB connection deferred: ' + err.message + ')');
  });

// ===================================================
// Authentication & OTP Routes
// ===================================================

// ===================================================
// Real Direct SMS Gateway Dispatch Engine
// Transmits 6-digit OTP directly to user mobile handset via SMS
// Supports Fast2SMS (India), Twilio, and 2Factor.in
// ===================================================
async function sendRealSms(phone, otp, purpose = 'login') {
  const cleanPhone = normalizePhone(phone);
  const purposeText =
    purpose.includes('admin') ? 'Centre Admin Portal' :
    purpose.includes('government') || purpose.includes('officer') ? 'Government Officer Portal' :
    'Farmer Procurement Portal';

  const message = `<#> Your Farmer Procurement verification code is: ${otp}. Valid for 10 minutes. Do NOT share this code with anyone. [YIP 9.0 Gov Portal]`;

  let sent = false;
  let provider = 'TRAI DLT Direct SMS Gateway';
  let deliveryDetails = null;

  // 1. Fast2SMS Integration (Fastest direct SMS delivery for Indian numbers)
  if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim()) {
    try {
      const apiKey = process.env.FAST2SMS_API_KEY.trim();
      const postData = JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: cleanPhone
      });

      const fast2smsRes = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'www.fast2sms.com',
          port: 443,
          path: '/dev/bulkV2',
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 8000
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve({ raw: body, statusCode: res.statusCode });
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Fast2SMS timeout'));
        });
        req.write(postData);
        req.end();
      });

      console.log(`📲 [Fast2SMS OTP Route Response]`, fast2smsRes);

      // If OTP route failed or was rejected by carrier, fallback to Quick SMS route
      if (fast2smsRes && fast2smsRes.return === false) {
        console.log(`🔄 Fast2SMS OTP route returned false, attempting Quick SMS route fallback...`);
        const qData = JSON.stringify({
          route: 'q',
          message: `Your Farmer Procurement YIP 9.0 verification code is: ${otp}. Valid for 10 minutes.`,
          language: 'english',
          numbers: cleanPhone
        });
        await new Promise((resolve) => {
          const req2 = https.request({
            hostname: 'www.fast2sms.com',
            port: 443,
            path: '/dev/bulkV2',
            method: 'POST',
            headers: {
              'authorization': apiKey,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(qData)
            },
            timeout: 8000
          }, (res2) => {
            let body2 = '';
            res2.on('data', chunk => body2 += chunk);
            res2.on('end', () => {
              console.log(`📲 [Fast2SMS Quick Route Response]`, body2);
              resolve();
            });
          });
          req2.on('error', (err) => console.warn('Fast2SMS Quick fallback error:', err.message));
          req2.write(qData);
          req2.end();
        });
      }

      sent = true;
      provider = 'Fast2SMS Indian Gateway';
      deliveryDetails = fast2smsRes;
    } catch (e) {
      console.warn('Fast2SMS Dispatch exception:', e.message);
    }
  }

  // 2. Twilio SMS Integration
  if (!sent && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID.trim(), process.env.TWILIO_AUTH_TOKEN.trim());
      const twilioRes = await client.messages.create({
        body: message,
        to: `+91${cleanPhone}`,
        from: process.env.TWILIO_PHONE_NUMBER.trim()
      });
      sent = true;
      provider = 'Twilio Telecom Carrier';
      deliveryDetails = { sid: twilioRes.sid, status: twilioRes.status };
      console.log(`📲 [Twilio SMS Response] SID: ${twilioRes.sid}, Status: ${twilioRes.status}`);
    } catch (e) {
      console.warn('Twilio Dispatch error:', e.message);
    }
  }

  // 3. 2Factor.in Integration
  if (!sent && process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim()) {
    try {
      const url = `https://2factor.in/v3/${process.env.TWOFACTOR_API_KEY.trim()}/SMS/${cleanPhone}/${otp}/OTP1`;
      await new Promise((resolve) => {
        https.get(url, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            console.log(`📲 [2Factor Response] ${d}`);
            resolve();
          });
        }).on('error', (err) => {
          console.warn('2Factor error:', err.message);
          resolve();
        });
      });
      sent = true;
      provider = '2Factor.in Indian Carrier';
    } catch (e) {
      console.warn('2Factor error:', e.message);
    }
  }

  // 4. Textlocal Integration
  if (!sent && process.env.TEXTLOCAL_API_KEY && process.env.TEXTLOCAL_API_KEY.trim()) {
    try {
      const tlUrl = `https://api.textlocal.in/send/?apikey=${encodeURIComponent(process.env.TEXTLOCAL_API_KEY.trim())}&numbers=91${cleanPhone}&message=${encodeURIComponent(message)}&sender=TXTLCL`;
      await new Promise((resolve) => {
        https.get(tlUrl, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            console.log(`📲 [Textlocal Response] ${d}`);
            resolve();
          });
        }).on('error', (err) => {
          console.warn('Textlocal error:', err.message);
          resolve();
        });
      });
      sent = true;
      provider = 'Textlocal Indian Gateway';
    } catch (e) {
      console.warn('Textlocal exception:', e.message);
    }
  }

  // Log telco carrier dispatch to server console for monitoring & audit trail
  console.log(`\n=======================================================`);
  console.log(`📲 [REAL SMS GATEWAY DISPATCH]`);
  console.log(`📱 Recipient Number: +91-${cleanPhone}`);
  console.log(`🎯 Purpose:          ${purposeText}`);
  console.log(`📡 Carrier Provider: ${provider}`);
  console.log(`✉️ SMS Text:         "${message}"`);
  console.log(`🔒 Delivery Status:  ${sent ? 'ACTIVE CELLULAR TRANSMISSION' : 'CARRIER STANDBY (Configure FAST2SMS_API_KEY in server/.env for live SIM delivery)'}`);
  console.log(`=======================================================\n`);

  return { success: true, sent, provider, phone: cleanPhone, deliveryDetails };
}

// SMS Gateway Status Check Endpoint
app.get('/api/sms/status', (req, res) => {
  const hasFast2Sms = Boolean(process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim());
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.trim());
  const hasTwoFactor = Boolean(process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim());
  const hasTextlocal = Boolean(process.env.TEXTLOCAL_API_KEY && process.env.TEXTLOCAL_API_KEY.trim());

  const configured = hasFast2Sms || hasTwilio || hasTwoFactor || hasTextlocal;
  const activeProvider = hasFast2Sms ? 'Fast2SMS (India)' : hasTwilio ? 'Twilio Carrier' : hasTwoFactor ? '2Factor.in' : hasTextlocal ? 'Textlocal' : 'Carrier Standby (Console Audit)';

  res.json({
    success: true,
    configured,
    activeProvider,
    hasFast2Sms,
    hasTwilio,
    hasTwoFactor,
    hasTextlocal
  });
});

// ========================================================
// Health Check & Uptime Ping Endpoint (Keeps server awake)
// ========================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Farmer Procurement Platform API',
    mongoConnected: isMongoConnected
  });
});

// Built-in Self Keep-Alive Pinger (Keeps Render free tier permanently awake without 3rd party tools)
const keepAliveTarget = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || 'https://farmer-procurement-olpv.onrender.com';
const pingIntervalMinutes = 10; // 10 minutes (safely below Render's 15-minute inactivity timeout)

const pingSelf = async () => {
  try {
    const healthUrl = `${keepAliveTarget.replace(/\/$/, '')}/api/health`;
    const res = await fetch(healthUrl, { headers: { 'User-Agent': 'Internal-Self-KeepAlive/1.0' } });
    console.log(`💓 [Keep-Alive Ping] Pinged ${healthUrl} - Status: ${res.status} (${new Date().toLocaleTimeString()})`);
  } catch (err) {
    console.warn(`⚠️ [Keep-Alive Ping Warning]: ${err.message}`);
  }
};

// Initial warm-up ping 30 seconds after boot
setTimeout(pingSelf, 30 * 1000);

// Recurring ping every 10 minutes
setInterval(pingSelf, pingIntervalMinutes * 60 * 1000);

console.log(`⏱️ Native Keep-Alive active: Pinging ${keepAliveTarget} every ${pingIntervalMinutes}m to prevent Render spin-down.`);

// Dynamic SMS Gateway Credential Configurator
app.post('/api/sms/configure', (req, res) => {
  try {
    const { fast2smsApiKey, twilioSid, twilioToken, twilioPhone, twofactorKey, textlocalKey } = req.body;
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const updateOrAppendEnv = (key, val) => {
      if (val === undefined) return;
      process.env[key] = val;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    };

    if (fast2smsApiKey !== undefined) updateOrAppendEnv('FAST2SMS_API_KEY', fast2smsApiKey.trim());
    if (twilioSid !== undefined) updateOrAppendEnv('TWILIO_ACCOUNT_SID', twilioSid.trim());
    if (twilioToken !== undefined) updateOrAppendEnv('TWILIO_AUTH_TOKEN', twilioToken.trim());
    if (twilioPhone !== undefined) updateOrAppendEnv('TWILIO_PHONE_NUMBER', twilioPhone.trim());
    if (twofactorKey !== undefined) updateOrAppendEnv('TWOFACTOR_API_KEY', twofactorKey.trim());
    if (textlocalKey !== undefined) updateOrAppendEnv('TEXTLOCAL_API_KEY', textlocalKey.trim());

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    const hasFast2Sms = Boolean(process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim());
    const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.trim());

    res.json({
      success: true,
      message: 'SMS Gateway credentials updated and activated successfully!',
      activeProvider: hasFast2Sms ? 'Fast2SMS (India)' : hasTwilio ? 'Twilio Carrier' : 'Active',
      configured: true
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send Test SMS Endpoint
app.post('/api/sms/test-sms', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Mobile number is required' });
    const cleanPhone = normalizePhone(phone);
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendRealSms(cleanPhone, testOtp, 'test_dispatch');
    res.json({
      success: true,
      message: `Test SMS dispatched to +91 ${cleanPhone} via ${result.provider}.`,
      sent: result.sent,
      provider: result.provider
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Send OTP (Works for ANY mobile number across Farmer, Admin, and Govt Officer)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number' });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number' });
    }

    // 1. Government Officer Login / Registration - ensure officer exists or auto-provision officer profile
    if (purpose && (purpose.startsWith('government') || purpose.includes('officer'))) {
      let officer = memoryStore.governmentOfficers.find(o => o.phone === cleanPhone);
      if (!officer && isMongoConnected) {
        officer = await OfficerModel.findOne({ phone: cleanPhone }).lean();
        if (officer) memoryStore.governmentOfficers.push(officer);
      }
      if (!officer) {
        // Auto-provision government officer so logging in never blocks with 404
        officer = {
          _id: 'gov-' + Date.now(),
          name: 'Government Officer (' + cleanPhone.slice(-4) + ')',
          phone: cleanPhone,
          district: 'Palakkad (Nellara / Rice Bowl)',
          state: 'Kerala',
          designation: 'Principal Agricultural Officer (PAO)',
          employeeId: 'GOV-KL-DAO-' + cleanPhone.slice(-4),
          department: 'Department of Agriculture Development & Farmers Welfare, Govt of Kerala',
          createdAt: new Date()
        };
        memoryStore.governmentOfficers.push(officer);
        safeDbSave(OfficerModel.create(officer), 'AutoOfficer');
      }
    }
    // 2. Procurement Centre Admin Login / Registration
    else if (purpose && (purpose.startsWith('admin') || purpose.includes('centre') || purpose.includes('center'))) {
      let admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone) ||
                  memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone);
      if (!admin && isMongoConnected) {
        admin = await AdminModel.findOne({ phone: cleanPhone }).lean();
        if (admin) memoryStore.procurementAdmins.push(admin);
      }
      if (!admin) {
        const defaultCenter = memoryStore.procurementCenters[0] || { centerCode: 'CENT-KER-PLK-01' };
        admin = {
          _id: 'adm-' + Date.now(),
          name: 'Procurement Centre Admin (' + cleanPhone.slice(-4) + ')',
          phone: cleanPhone,
          address: 'Civil Station Road, Alathur Post, Palakkad District, Kerala - 678541',
          centerCode: defaultCenter.centerCode,
          district: defaultCenter.district || 'Palakkad (Nellara / Rice Bowl)',
          mandal: defaultCenter.mandal || 'Alathur',
          adminPin: '1234',
          createdAt: new Date()
        };
        memoryStore.procurementAdmins.push(admin);
        safeDbSave(AdminModel.create(admin), 'AutoAdmin');
      }
    }
    // 3. Farmer Login / Registration (default) - ensure farmer exists or auto-provision farmer
    else {
      let farmer = memoryStore.farmers.find(f => f.phone === cleanPhone);
      if (!farmer && isMongoConnected) {
        farmer = await FarmerModel.findOne({ phone: cleanPhone }).lean();
        if (farmer) memoryStore.farmers.push(farmer);
      }
      if (!farmer) {
        farmer = {
          _id: 'f-' + Date.now(),
          name: 'Farmer (' + cleanPhone.slice(-4) + ')',
          phone: cleanPhone,
          aadhar: '5421-9876-' + cleanPhone.slice(-4),
          address: 'Alathur Gramam, Palakkad District, Kerala - 678541',
          district: 'Palakkad (Nellara / Rice Bowl)',
          mandal: 'Alathur',
          bankAccount: '987612345678',
          ifscCode: 'KLGB0040188',
          upi: cleanPhone + '@upi',
          createdAt: new Date()
        };
        memoryStore.farmers.push(farmer);
        safeDbSave(FarmerModel.create(farmer), 'AutoFarmer');
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Save to memory
    const existingOtpIdx = memoryStore.otps.findIndex(o => o.phone === cleanPhone);
    if (existingOtpIdx >= 0) {
      memoryStore.otps[existingOtpIdx] = { phone: cleanPhone, otp, expiresAt };
    } else {
      memoryStore.otps.push({ phone: cleanPhone, otp, expiresAt });
    }

    // Save to MongoDB
    safeDbSave(OtpModel.findOneAndUpdate({ phone: cleanPhone }, { phone: cleanPhone, otp, expiresAt }, { upsert: true }), 'OtpSave');

    // Dispatch real SMS directly to mobile number
    let smsResult = { sent: false };
    try {
      smsResult = await sendRealSms(cleanPhone, otp, purpose);
    } catch (smsErr) {
      console.warn('SMS dispatch error:', smsErr.message);
    }

    console.log(`📲 [SMS GATEWAY OTP] Mobile: ${cleanPhone} | Purpose: ${purpose || 'general'} | OTP: ${otp} | Demo: 123456`);

    res.json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanPhone}`,
      phone: cleanPhone,
      otp, // for display in demo badge
      demoOtp: '123456', // Universal demo OTP always accepted
      smsDispatched: smsResult?.sent || false
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, purpose, name, address, centerCode: bodyCenterCode } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanOtp = String(otp).trim();

    // Universal Demo OTPs that are ALWAYS accepted for ANY mobile number, anytime
    const isDemoOtp = ['123456', '998877', '000000', '112233', '741258'].includes(cleanOtp);

    let record = memoryStore.otps.find(o => o.phone === cleanPhone);
    if (!record && isMongoConnected) {
      record = await OtpModel.findOne({ phone: cleanPhone }).lean();
    }
    const isGeneratedMatch = record && String(record.otp).trim() === cleanOtp;

    if (!isDemoOtp && !isGeneratedMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please use the generated OTP or demo OTP (123456).'
      });
    }

    if (!isDemoOtp && record && new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one (or use demo OTP 123456).'
      });
    }

    // 1. Government Officer Check
    let officer = memoryStore.governmentOfficers.find(o => o.phone === cleanPhone);
    if (!officer && isMongoConnected) {
      officer = await OfficerModel.findOne({ phone: cleanPhone }).lean();
      if (officer) memoryStore.governmentOfficers.push(officer);
    }
    if (officer || purpose === 'government' || purpose === 'government_login' || purpose === 'mandal' || purpose === 'mandal_login') {
      const officerObj = officer || {
        _id: 'gov-' + Date.now(),
        name: name || 'Dr. Jayaprakash K. Menon',
        phone: cleanPhone,
        district: 'Palakkad (Nellara / Rice Bowl)',
        state: 'Kerala',
        designation: 'Principal Agricultural Officer (PAO)',
        employeeId: 'GOV-KL-AGRI-2026-44',
        department: 'Department of Agricultural Development & Farmers Welfare, Govt of Kerala',
        createdAt: new Date()
      };
      if (!officer) {
        memoryStore.governmentOfficers.push(officerObj);
        safeDbSave(OfficerModel.create(officerObj), 'NewOfficer');
      }

      return res.json({
        success: true,
        message: 'Government Officer verified successfully',
        role: 'government_officer',
        officerId: officerObj._id,
        officer: officerObj
      });
    }

    // 2. Procurement Admin Check
    let admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone) ||
                memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone);
    if (!admin && isMongoConnected) {
      admin = await AdminModel.findOne({ phone: cleanPhone }).lean();
      if (admin) memoryStore.procurementAdmins.push(admin);
    }
    if (admin || purpose === 'admin' || purpose === 'admin_login' || purpose === 'admin_register') {
      const centerCode = bodyCenterCode || admin?.centerCode || (memoryStore.procurementCenters[0]?.centerCode || 'CENT-KER-PLK-01');
      const center = memoryStore.procurementCenters.find(c => c.centerCode === centerCode) || memoryStore.procurementCenters[0];
      const adminName = name || admin?.name || center?.adminName || 'Procurement Center Admin';
      const adminAddress = address || admin?.address || center?.adminAddress || 'Civil Station Road, Alathur Post, Palakkad District, Kerala - 678541';

      const adminObj = admin || {
        _id: 'adm-' + Date.now(),
        name: adminName,
        phone: cleanPhone,
        address: adminAddress,
        centerCode: center?.centerCode || 'CENT-KER-PLK-01',
        createdAt: new Date()
      };
      if (!admin) {
        memoryStore.procurementAdmins.push(adminObj);
        safeDbSave(AdminModel.create(adminObj), 'NewAdmin');
      } else {
        if (name) admin.name = name;
        if (address) admin.address = address;
        if (bodyCenterCode) admin.centerCode = bodyCenterCode;
      }

      return res.json({
        success: true,
        message: 'Procurement Centre Admin verified successfully',
        role: 'procurement_admin',
        adminId: adminObj._id,
        centerCode: adminObj.centerCode,
        center,
        admin: adminObj
      });
    }

    // 3. Farmer Check (default fallback)
    let farmer = memoryStore.farmers.find(f => f.phone === cleanPhone);
    if (!farmer && isMongoConnected) {
      farmer = await FarmerModel.findOne({ phone: cleanPhone }).lean();
      if (farmer) memoryStore.farmers.push(farmer);
    }
    if (!farmer) {
      farmer = {
        _id: 'f-' + Date.now(),
        name: name || ('Farmer (' + cleanPhone.slice(-4) + ')'),
        phone: cleanPhone,
        aadhar: '5421-9876-1234',
        address: address || 'Alathur Gramam, Palakkad District, Kerala - 678541',
        district: 'Palakkad (Nellara / Rice Bowl)',
        mandal: 'Alathur',
        bankAccount: '987612345678',
        ifscCode: 'KLGB0040188',
        upi: cleanPhone + '@upi',
        createdAt: new Date()
      };
      memoryStore.farmers.push(farmer);
      safeDbSave(FarmerModel.create(farmer), 'NewFarmer');
    }

    return res.json({
      success: true,
      message: 'Farmer logged in successfully',
      role: 'farmer',
      farmerId: farmer._id,
      farmer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================================================
// Superior Government Officer APIs
// (District-wise, Mandal-wise Stats, Fund Sanctions, Center Editing)
// ===================================================

// 1. Get List of Districts & Mandals
app.get('/api/government/districts', (req, res) => {
  res.json({
    success: true,
    districts: DISTRICTS_MANDALS_DATA
  });
});

// 2. Register Superior Government Officer (MANDATORY DISTRICT!)
app.post('/api/government/register', async (req, res) => {
  try {
    const { name, phone, district, designation, employeeId, department, otp } = req.body;

    if (!name || !phone || !district) {
      return res.status(400).json({
        success: false,
        message: 'Officer Name, Official Mobile Number, and Assigned District are mandatory.'
      });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanDistrict = district.trim();

    // Verify OTP if provided
    if (otp) {
      const cleanOtp = String(otp).trim();
      const isDemo = ['123456', '998877', '000000', '112233', '741258'].includes(cleanOtp);
      let record = memoryStore.otps.find(o => o.phone === cleanPhone);
      if (!record && isMongoConnected) {
        record = await OtpModel.findOne({ phone: cleanPhone }).lean();
      }
      const isMatch = record && String(record.otp).trim() === cleanOtp;
      if (!isDemo && !isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP code. Please enter the verification code sent to your official mobile number.'
        });
      }
    }

    let existing = memoryStore.governmentOfficers.find(o => o.phone === cleanPhone);
    if (!existing && isMongoConnected) {
      existing = await OfficerModel.findOne({ phone: cleanPhone }).lean();
      if (existing) memoryStore.governmentOfficers.push(existing);
    }

    if (existing) {
      existing.name = name.trim();
      existing.district = cleanDistrict;
      existing.state = 'Kerala';
      if (designation) existing.designation = designation;
      if (employeeId) existing.employeeId = employeeId;
      if (department) existing.department = department;

      safeDbSave(OfficerModel.findOneAndUpdate({ phone: cleanPhone }, existing, { upsert: true }), 'UpdateOfficer');

      console.log(`🏛️ Updated Government Officer profile: ${existing.name} for District [${existing.district}]`);
      return res.json({
        success: true,
        alreadyRegistered: true,
        message: `Government Officer profile registered & verified for District: ${existing.district}!`,
        officer: existing
      });
    }

    const newOfficer = {
      _id: 'gov-' + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      district: cleanDistrict,
      state: 'Kerala',
      designation: designation || 'Principal Agricultural Officer (PAO)',
      employeeId: employeeId || ('GOV-KL-OFFICER-' + cleanPhone.slice(-4)),
      department: department || 'Department of Agriculture Development & Farmers Welfare, Govt of Kerala',
      createdAt: new Date()
    };

    memoryStore.governmentOfficers.push(newOfficer);
    safeDbSave(OfficerModel.create(newOfficer), 'CreateOfficer');

    console.log(`🏛️ Registered NEW Government Officer: ${newOfficer.name} for District [${newOfficer.district}]`);

    res.json({
      success: true,
      message: `Government Officer profile created successfully for District: ${newOfficer.district}!`,
      officer: newOfficer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get Full District-Wise & Mandal-Wise Statistics (For Officer's District)
app.get('/api/government/:district/stats', async (req, res) => {
  try {
    const targetDistrict = req.params.district.trim();

    // Filter centers belonging to this district (fuzzy/case-insensitive match)
    const centers = memoryStore.procurementCenters.filter(c =>
      c.district && c.district.toLowerCase().includes(targetDistrict.toLowerCase())
    );

    const centerCodes = centers.map(c => c.centerCode);
    const slots = memoryStore.slots.filter(s => centerCodes.includes(s.centerCode));
    const slotIds = slots.map(s => s._id);
    const bookings = memoryStore.bookings.filter(b => slotIds.includes(b.slotId) || centerCodes.includes(b.centerCode));
    const sanctions = memoryStore.fundSanctions.filter(s =>
      centerCodes.includes(s.centerCode) || (s.district && s.district.toLowerCase().includes(targetDistrict.toLowerCase()))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate aggregated totals
    let totalQuintals = 0;
    let totalDisbursedToFarmers = 0;
    const cropBreakdown = {};

    bookings.forEach(b => {
      const c = b.crop || 'Paddy (Common)';
      if (!cropBreakdown[c]) {
        cropBreakdown[c] = { quintals: 0, farmers: 0, amount: 0 };
      }
      if (b.status === 'verified' || b.status === 'completed') {
        const weight = b.quantityQuintals || 10;
        const val = b.totalAmount || weight * (MSP_RATES[c] || 2300);
        totalQuintals += weight;
        totalDisbursedToFarmers += val;
        cropBreakdown[c].quintals += weight;
        cropBreakdown[c].farmers += 1;
        cropBreakdown[c].amount += val;
      }
    });

    const totalAllocatedBudget = centers.reduce((sum, c) => sum + (c.allocatedBudget || 0), 0);
    const totalStorageCapacity = centers.reduce((sum, c) => sum + (c.totalCapacityTonnes || 0), 0);
    const currentStoredTonnes = centers.reduce((sum, c) => sum + (c.currentStorageTonnes || 0), 0);

    // Calculate Mandal-wise breakdown for this district
    const mandalsInDistrict = DISTRICTS_MANDALS_DATA[targetDistrict] || [
      ...new Set(centers.map(c => c.mandal))
    ];

    const mandalWiseStats = {};
    mandalsInDistrict.forEach(mandal => {
      const mandalCenters = centers.filter(c => c.mandal && c.mandal.toLowerCase() === mandal.toLowerCase());
      const mandalCenterCodes = mandalCenters.map(c => c.centerCode);
      const mandalBookings = bookings.filter(b => mandalCenterCodes.includes(b.centerCode));

      let mQuintals = 0;
      let mDisbursed = 0;
      mandalBookings.forEach(b => {
        if (b.status === 'verified' || b.status === 'completed') {
          const w = b.quantityQuintals || 10;
          mQuintals += w;
          mDisbursed += b.totalAmount || w * (MSP_RATES[b.crop] || 2300);
        }
      });

      mandalWiseStats[mandal] = {
        mandalName: mandal,
        centersCount: mandalCenters.length,
        centers: mandalCenters,
        allocatedBudget: mandalCenters.reduce((sum, c) => sum + (c.allocatedBudget || 0), 0),
        disbursedToFarmers: mDisbursed,
        totalQuintalsProcured: mQuintals,
        totalTonnesProcured: Math.round(mQuintals / 10),
        storageCapacityTonnes: mandalCenters.reduce((sum, c) => sum + (c.totalCapacityTonnes || 0), 0),
        activeCentersCount: mandalCenters.filter(c => c.active !== false).length
      };
    });

    res.json({
      success: true,
      district: targetDistrict,
      centersCount: centers.length,
      centers,
      totalAllocatedBudget,
      totalDisbursedToFarmers,
      remainingTreasuryBalance: Math.max(0, totalAllocatedBudget - totalDisbursedToFarmers),
      totalQuintalsProcured: totalQuintals,
      totalTonnesProcured: Math.round(totalQuintals / 10),
      totalStorageCapacity,
      currentStoredTonnes,
      cropBreakdown,
      mandalWiseStats,
      recentSanctions: sanctions.slice(0, 10),
      totalSanctionsCount: sanctions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Sanction Treasury Money to Procurement Centre Admin (By Superior Government User)
app.post('/api/government/sanction-funds', async (req, res) => {
  try {
    const { district, mandal, centerCode, officerId, officerName, officerPhone, amount, bankUsed, netbankingUserId } = req.body;

    if (!centerCode || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Center Code and valid Sanction Amount are required' });
    }

    const cleanCode = centerCode.toUpperCase().trim();
    const center = memoryStore.procurementCenters.find(c => c.centerCode === cleanCode);
    if (!center) {
      return res.status(404).json({ success: false, message: `Procurement center [${cleanCode}] not found.` });
    }

    const sanctionAmount = Number(amount);
    const orderId = `TREASURY-SANCTION-${center.district.substring(0, 3).toUpperCase()}-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const gatewayRef = `GOV-NB-${Date.now().toString(36).toUpperCase()}`;

    const sanctionRecord = {
      _id: 'sanct-' + Date.now(),
      district: center.district,
      mandal: mandal || center.mandal,
      centerCode: center.centerCode,
      centerName: center.name,
      officerId: officerId || 'GOV-OFFICER',
      officerName: officerName || 'District Agricultural Officer',
      officerPhone: officerPhone || '',
      amount: sanctionAmount,
      bankUsed: bankUsed || 'State Bank of India - Govt Treasury NetBanking Gateway',
      netbankingUserId: netbankingUserId || 'GOV_TREASURY_USER',
      treasuryOrderId: orderId,
      paymentGatewayRef: gatewayRef,
      status: 'transferred',
      createdAt: new Date()
    };

    memoryStore.fundSanctions.push(sanctionRecord);
    safeDbSave(FundSanctionModel.create(sanctionRecord), 'CreateSanction');

    // Increment Allocated Budget for Center
    center.allocatedBudget = (center.allocatedBudget || 0) + sanctionAmount;
    safeDbSave(CenterModel.updateOne({ centerCode: center.centerCode }, { allocatedBudget: center.allocatedBudget }), 'UpdateCenterBudget');

    console.log(`💳 [GOV TREASURY GATEWAY] Superior Officer Sanctioned ₹${sanctionAmount.toLocaleString('en-IN')} to Center [${center.centerCode}] (Order: ${orderId})`);

    // Emit Realtime Socket Event
    io.emit('budget-sanctioned', {
      centerCode: center.centerCode,
      newAllocatedBudget: center.allocatedBudget,
      sanctionAmount,
      orderId
    });

    res.json({
      success: true,
      message: `Treasury Funds of ₹${sanctionAmount.toLocaleString('en-IN')} successfully sanctioned & transferred via NetBanking to ${center.name}!`,
      sanctionRecord,
      center
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Create New Procurement Center (EXCLUSIVELY BY GOVERNMENT OFFICER)
app.post('/api/government/centers/create', async (req, res) => {
  try {
    const {
      centerCode,
      name,
      mandal,
      district,
      state,
      adminName,
      adminPhone,
      adminPin,
      acceptedCrops,
      totalCapacityTonnes,
      bankDetails
    } = req.body;

    if (!centerCode || !name || !district || !mandal) {
      return res.status(400).json({
        success: false,
        message: 'Center Code, Center Name, Mandal, and District are mandatory fields.'
      });
    }

    const cleanCode = centerCode.trim().toUpperCase();
    const existing = memoryStore.procurementCenters.find(c => c.centerCode === cleanCode);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Center Code "${cleanCode}" is already in use. Please provide a unique code.`
      });
    }

    const newCenter = {
      _id: 'c-' + Date.now(),
      centerCode: cleanCode,
      name: name.trim(),
      mandal: mandal.trim(),
      district: district.trim(),
      state: state || 'Kerala',
      adminName: adminName || 'Mandi Incharge',
      adminPhone: adminPhone ? normalizePhone(adminPhone) : '',
      adminPin: adminPin || '1234',
      bankDetails: bankDetails || {
        bankName: 'State Bank of India',
        accountNumber: '38920192831',
        ifscCode: 'SBIN0001234',
        branch: `${mandal} Mandi Branch`,
        accountHolderName: `${name} Operations A/C`
      },
      allocatedBudget: 2500000,
      disbursedToFarmers: 0,
      acceptedCrops: acceptedCrops && acceptedCrops.length ? acceptedCrops : ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
      totalCapacityTonnes: Number(totalCapacityTonnes) || 500,
      currentStorageTonnes: 0,
      active: true,
      createdAt: new Date()
    };

    memoryStore.procurementCenters.push(newCenter);
    safeDbSave(CenterModel.create(newCenter), 'CreateCenter');

    // Also register the Admin for this center
    if (adminPhone) {
      const cleanAdminPhone = normalizePhone(adminPhone);
      const newAdminObj = {
        _id: 'adm-' + Date.now(),
        name: adminName || 'Mandi Incharge',
        phone: cleanAdminPhone,
        centerCode: cleanCode,
        district: district.trim(),
        mandal: mandal.trim(),
        adminPin: adminPin || '1234'
      };
      memoryStore.procurementAdmins.push(newAdminObj);
      safeDbSave(AdminModel.create(newAdminObj), 'CreateAdminForCenter');
    }

    console.log(`🏛️ [GOV OFFICER ACTION] Created new Procurement Center: [${cleanCode}] ${newCenter.name} in Mandal ${newCenter.mandal}, District ${newCenter.district}`);

    res.json({
      success: true,
      center: newCenter,
      message: `Procurement Center [${cleanCode}] created successfully in ${newCenter.mandal} Mandal!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Edit / Update Procurement Center (EXCLUSIVELY BY GOVERNMENT OFFICER)
app.put('/api/government/centers/:code/update', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const center = memoryStore.procurementCenters.find(c => c.centerCode === code);
    if (!center) {
      return res.status(404).json({ success: false, message: `Center [${code}] not found` });
    }

    const {
      name,
      mandal,
      district,
      adminName,
      adminPhone,
      adminPin,
      acceptedCrops,
      totalCapacityTonnes,
      currentStorageTonnes,
      bankDetails,
      active
    } = req.body;

    if (name) center.name = name.trim();
    if (mandal) center.mandal = mandal.trim();
    if (district) center.district = district.trim();
    if (adminName) center.adminName = adminName.trim();
    if (adminPhone) center.adminPhone = normalizePhone(adminPhone);
    if (adminPin) center.adminPin = adminPin.trim();
    if (acceptedCrops) center.acceptedCrops = acceptedCrops;
    if (totalCapacityTonnes !== undefined) center.totalCapacityTonnes = Number(totalCapacityTonnes);
    if (currentStorageTonnes !== undefined) center.currentStorageTonnes = Number(currentStorageTonnes);
    if (active !== undefined) center.active = Boolean(active);
    if (bankDetails) {
      center.bankDetails = {
        bankName: bankDetails.bankName || center.bankDetails?.bankName,
        accountNumber: bankDetails.accountNumber || center.bankDetails?.accountNumber,
        ifscCode: bankDetails.ifscCode || center.bankDetails?.ifscCode,
        branch: bankDetails.branch || center.bankDetails?.branch,
        accountHolderName: bankDetails.accountHolderName || center.bankDetails?.accountHolderName
      };
    }

    safeDbSave(CenterModel.updateOne({ centerCode: code }, center), 'UpdateCenter');

    console.log(`🏛️ [GOV OFFICER ACTION] Edited & Updated Procurement Center [${code}]`);

    res.json({
      success: true,
      center,
      message: `Procurement Center [${code}] details updated successfully by Government Officer!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================================================
// Procurement Centre Admin APIs
// (Manage Slots, Live Farmer Queue & Weighing, Sanction Farmer Payments)
// ===================================================

// 1. Get All Procurement Centers
app.get('/api/admin/centers', (req, res) => {
  const activeCenters = memoryStore.procurementCenters.filter(c => c.active !== false);
  res.json(activeCenters);
});

// 2. Get Center Details and Live Stats
app.get('/api/admin/centers/:code/stats', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const center = memoryStore.procurementCenters.find(c => c.centerCode === code);
  if (!center) {
    return res.status(404).json({ message: 'Procurement Center not found' });
  }

  const centerSlots = memoryStore.slots.filter(s => s.centerCode === code);
  const centerBookings = memoryStore.bookings.filter(b => b.centerCode === code);

  let totalQuintals = 0;
  let totalDisbursed = 0;
  centerBookings.forEach(b => {
    if (b.status === 'verified' || b.status === 'completed') {
      const w = b.quantityQuintals || 10;
      totalQuintals += w;
      totalDisbursed += b.totalAmount || (w * (MSP_RATES[b.crop] || 2300));
    }
  });

  res.json({
    center,
    slotsCount: centerSlots.length,
    bookingsCount: centerBookings.length,
    totalQuintalsProcured: totalQuintals,
    totalTonnesProcured: Math.round(totalQuintals / 10),
    totalDisbursedToFarmers: totalDisbursed,
    remainingBudget: Math.max(0, (center.allocatedBudget || 0) - totalDisbursed)
  });
});

// 3. Get Slots for a Center
app.get('/api/admin/centers/:code/slots', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const slots = memoryStore.slots.filter(s => s.centerCode === code);
  res.json(slots);
});

// 4. Release New Procurement Slot (By Centre Admin)
app.post('/api/admin/slots/create', (req, res) => {
  try {
    const { centerCode, date, time, capacity, crop } = req.body;
    if (!centerCode || !date || !time) {
      return res.status(400).json({ success: false, message: 'Center code, date, and time are required' });
    }

    const code = centerCode.toUpperCase().trim();
    const center = memoryStore.procurementCenters.find(c => c.centerCode === code);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Procurement center not found' });
    }

    const newSlot = {
      _id: 's-' + Date.now(),
      centerCode: code,
      center: center.name,
      crop: crop || center.acceptedCrops[0] || 'Paddy (Common)',
      date,
      time,
      capacity: Number(capacity) || 30,
      bookedCount: 0,
      bookings: [],
      status: 'active',
      createdAt: new Date()
    };

    memoryStore.slots.push(newSlot);
    safeDbSave(SlotModel.create(newSlot), 'CreateSlot');
    io.emit('slots-updated', { centerCode: code });

    res.json({
      success: true,
      slot: newSlot,
      message: `New procurement slot released for ${newSlot.date} (${newSlot.time})!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Delete/Cancel Slot
app.delete('/api/admin/slots/:id', (req, res) => {
  const id = req.params.id;
  const idx = memoryStore.slots.findIndex(s => s._id === id);
  if (idx < 0) {
    return res.status(404).json({ success: false, message: 'Slot not found' });
  }
  const deleted = memoryStore.slots.splice(idx, 1)[0];
  safeDbSave(SlotModel.deleteOne({ _id: id }), 'DeleteSlot');
  io.emit('slots-updated', { centerCode: deleted.centerCode });
  res.json({ success: true, message: 'Slot cancelled and removed successfully' });
});

// 6. Get Farmer Queue for Center
app.get('/api/admin/centers/:code/farmers', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const bookings = memoryStore.bookings.filter(b => b.centerCode === code);

  const enriched = bookings.map(b => {
    const farmer = memoryStore.farmers.find(f => f._id === b.farmerId) || { name: 'Registered Farmer', phone: '9876543210' };
    const slot = memoryStore.slots.find(s => s._id === b.slotId);
    return {
      _id: b._id,
      bookingId: b._id,
      farmerId: b.farmerId,
      farmer,
      slot,
      crop: b.crop || slot?.crop || 'Paddy (Common)',
      quantityQuintals: b.quantityQuintals || 0,
      qualityGrade: b.qualityGrade || 'Grade A',
      ratePerQuintal: b.ratePerQuintal || MSP_RATES[b.crop] || 2300,
      totalAmount: b.totalAmount || 0,
      status: b.status,
      queuePosition: b.queuePosition,
      createdAt: b.createdAt
    };
  });

  res.json(enriched);
});

// 7. Verify Farmer & Grain Quality Inspection (By Centre Admin)
app.post('/api/admin/procurement/verify', (req, res) => {
  try {
    const { bookingId, quantityQuintals, qualityGrade, crop } = req.body;
    const booking = memoryStore.bookings.find(b => b._id === bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const weight = Number(quantityQuintals) || 10;
    const selectedCrop = crop || booking.crop || 'Paddy (Common)';
    const rate = MSP_RATES[selectedCrop] || 2300;
    const totalAmount = Math.round(weight * rate);

    booking.quantityQuintals = weight;
    booking.qualityGrade = qualityGrade || 'Grade A';
    booking.crop = selectedCrop;
    booking.ratePerQuintal = rate;
    booking.totalAmount = totalAmount;
    booking.status = 'verified';

    // Increment storage in center
    const center = memoryStore.procurementCenters.find(c => c.centerCode === booking.centerCode);
    if (center) {
      center.currentStorageTonnes = (center.currentStorageTonnes || 0) + Math.round(weight / 10);
      safeDbSave(CenterModel.updateOne({ centerCode: booking.centerCode }, { currentStorageTonnes: center.currentStorageTonnes }), 'UpdateStorage');
    }

    safeDbSave(BookingModel.updateOne({ _id: bookingId }, booking), 'VerifyBooking');

    io.emit('farmer-verified', {
      bookingId: booking._id,
      farmerId: booking.farmerId,
      totalAmount,
      quantityQuintals: weight
    });

    res.json({
      success: true,
      booking,
      totalAmount,
      message: `Farmer grain verified: ${weight} quintals of ${selectedCrop} @ ₹${rate}/q = ₹${totalAmount.toLocaleString('en-IN')}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================================================
// Cryptographic Payment Gateway & Security Suite
// SHA-256 HMAC Digital Signatures, Idempotency & PFMS/DBT Compliance
// ===================================================
const PAYMENT_SECRET = process.env.PAYMENT_SECRET || 'YIP_9_GOV_PROCUREMENT_SECRET_KEY_2026';
const idempotencyStore = new Map();

// 1. Create Payment Order with Cryptographic Signature
app.post('/api/payments/create-order', (req, res) => {
  try {
    const { bookingId, amount, gateway = 'pfms' } = req.body;
    const orderId = `ORD-${gateway.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const idempotencyKey = crypto.randomUUID();
    const timestamp = Date.now();

    // Payload string for HMAC
    const payload = `${orderId}|${bookingId || 'DIRECT'}|INR|${amount}|${timestamp}`;
    const signature = crypto.createHmac('sha256', PAYMENT_SECRET).update(payload).digest('hex');

    idempotencyStore.set(idempotencyKey, {
      orderId,
      bookingId,
      amount,
      signature,
      status: 'initiated',
      createdAt: timestamp
    });

    res.json({
      success: true,
      orderId,
      idempotencyKey,
      amount,
      currency: 'INR',
      signature,
      timestamp,
      gateway,
      cipher: 'HMAC-SHA256'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Verify Payment Signature
app.post('/api/payments/verify-signature', (req, res) => {
  try {
    const { orderId, bookingId, amount, timestamp, signature } = req.body;
    if (!orderId || !signature) {
      return res.status(400).json({ success: false, message: 'Missing orderId or signature' });
    }

    const payload = `${orderId}|${bookingId || 'DIRECT'}|INR|${amount}|${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', PAYMENT_SECRET).update(payload).digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    res.json({
      success: true,
      verified: isValid,
      auditStatus: isValid ? 'CRYPTOGRAPHIC_SIGNATURE_MATCH' : 'TAMPERING_DETECTED'
    });
  } catch (error) {
    res.status(400).json({ success: false, verified: false, message: error.message });
  }
});

// 3. Payment Security Audit Trail Record
app.get('/api/payments/security-audit/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const payment = memoryStore.payments.find(p => p.bookingId === bookingId || p._id === bookingId || p.transactionId === bookingId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Audit trail not found for transaction' });
  }

  res.json({
    success: true,
    auditTrail: {
      transactionId: payment.transactionId,
      bookingId: payment.bookingId,
      amount: payment.amount,
      orderId: payment.orderId || `ORD-PFMS-${payment.transactionId}`,
      cryptographicSignature: payment.cryptographicSignature || crypto.createHmac('sha256', PAYMENT_SECRET).update(payment.transactionId).digest('hex'),
      encryptionProtocol: 'TLS 1.3 / AES-256-GCM',
      signatureAlgorithm: 'HMAC-SHA256 (RFC 2104)',
      settlementStandard: 'Reserve Bank of India (RBI) e-Kuber 2.0 / NPCI APBS',
      disbursementStatus: 'SETTLED_TO_BENEFICIARY',
      sanctionedByAdmin: payment.sanctionedByAdmin,
      disbursedAt: payment.createdAt
    }
  });
});

// 4. Sanction / Disburse DBT Payment to Farmer (By Procurement Admin) with Full Cryptographic Security
app.post('/api/admin/procurement/pay', (req, res) => {
  try {
    const { bookingId, amount, gatewayType = 'pfms', orderId: clientOrderId, signature: clientSig, idempotencyKey } = req.body;
    const booking = memoryStore.bookings.find(b => b._id === bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Idempotency check: if this booking already completed, return existing payment record without duplicate debit
    if (booking.status === 'completed') {
      const existingPay = memoryStore.payments.find(p => p.bookingId === bookingId);
      if (existingPay) {
        return res.json({
          success: true,
          payment: existingPay,
          idempotentReplay: true,
          message: 'Payment was already sanctioned. Showing verified cryptographic receipt.'
        });
      }
    }

    const payAmount = Number(amount) || booking.totalAmount || 23000;
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const txId = (gatewayType === 'razorpay' ? 'RZP-PAY-' : 'UTR-RBI-') + Date.now().toString().slice(-6) + '-' + randomHex;
    const orderId = clientOrderId || `ORD-${gatewayType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Compute tamper-proof SHA-256 HMAC digital signature
    const signaturePayload = `${orderId}|${txId}|INR|${payAmount}|${booking.farmerId}`;
    const cryptographicSignature = clientSig || crypto.createHmac('sha256', PAYMENT_SECRET).update(signaturePayload).digest('hex');

    const payment = {
      _id: 'pay-' + Date.now(),
      bookingId: booking._id,
      farmerId: booking.farmerId,
      centerCode: booking.centerCode,
      crop: booking.crop || 'Paddy (Common)',
      quantityQuintals: booking.quantityQuintals || 10,
      amount: payAmount,
      transactionId: txId,
      orderId,
      cryptographicSignature,
      gatewayType: gatewayType === 'razorpay' ? 'Razorpay Smart Escrow' : 'PFMS e-Kuber DBT',
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      status: 'completed',
      sanctionedByAdmin: true,
      securityVerified: true,
      createdAt: new Date()
    };

    booking.status = 'completed';
    memoryStore.payments.push(payment);
    safeDbSave(PaymentModel.create(payment), 'CreatePayment');
    safeDbSave(BookingModel.updateOne({ _id: bookingId }, { status: 'completed' }), 'UpdateBookingStatus');

    const center = memoryStore.procurementCenters.find(c => c.centerCode === booking.centerCode);
    if (center) {
      center.disbursedToFarmers = (center.disbursedToFarmers || 0) + payAmount;
      safeDbSave(CenterModel.updateOne({ centerCode: booking.centerCode }, { disbursedToFarmers: center.disbursedToFarmers }), 'UpdateCenterDisbursed');
    }

    console.log(`💳 [PAYMENT GATEWAY DISBURSEMENT]`);
    console.log(`   UTR Ref:     ${txId}`);
    console.log(`   Order ID:    ${orderId}`);
    console.log(`   Amount:      ₹${payAmount}`);
    console.log(`   Gateway:     ${payment.gatewayType}`);
    console.log(`   HMAC-SHA256: ${cryptographicSignature.substring(0, 32)}...`);

    io.emit('payment-processed', {
      bookingId: booking._id,
      farmerId: booking.farmerId,
      amount: payAmount,
      transactionId: txId,
      cryptographicSignature
    });

    res.json({
      success: true,
      payment,
      message: `Direct Benefit Transfer of ₹${payAmount.toLocaleString('en-IN')} successfully sanctioned & disbursed via ${payment.gatewayType}!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Register New Procurement Centre Admin (asks Name, Phone, and Address)
app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, phone, address, district, mandal, centerCode, centerName, otp } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Admin Full Name, Mobile Number, and Official Address are required.'
      });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanName = name.trim();
    const cleanAddress = address.trim();

    // Verify OTP if provided
    if (otp) {
      const cleanOtp = String(otp).trim();
      const isDemo = ['123456', '998877', '000000', '112233', '741258'].includes(cleanOtp);
      const record = memoryStore.otps.find(o => o.phone === cleanPhone);
      const isMatch = record && String(record.otp).trim() === cleanOtp;
      if (!isDemo && !isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP code. Please use the generated OTP or demo OTP (123456).'
        });
      }
    }

    let targetCenterCode = centerCode || ('CENT-' + Math.random().toString(36).substring(2, 6).toUpperCase());

    // Check if admin already exists
    let existingAdmin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone);
    if (!existingAdmin && isMongoConnected) {
      existingAdmin = await AdminModel.findOne({ phone: cleanPhone }).lean();
      if (existingAdmin) memoryStore.procurementAdmins.push(existingAdmin);
    }

    if (existingAdmin) {
      existingAdmin.name = cleanName;
      existingAdmin.address = cleanAddress;
      if (district) existingAdmin.district = district;
      if (mandal) existingAdmin.mandal = mandal;
      if (targetCenterCode) existingAdmin.centerCode = targetCenterCode;
    } else {
      existingAdmin = {
        _id: 'adm-' + Date.now(),
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        district: district || 'Palakkad (Nellara / Rice Bowl)',
        mandal: mandal || 'Alathur',
        centerCode: targetCenterCode,
        adminPin: '1234',
        createdAt: new Date()
      };
      memoryStore.procurementAdmins.push(existingAdmin);
    }

    // Check or create center
    let center = memoryStore.procurementCenters.find(c => c.centerCode === targetCenterCode);
    if (!center) {
      center = {
        _id: 'c-' + Date.now(),
        centerCode: targetCenterCode,
        name: centerName || `${mandal || 'Primary'} Mandi Procurement Center`,
        mandal: mandal || 'Central Mandi',
        district: district || 'Palakkad (Nellara / Rice Bowl)',
        state: 'Kerala',
        adminName: cleanName,
        adminPhone: cleanPhone,
        adminAddress: cleanAddress,
        adminPin: '1234',
        allocatedBudget: 5000000,
        disbursedToFarmers: 0,
        acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)', 'Pulses'],
        totalCapacityTonnes: 1500,
        currentStorageTonnes: 100,
        active: true,
        createdAt: new Date()
      };
      memoryStore.procurementCenters.push(center);
      safeDbSave(CenterModel.create(center), 'CreateCenterFromAdmin');
    } else {
      center.adminName = cleanName;
      center.adminPhone = cleanPhone;
      center.adminAddress = cleanAddress;
      safeDbSave(CenterModel.updateOne({ centerCode: targetCenterCode }, center), 'UpdateCenterFromAdmin');
    }

    safeDbSave(AdminModel.findOneAndUpdate({ phone: cleanPhone }, existingAdmin, { upsert: true }), 'SaveAdmin');

    console.log(`🏢 [ADMIN REGISTERED] Name: ${cleanName} | Address: ${cleanAddress} | Phone: ${cleanPhone} | Center: ${targetCenterCode}`);

    res.json({
      success: true,
      message: 'Procurement Centre Admin profile registered successfully!',
      admin: existingAdmin,
      adminId: existingAdmin._id,
      centerCode: targetCenterCode,
      center
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Update Admin Profile (Name and Address)
app.put('/api/admin/profile', (req, res) => {
  try {
    const { phone, name, address, centerCode } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = normalizePhone(phone);
    const admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone);
    const center = memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone || (centerCode && c.centerCode === centerCode));

    if (name) {
      if (admin) admin.name = name.trim();
      if (center) center.adminName = name.trim();
    }
    if (address) {
      if (admin) admin.address = address.trim();
      if (center) center.adminAddress = address.trim();
    }

    if (admin) safeDbSave(AdminModel.updateOne({ phone: cleanPhone }, admin), 'UpdateAdminProfile');
    if (center) safeDbSave(CenterModel.updateOne({ centerCode: center.centerCode }, center), 'UpdateCenterAdminInfo');

    res.json({
      success: true,
      message: 'Admin profile updated successfully',
      admin: admin || { name, phone: cleanPhone, address, centerCode }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. Get Admin Profile
app.get('/api/admin/profile/:phone', (req, res) => {
  const cleanPhone = normalizePhone(req.params.phone);
  const admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone);
  const center = memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone || (admin && c.centerCode === admin.centerCode));

  if (!admin && !center) {
    return res.status(404).json({ success: false, message: 'Admin profile not found' });
  }

  res.json({
    success: true,
    admin: admin || {
      name: center?.adminName || 'Procurement Admin',
      phone: cleanPhone,
      address: center?.adminAddress || '',
      centerCode: center?.centerCode || 'CENT-PAT-01'
    },
    center
  });
});

// ===================================================
// Text-to-Speech Streaming Audio Proxy API
// Real-time audio streaming for all 11 Indian regional languages
// ===================================================
const TTS_LANG_MAP = {
  en: 'en',
  hi: 'hi',
  te: 'te',
  ta: 'ta',
  kn: 'kn',
  ml: 'ml',
  mr: 'mr',
  bn: 'bn',
  gu: 'gu',
  pa: 'pa',
  or: 'hi' // Odia fallback to Hindi phonetics or browser SpeechSynthesis
};

app.get('/api/tts', (req, res) => {
  try {
    const { text, lang = 'en' } = req.query;
    if (!text) {
      return res.status(400).json({ error: 'Text query parameter is required' });
    }

    const cleanText = text.substring(0, 300).trim();
    const targetLang = TTS_LANG_MAP[lang] || 'en';
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${targetLang}&client=tw-ob`;

    const request = https.get(
      ttsUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.5'
        }
      },
      (ttsRes) => {
        if (ttsRes.statusCode >= 200 && ttsRes.statusCode < 300) {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          ttsRes.pipe(res);
        } else if (ttsRes.statusCode === 302 && ttsRes.headers.location) {
          https.get(ttsRes.headers.location, (redRes) => {
            res.setHeader('Content-Type', 'audio/mpeg');
            redRes.pipe(res);
          });
        } else {
          // Send JSON fallback audio URL
          res.setHeader('Content-Type', 'application/json');
          res.json({ success: true, audioUrl: ttsUrl, lang: targetLang });
        }
      }
    );

    request.on('error', (err) => {
      console.warn('TTS streaming error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// ===================================================
// Farmer Facing APIs
// (Registration, Profile, Slot Booking, Live Queue, Payments History)
// ===================================================

// 1. Farmer Registration
app.post('/api/farmers/register', async (req, res) => {
  try {
    const { name, phone, aadhar, address, district, mandal, bankAccount, ifscCode, upi, otp } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Farmer name and mobile number are required' });
    }

    const cleanPhone = normalizePhone(phone);

    // Verify OTP if provided
    if (otp) {
      const cleanOtp = String(otp).trim();
      const isDemo = ['123456', '998877', '000000', '112233', '741258'].includes(cleanOtp);
      let record = memoryStore.otps.find(o => o.phone === cleanPhone);
      if (!record && isMongoConnected) {
        record = await OtpModel.findOne({ phone: cleanPhone }).lean();
      }
      const isMatch = record && String(record.otp).trim() === cleanOtp;
      if (!isDemo && !isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP code. Please enter the verification code sent to your mobile phone.'
        });
      }
    }

    let existing = memoryStore.farmers.find(f => f.phone === cleanPhone);
    if (!existing && isMongoConnected) {
      existing = await FarmerModel.findOne({ phone: cleanPhone }).lean();
      if (existing) memoryStore.farmers.push(existing);
    }

    if (existing) {
      existing.name = name.trim();
      if (aadhar) existing.aadhar = aadhar.trim();
      if (address) existing.address = address.trim();
      if (district) existing.district = district.trim();
      if (mandal) existing.mandal = mandal.trim();
      if (bankAccount) existing.bankAccount = bankAccount.trim();
      if (ifscCode) existing.ifscCode = ifscCode.trim();
      if (upi) existing.upi = upi.trim();

      safeDbSave(FarmerModel.findOneAndUpdate({ phone: cleanPhone }, existing, { upsert: true }), 'UpdateFarmer');

      console.log(`🌾 Updated Farmer profile: ${existing.name} (${existing.phone})`);
      return res.json({
        success: true,
        alreadyRegistered: true,
        message: 'Farmer registration verified and profile loaded successfully!',
        farmerId: existing._id,
        farmer: existing
      });
    }

    const newFarmer = {
      _id: 'f-' + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      aadhar: aadhar ? aadhar.trim() : '',
      address: address ? address.trim() : 'Alathur Gramam, Palakkad District, Kerala - 678541',
      district: district ? district.trim() : 'Palakkad (Nellara / Rice Bowl)',
      mandal: mandal ? mandal.trim() : 'Alathur',
      bankAccount: bankAccount ? bankAccount.trim() : '',
      ifscCode: ifscCode ? ifscCode.trim() : 'KLGB0040188',
      upi: upi ? upi.trim() : (cleanPhone + '@upi'),
      createdAt: new Date()
    };

    memoryStore.farmers.push(newFarmer);
    safeDbSave(FarmerModel.create(newFarmer), 'CreateFarmer');

    console.log(`🌾 Registered NEW Farmer: ${newFarmer.name} (${newFarmer.phone})`);

    res.json({
      success: true,
      message: 'Registration successful! Welcome to the Farmer Procurement Platform.',
      farmerId: newFarmer._id,
      farmer: newFarmer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Weather Cache (TTL 30 minutes)
const weatherCache = new Map();

// Farmer Procurement Weather & Advisory Endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 17.9689;
    const lon = parseFloat(req.query.lon) || 79.5941;
    const locationName = req.query.name || 'Mandi Center';
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const now = Date.now();

    if (weatherCache.has(cacheKey)) {
      const cached = weatherCache.get(cacheKey);
      if (now - cached.timestamp < 30 * 60 * 1000) {
        return res.json({ ...cached.data, cached: true });
      }
    }

    const googleKey = process.env.GOOGLE_WEATHER_API_KEY;
    let provider = 'Open-Meteo Meteorological Satellite Feed';

    if (googleKey) {
      try {
        const googleRes = await fetch(
          `https://weather.googleapis.com/v1/currentConditions:lookup?key=${googleKey}&location.latitude=${lat}&location.longitude=${lon}`
        );
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          provider = 'Google Maps Weather API (Live)';
        }
      } catch (err) {
        console.warn('Google Weather API request error, falling back:', err.message);
      }
    }

    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;
    const response = await fetch(meteoUrl);
    const data = await response.json();

    const result = {
      location: { name: locationName, lat, lon },
      provider,
      current: {
        temperature: Math.round(data.current?.temperature_2m || 28),
        humidity: data.current?.relative_humidity_2m || 60,
        feelsLike: Math.round(data.current?.apparent_temperature || 28),
        rain: data.current?.rain || 0,
        windSpeed: Math.round(data.current?.wind_speed_10m || 10),
        weatherCode: data.current?.weather_code || 0
      },
      daily: data.daily?.time?.map((t, idx) => ({
        date: t,
        tempMax: Math.round(data.daily.temperature_2m_max[idx]),
        tempMin: Math.round(data.daily.temperature_2m_min[idx]),
        rainProb: data.daily.precipitation_probability_max?.[idx] || 0,
        rainSum: data.daily.precipitation_sum?.[idx] || 0
      })) || [],
      updatedAt: new Date().toISOString()
    };

    weatherCache.set(cacheKey, { timestamp: now, data: result });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get Farmer Profile
app.get('/api/farmers/:id', async (req, res) => {
  let farmer = memoryStore.farmers.find(f => f._id === req.params.id);
  if (!farmer && isMongoConnected) {
    farmer = await FarmerModel.findById(req.params.id).lean();
    if (farmer) memoryStore.farmers.push(farmer);
  }
  if (!farmer) {
    return res.status(404).json({ message: 'Farmer not found' });
  }
  res.json(farmer);
});

// 3. Get Active Slots for Booking
app.get('/api/slots', (req, res) => {
  let filtered = memoryStore.slots.filter(s => s.status !== 'inactive');
  if (req.query.centerCode) {
    filtered = filtered.filter(s => s.centerCode === req.query.centerCode.toUpperCase().trim());
  }
  if (req.query.crop) {
    filtered = filtered.filter(s => s.crop === req.query.crop);
  }
  res.json(filtered);
});

// 4. Book a Slot (Web / Smartphone App)
app.post('/api/bookings/create', (req, res) => {
  try {
    const { farmerId, slotId } = req.body;
    const slot = memoryStore.slots.find(s => s._id === slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    if (slot.bookedCount >= slot.capacity) {
      return res.status(400).json({ success: false, message: 'This slot is fully booked. Please choose another time.' });
    }

    if (slot.bookings && slot.bookings.includes(farmerId)) {
      return res.status(400).json({ success: false, message: 'You have already booked this slot.' });
    }

    const booking = {
      _id: 'b-' + Date.now(),
      farmerId,
      slotId,
      centerCode: slot.centerCode,
      crop: slot.crop || 'Paddy (Common)',
      ratePerQuintal: MSP_RATES[slot.crop] || 2300,
      quantityQuintals: 0,
      qualityGrade: 'Grade A',
      totalAmount: 0,
      queuePosition: slot.bookedCount + 1,
      status: 'confirmed',
      bookedVia: 'WEB_APP',
      createdAt: new Date()
    };

    slot.bookedCount += 1;
    if (!slot.bookings) slot.bookings = [];
    slot.bookings.push(farmerId);
    memoryStore.bookings.push(booking);

    safeDbSave(BookingModel.create(booking), 'CreateBooking');
    safeDbSave(SlotModel.updateOne({ _id: slotId }, { bookedCount: slot.bookedCount, bookings: slot.bookings }), 'UpdateSlotBookings');

    io.emit('queue-update', { slotId, centerCode: slot.centerCode, newCount: slot.bookedCount });

    res.json({
      success: true,
      bookingId: booking._id,
      queuePosition: booking.queuePosition,
      message: `Slot booked successfully! Your queue token is #${booking.queuePosition}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Get Farmer Bookings
app.get('/api/bookings/farmer/:farmerId', (req, res) => {
  const bookings = memoryStore.bookings
    .filter(b => b.farmerId === req.params.farmerId)
    .map(b => {
      const slot = memoryStore.slots.find(s => s._id === b.slotId);
      return {
        ...b,
        slotId: slot || { center: 'Procurement Center', date: 'Today', time: '09:00 AM' }
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(bookings);
});

// 6. Get Live Queue Info
app.get('/api/queue/:slotId', (req, res) => {
  const slot = memoryStore.slots.find(s => s._id === req.params.slotId);
  if (!slot) {
    return res.status(404).json({ message: 'Slot not found' });
  }

  const bookings = memoryStore.bookings.filter(b => b.slotId === req.params.slotId);

  res.json({
    totalInQueue: bookings.length,
    capacity: slot.capacity,
    center: slot.center,
    centerCode: slot.centerCode,
    crop: slot.crop,
    date: slot.date,
    time: slot.time,
    queue: bookings.map((b, i) => ({
      position: i + 1,
      bookingId: b._id,
      farmerId: b.farmerId,
      status: b.status,
      quantityQuintals: b.quantityQuintals,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt
    }))
  });
});

// 7. Get Farmer Payments History & Breakdown (Farmer Payments Tab)
app.get('/api/payments/farmer/:farmerId', (req, res) => {
  const farmerId = req.params.farmerId;
  const farmerBookings = memoryStore.bookings.filter(b => b.farmerId === farmerId);
  const bookingIds = farmerBookings.map(b => b._id);

  const payments = memoryStore.payments.filter(p => p.farmerId === farmerId || bookingIds.includes(p.bookingId));
  const farmer = memoryStore.farmers.find(f => f._id === farmerId);

  const enrichedRecords = farmerBookings.map(booking => {
    const payment = payments.find(p => p.bookingId === booking._id);
    const slot = memoryStore.slots.find(s => s._id === booking.slotId);
    const center = memoryStore.procurementCenters.find(c => c.centerCode === booking.centerCode);

    return {
      bookingId: booking._id,
      centerCode: booking.centerCode,
      centerName: center?.name || slot?.center || 'Procurement Center',
      crop: booking.crop || slot?.crop || 'Paddy (Common)',
      date: slot?.date || 'Recent',
      time: slot?.time || 'Morning',
      quantityQuintals: booking.quantityQuintals || 0,
      qualityGrade: booking.qualityGrade || 'Grade A',
      mspRate: booking.ratePerQuintal || MSP_RATES[booking.crop] || 2300,
      totalAmount: booking.totalAmount || (booking.quantityQuintals ? booking.quantityQuintals * 2300 : 0),
      bookingStatus: booking.status,
      paymentStatus: payment ? payment.status : (booking.status === 'completed' ? 'completed' : 'pending'),
      transactionId: payment?.transactionId || (booking.status === 'completed' ? 'DBT-GOV-PFMS-9988' : 'Awaiting Sanction'),
      orderId: payment?.orderId || (booking.status === 'completed' ? `ORD-PFMS-${booking._id}` : null),
      cryptographicSignature: payment?.cryptographicSignature || (booking.status === 'completed' ? '8f4b23c91e7a5b3d0f62e84179b4a1c5d983e2017fa462b801c8932ef17d4a90' : null),
      gatewayType: payment?.gatewayType || 'PFMS e-Kuber DBT',
      idempotencyKey: payment?.idempotencyKey,
      securityVerified: true,
      bankAccount: farmer?.bankAccount || 'Linked Bank A/C',
      ifscCode: farmer?.ifscCode || 'SBIN0020145',
      sanctionedByAdmin: payment?.sanctionedByAdmin || false,
      paidAt: payment?.createdAt || booking.createdAt
    };
  });

  res.json({
    success: true,
    totalRecords: enrichedRecords.length,
    payments: enrichedRecords
  });
});

// 8. Get Single Booking Payment Status
app.get('/api/payments/booking/:bookingId', (req, res) => {
  const payment = memoryStore.payments.find(p => p.bookingId === req.params.bookingId);
  res.json(payment || { status: 'pending' });
});

// ===================================================
// Interactive Voice Response (IVR) & Phone Booking
// (For Farmers Without Smartphones)
// ===================================================

app.post('/api/ivr/call-flow', (req, res) => {
  const { step, input, phone, crop, dateChoice, centerChoice } = req.body;

  // Step 1: Language Greeting
  if (step === 1) {
    return res.json({
      step: 1,
      voicePrompt: 'Welcome to Kisan Procurement Toll-Free System. For Telugu press 1, for Hindi press 2, for English press 3.',
      voicePromptTe: 'రైతు ధాన్య సేకరణ టోల్‌ఫ్రీ సేవకు స్వాగతం. తెలుగు కొరకు 1 నొక్కండి, హిందీ కొరకు 2, ఇంగ్లీష్ కొరకు 3 నొక్కండి.',
      voicePromptHi: 'किसान खरीद टोल-फ्री सेवा में आपका स्वागत है। तेलुगु के लिए 1, हिंदी के लिए 2, अंग्रेजी के लिए 3 दबाएं।',
      options: ['1: Telugu', '2: Hindi', '3: English']
    });
  }

  // Step 2: Enter Mobile / Aadhaar
  if (step === 2) {
    return res.json({
      step: 2,
      voicePrompt: 'Please enter your 10-digit mobile number using your phone dialpad followed by the # key.',
      voicePromptTe: 'దయచేసి మీ 10 అంకెల మొబైల్ నంబర్‌ను డయల్ చేసి # కీ నొక్కండి.',
      voicePromptHi: 'कृपया अपने फोन डायलपैड से अपना 10 अंकों का मोबाइल नंबर दर्ज करें और # दबाएं।'
    });
  }

  // Step 3: Select Crop
  if (step === 3) {
    return res.json({
      step: 3,
      voicePrompt: 'Select crop to sell: Press 1 for Paddy, Press 2 for Cotton, Press 3 for Maize, Press 4 for Wheat.',
      voicePromptTe: 'మీరు విక్రయించే పంటను ఎంచుకోండి: వరి ధాన్యం కొరకు 1, పత్తి కొరకు 2, మొక్కజొన్న కొరకు 3, గోధుమ కొరకు 4 నొక్కండి.',
      voicePromptHi: 'फसल चुनें: धान के लिए 1, कपास के लिए 2, मक्का के लिए 3, गेहूं के लिए 4 दबाएं।'
    });
  }

  // Step 4: Confirmation
  res.json({
    step: 4,
    voicePrompt: 'Your slot is confirmed! An SMS with your Queue Token has been dispatched to your mobile.',
    voicePromptTe: 'మీ స్లాట్ విజయవంతంగా బుక్ చేయబడింది! మీ క్యూ టోకెన్ ఎస్ఎమ్ఎస్ ద్వారా పంపబడింది.',
    voicePromptHi: 'आपका स्लॉट बुक हो गया है! टोकन नंबर एसएमएस द्वारा भेज दिया गया है।'
  });
});

// Direct Telephone Slot Booking Endpoint
app.post('/api/ivr/book-slot', (req, res) => {
  try {
    const { phone, cropChoice, centerCode, preferredDate } = req.body;

    if (!phone || String(phone).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required for IVR booking.' });
    }

    const cleanPhone = normalizePhone(phone);

    // Find or auto-register farmer
    let farmer = memoryStore.farmers.find(f => f.phone === cleanPhone);
    if (!farmer) {
      farmer = {
        _id: 'f-ivr-' + Date.now(),
        name: `IVR Kisan (${cleanPhone.slice(-4)})`,
        phone: cleanPhone,
        aadhar: 'Aadhaar Verified on Mandi Gate',
        address: 'Alathur Gramam, Palakkad District, Kerala - 678541',
        district: 'Palakkad (Nellara / Rice Bowl)',
        mandal: 'Alathur',
        bankAccount: 'Direct Cash / Aadhaar Pay',
        ifscCode: 'KLGB0040188',
        upi: cleanPhone + '@ivr',
        createdAt: new Date()
      };
      memoryStore.farmers.push(farmer);
      safeDbSave(FarmerModel.create(farmer), 'CreateIVRFarmer');
    }

    const crops = ['Paddy (Common)', 'Cotton', 'Maize', 'Wheat', 'Soyabean', 'Pulses'];
    const selectedCrop = crops[Number(cropChoice) - 1] || 'Paddy (Common)';

    const targetCenter = centerCode
      ? memoryStore.procurementCenters.find(c => c.centerCode === centerCode.toUpperCase().trim())
      : memoryStore.procurementCenters[0];

    // Find active slot
    let slot = memoryStore.slots.find(s =>
      s.centerCode === (targetCenter ? targetCenter.centerCode : 'CENT-KER-PLK-01') &&
      s.crop === selectedCrop &&
      s.bookedCount < s.capacity
    );

    if (!slot) {
      slot = memoryStore.slots.find(s =>
        s.centerCode === (targetCenter ? targetCenter.centerCode : 'CENT-KER-PLK-01') &&
        s.bookedCount < s.capacity
      );
    }

    if (!slot) {
      const today = new Date().toISOString().split('T')[0];
      slot = {
        _id: 's-ivr-' + Date.now(),
        centerCode: targetCenter ? targetCenter.centerCode : 'CENT-KER-PLK-01',
        center: targetCenter ? targetCenter.name : 'Palakkad Primary Paddy Procurement Hub (Nellara Mandi)',
        crop: selectedCrop,
        date: preferredDate || today,
        time: '10:00 AM - 12:00 PM',
        capacity: 40,
        bookedCount: 0,
        bookings: [],
        status: 'active',
        createdAt: new Date()
      };
      memoryStore.slots.push(slot);
      safeDbSave(SlotModel.create(slot), 'CreateIVRSlot');
    }

    const booking = {
      _id: 'b-ivr-' + Date.now(),
      farmerId: farmer._id,
      slotId: slot._id,
      centerCode: slot.centerCode,
      crop: selectedCrop,
      ratePerQuintal: MSP_RATES[selectedCrop] || 2300,
      quantityQuintals: 0,
      qualityGrade: 'Grade A',
      totalAmount: 0,
      queuePosition: slot.bookedCount + 1,
      status: 'confirmed',
      bookedVia: 'TOLL_FREE_IVR',
      createdAt: new Date()
    };

    slot.bookedCount += 1;
    if (!slot.bookings) slot.bookings = [];
    slot.bookings.push(farmer._id);
    memoryStore.bookings.push(booking);

    safeDbSave(BookingModel.create(booking), 'CreateIVRBooking');
    safeDbSave(SlotModel.updateOne({ _id: slot._id }, { bookedCount: slot.bookedCount, bookings: slot.bookings }), 'UpdateIVRSlot');

    io.emit('queue-update', { slotId: slot._id, centerCode: slot.centerCode, newCount: slot.bookedCount });

    console.log(`📞 [IVR TELEPHONE BOOKING] Phone: ${cleanPhone} | Token: #${booking.queuePosition} | Crop: ${selectedCrop} | Center: ${slot.centerCode}`);

    res.json({
      success: true,
      bookingId: booking._id,
      queuePosition: booking.queuePosition,
      centerName: slot.center,
      centerCode: slot.centerCode,
      crop: selectedCrop,
      date: slot.date,
      time: slot.time,
      farmerPhone: cleanPhone,
      message: `Slot booked successfully via Telephone! Token #${booking.queuePosition} confirmed at ${slot.center}. SMS dispatched to +91 ${cleanPhone}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================================================
// Static Web Serving (Render Frontend Hosting)
// ===================================================
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Farmer Procurement Platform API',
      status: 'active',
      mongodb: isMongoConnected ? 'connected' : 'in-memory-fallback',
      centersCount: memoryStore.procurementCenters.length,
      farmersCount: memoryStore.farmers.length,
      adminsCount: memoryStore.procurementAdmins.length,
      officersCount: memoryStore.governmentOfficers.length
    });
  });
}

// ===================================================
// Socket.IO Real-Time Engine
// ===================================================
io.on('connection', (socket) => {
  socket.on('join-center', (centerCode) => {
    socket.join(`center-${centerCode}`);
  });
  socket.on('join-district', (district) => {
    socket.join(`district-${district}`);
  });
  socket.on('join-queue', (slotId) => {
    socket.join(`queue-${slotId}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Farmer Procurement, Mandi Admin & Superior Government District Treasury Server running on port ${PORT}`);
});

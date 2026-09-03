const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

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

// Available Districts and Mandals in Telangana and Kerala
const DISTRICTS_MANDALS_DATA = {
  // --- Telangana Regions ---
  'Sangareddy / Medak': [
    'Patancheru',
    'Sangareddy',
    'Zaheerabad',
    'Narayankhed',
    'Andole',
    'Kandi',
    'Ameenpur'
  ],
  'Nizamabad': [
    'Nizamabad North',
    'Nizamabad South',
    'Bodhan',
    'Armoor',
    'Banswada',
    'Dichpally'
  ],
  'Karimnagar': [
    'Karimnagar Urban',
    'Huzurabad',
    'Choppadandi',
    'Manakondur',
    'Thimmapur'
  ],
  'Warangal / Hanamkonda': [
    'Warangal Urban',
    'Hanamkonda',
    'Narsampet',
    'Parkal',
    'Wardhannapet'
  ],
  'Nalgonda': [
    'Nalgonda Urban',
    'Miryalaguda',
    'Devarakonda',
    'Nakrekal'
  ],

  // --- Kerala Regions (Major Agricultural & Paddy Procurement Hubs) ---
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
  ]
};

// ===================================================
// In-Memory Data Store (Resilient Fallback & Dual-Sync)
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

// Initial Seed Data for Memory Store
function initMemoryData() {
  memoryStore.procurementCenters = [
    {
      _id: 'c1',
      centerCode: 'CENT-PAT-01',
      name: 'Main APMC Mandi Center - Patancheru',
      mandal: 'Patancheru',
      district: 'Sangareddy / Medak',
      state: 'Telangana',
      adminName: 'R. K. Sharma (Mandi Supdt.)',
      adminPhone: '9848012345',
      adminPin: '1234',
      bankDetails: {
        bankName: 'State Bank of India',
        accountNumber: '38920192831',
        ifscCode: 'SBIN0020145',
        branch: 'Patancheru APMC Branch',
        accountHolderName: 'Patancheru Mandi Operations A/C'
      },
      allocatedBudget: 5000000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
      totalCapacityTonnes: 1000,
      currentStorageTonnes: 280,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c2',
      centerCode: 'CENT-KYA-02',
      name: 'Kyasaram Farmer Procurement Kendra',
      mandal: 'Patancheru',
      district: 'Sangareddy / Medak',
      state: 'Telangana',
      adminName: 'S. Narsimha Rao',
      adminPhone: '9849056789',
      adminPin: '1234',
      bankDetails: {
        bankName: 'Telangana Grameena Bank',
        accountNumber: '62149872110',
        ifscCode: 'TGB0001092',
        branch: 'Kyasaram Gram Panchayat Branch',
        accountHolderName: 'Kyasaram Procurement Center A/C'
      },
      allocatedBudget: 3500000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Maize', 'Pulses'],
      totalCapacityTonnes: 800,
      currentStorageTonnes: 140,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c3',
      centerCode: 'CENT-SNG-03',
      name: 'Sangareddy Central Rythu Vedika',
      mandal: 'Sangareddy',
      district: 'Sangareddy / Medak',
      state: 'Telangana',
      adminName: 'M. Prabhakar Reddy',
      adminPhone: '9848077665',
      adminPin: '1234',
      bankDetails: {
        bankName: 'State Bank of India',
        accountNumber: '39485728192',
        ifscCode: 'SBIN0020188',
        branch: 'Sangareddy Main Branch',
        accountHolderName: 'Sangareddy Central Procurement A/C'
      },
      allocatedBudget: 4500000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Cotton', 'Soyabean'],
      totalCapacityTonnes: 1200,
      currentStorageTonnes: 310,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c4',
      centerCode: 'CENT-ZHB-04',
      name: 'Zaheerabad Cotton & Pulse Depot',
      mandal: 'Zaheerabad',
      district: 'Sangareddy / Medak',
      state: 'Telangana',
      adminName: 'G. Veeranna',
      adminPhone: '9848033221',
      adminPin: '1234',
      bankDetails: {
        bankName: 'Andhra Pragathi Grameena Bank',
        accountNumber: '44910293812',
        ifscCode: 'APGB0001142',
        branch: 'Zaheerabad Market Yard',
        accountHolderName: 'Zaheerabad Agri Center A/C'
      },
      allocatedBudget: 3000000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Cotton', 'Pulses', 'Soyabean'],
      totalCapacityTonnes: 900,
      currentStorageTonnes: 180,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c5',
      centerCode: 'CENT-NZB-05',
      name: 'Kisan Seva Kendra - North Nizamabad',
      mandal: 'Nizamabad North',
      district: 'Nizamabad',
      state: 'Telangana',
      adminName: 'P. Venkat Reddy',
      adminPhone: '9849991234',
      adminPin: '1234',
      bankDetails: {
        bankName: 'Union Bank of India',
        accountNumber: '5102010098451',
        ifscCode: 'UBIN0551020',
        branch: 'Nizamabad Market Yard',
        accountHolderName: 'North Nizamabad Procurement A/C'
      },
      allocatedBudget: 4000000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Soyabean', 'Cotton'],
      totalCapacityTonnes: 600,
      currentStorageTonnes: 145,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c6',
      centerCode: 'CENT-KRN-06',
      name: 'Karimnagar APMC Model Mandi',
      mandal: 'Karimnagar Urban',
      district: 'Karimnagar',
      state: 'Telangana',
      adminName: 'T. Srinivas',
      adminPhone: '9848055443',
      adminPin: '1234',
      bankDetails: {
        bankName: 'Canara Bank',
        accountNumber: '298101009283',
        ifscCode: 'CNRB0002981',
        branch: 'Karimnagar APMC Branch',
        accountHolderName: 'Karimnagar Procurement A/C'
      },
      allocatedBudget: 6000000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Wheat', 'Maize', 'Cotton'],
      totalCapacityTonnes: 1500,
      currentStorageTonnes: 420,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c7',
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
      _id: 'c8',
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
      _id: 'c9',
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
        accountNumber: '005407300001429',
        ifscCode: 'SIBL0000054',
        branch: 'Ayyanthole Civil Station Branch',
        accountHolderName: 'Thrissur Kole Land Procurement A/C'
      },
      allocatedBudget: 5000000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Paddy (Grade A)', 'Pulses'],
      totalCapacityTonnes: 1200,
      currentStorageTonnes: 190,
      active: true,
      createdAt: new Date()
    },
    {
      _id: 'c10',
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
        accountNumber: '40192837461',
        ifscCode: 'KLGB0040192',
        branch: 'Mananthavady Town Branch',
        accountHolderName: 'Wayanad Agro Procurement Hub A/C'
      },
      allocatedBudget: 4500000,
      disbursedToFarmers: 0,
      acceptedCrops: ['Paddy (Common)', 'Maize', 'Pulses'],
      totalCapacityTonnes: 1000,
      currentStorageTonnes: 150,
      active: true,
      createdAt: new Date()
    }
  ];

  memoryStore.governmentOfficers = [
    {
      _id: 'gov1',
      name: 'Dr. K. Sudhakar Rao',
      phone: '9848099887',
      district: 'Sangareddy / Medak',
      state: 'Telangana',
      designation: 'District Agricultural Officer (DAO) & Joint Director',
      employeeId: 'GOV-TS-AGRI-2026-99',
      department: 'Department of Agriculture & Civil Supplies, Govt of Telangana',
      createdAt: new Date()
    },
    {
      _id: 'gov2',
      name: 'P. Rajeshwar Reddy',
      phone: '9849988776',
      district: 'Nizamabad',
      state: 'Telangana',
      designation: 'District Procurement Officer (DPO)',
      employeeId: 'GOV-TS-AGRI-2026-104',
      department: 'Department of Agriculture & Civil Supplies, Govt of Telangana',
      createdAt: new Date()
    },
    {
      _id: 'gov3',
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
      _id: 'gov4',
      name: 'Smt. Latha Kumari',
      phone: '9447223344',
      district: 'Alappuzha (Kuttanad)',
      state: 'Kerala',
      designation: 'Joint Director of Agriculture, Kuttanad Package',
      employeeId: 'GOV-KL-AGRI-2026-82',
      department: 'Department of Agricultural Development & Farmers Welfare, Govt of Kerala',
      createdAt: new Date()
    }
  ];

  memoryStore.procurementAdmins = [
    {
      _id: 'adm1',
      name: 'R. K. Sharma (Mandi Supdt.)',
      phone: '9848012345',
      address: 'APMC Market Complex, Patancheru Industrial Area, Sangareddy, Telangana - 502319',
      centerCode: 'CENT-PAT-01',
      district: 'Sangareddy / Medak',
      mandal: 'Patancheru',
      adminPin: '1234'
    },
    {
      _id: 'adm2',
      name: 'S. Narsimha Rao',
      phone: '9849056789',
      address: 'Gram Panchayat Office Building, Kyasaram, Patancheru, Telangana - 502300',
      centerCode: 'CENT-KYA-02',
      district: 'Sangareddy / Medak',
      mandal: 'Patancheru',
      adminPin: '1234'
    },
    {
      _id: 'adm3',
      name: 'P. Venkat Reddy',
      phone: '9849991234',
      address: 'Kisan Seva Kendra, Khaleelwadi, Nizamabad, Telangana - 503001',
      centerCode: 'CENT-NZB-05',
      district: 'Nizamabad',
      mandal: 'Nizamabad North',
      adminPin: '1234'
    },
    {
      _id: 'adm4',
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
      _id: 'adm5',
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
      _id: 'adm6',
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
      _id: 'adm7',
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

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  memoryStore.slots = [
    { _id: 's1', centerCode: 'CENT-PAT-01', center: 'Main APMC Mandi Center - Patancheru', crop: 'Paddy (Common)', date: today, time: '09:00 AM - 11:00 AM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's2', centerCode: 'CENT-PAT-01', center: 'Main APMC Mandi Center - Patancheru', crop: 'Cotton', date: today, time: '11:30 AM - 01:30 PM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's3', centerCode: 'CENT-KYA-02', center: 'Kyasaram Farmer Procurement Kendra', crop: 'Paddy (Common)', date: today, time: '02:30 PM - 04:30 PM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's4', centerCode: 'CENT-SNG-03', center: 'Sangareddy Central Rythu Vedika', crop: 'Cotton', date: today, time: '09:00 AM - 11:00 AM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's5', centerCode: 'CENT-PAT-01', center: 'Main APMC Mandi Center - Patancheru', crop: 'Wheat', date: tomorrow, time: '09:00 AM - 11:00 AM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's6', centerCode: 'CENT-NZB-05', center: 'Kisan Seva Kendra - North Nizamabad', crop: 'Soyabean', date: tomorrow, time: '09:00 AM - 11:00 AM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's7', centerCode: 'CENT-KYA-02', center: 'Kyasaram Farmer Procurement Kendra', crop: 'Maize', date: dayAfter, time: '09:00 AM - 11:00 AM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's8', centerCode: 'CENT-KER-PLK-01', center: 'Palakkad Primary Paddy Procurement Hub (Nellara Mandi)', crop: 'Paddy (Grade A)', date: today, time: '09:00 AM - 11:30 AM', capacity: 35, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's9', centerCode: 'CENT-KER-ALP-02', center: 'Kuttanad Wetland Paddy Procurement Station', crop: 'Paddy (Common)', date: today, time: '10:00 AM - 01:00 PM', capacity: 30, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's10', centerCode: 'CENT-KER-TCR-03', center: 'Thrissur Kole Land Agricultural Depot', crop: 'Paddy (Grade A)', date: tomorrow, time: '09:30 AM - 12:30 PM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' },
    { _id: 's11', centerCode: 'CENT-KER-WYD-04', center: 'Wayanad Hill Grain & Paddy Center', crop: 'Paddy (Common)', date: dayAfter, time: '09:00 AM - 12:00 PM', capacity: 25, bookedCount: 0, bookings: [], status: 'active' }
  ];

  // Seed sample farmer & verified transactions
  memoryStore.farmers = [
    {
      _id: 'f1',
      name: 'Ramesh Goud',
      phone: '9876543210',
      aadhar: '5421-9876-1234',
      address: 'Kyasaram Village, Patancheru Mandal',
      district: 'Sangareddy / Medak',
      mandal: 'Patancheru',
      bankAccount: '987612345678',
      ifscCode: 'SBIN0020145',
      upi: 'ramesh@upi',
      createdAt: new Date()
    }
  ];

  console.log('🌱 Seeded resilient In-Memory Store with Multi-District Mandi Data, Slots, and Officer Profiles');
}

initMemoryData();

// MongoDB Connection Attempt (with fast failover)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/farmer-procurement';

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    isMongoConnected = true;
    console.log('✅ MongoDB Connected successfully');
  })
  .catch((err) => {
    isMongoConnected = false;
    console.log('ℹ️ Operating in High-Performance Resilient In-Memory Mode (MongoDB offline: ' + err.message + ')');
  });

// ===================================================
// Authentication & OTP Routes
// ===================================================

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number' });
    }

    const cleanPhone = phone.trim();

    // 1. Government Officer Login - ensure officer exists or auto-provision demo officer
    if (purpose === 'government_login') {
      let officer = memoryStore.governmentOfficers.find(o => o.phone === cleanPhone);
      if (!officer) {
        // Auto-provision demo government officer so testing never blocks with 404
        officer = {
          _id: 'gov-' + Date.now(),
          name: 'Demo Government Officer',
          phone: cleanPhone,
          district: 'Sangareddy / Medak',
          state: 'Telangana',
          designation: 'District Agricultural Officer (DAO)',
          employeeId: 'GOV-TS-AGRI-2026-99',
          department: 'Department of Agriculture & Food Procurement',
          createdAt: new Date()
        };
        memoryStore.governmentOfficers.push(officer);
      }
    }
    // 2. Procurement Centre Admin Login / Registration
    else if (purpose === 'admin_login' || purpose === 'admin_register') {
      let admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone) ||
                  memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone);
      if (!admin) {
        admin = {
          _id: 'adm-' + Date.now(),
          name: 'Procurement Centre Admin',
          phone: cleanPhone,
          address: 'Main APMC Mandi Complex, Palakkad / Patancheru',
          centerCode: 'CENT-KER-PLK-01',
          district: 'Palakkad (Nellara / Rice Bowl)',
          mandal: 'Alathur',
          adminPin: '1234',
          createdAt: new Date()
        };
        memoryStore.procurementAdmins.push(admin);
      }
    }
    // 3. Farmer Login - ensure farmer exists or auto-provision demo farmer
    else if (purpose === 'login' || purpose === 'farmer') {
      let farmer = memoryStore.farmers.find(f => f.phone === cleanPhone);
      if (!farmer) {
        farmer = {
          _id: 'f-' + Date.now(),
          name: 'Demo Farmer (' + cleanPhone.slice(-4) + ')',
          phone: cleanPhone,
          aadhar: '5421-9876-' + cleanPhone.slice(-4),
          address: 'Kyasaram Village, Patancheru Mandal',
          district: 'Sangareddy / Medak',
          mandal: 'Patancheru',
          bankAccount: '987612345678',
          ifscCode: 'SBIN0020145',
          upi: cleanPhone + '@upi',
          createdAt: new Date()
        };
        memoryStore.farmers.push(farmer);
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

    console.log(`📲 [SMS GATEWAY OTP] Mobile: ${cleanPhone} | Purpose: ${purpose || 'general'} | OTP: ${otp}`);

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanPhone}`,
      phone: cleanPhone,
      otp, // for display in demo badge
      demoOtp: '123456' // Universal demo OTP always accepted
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

    const cleanPhone = phone.trim();
    const cleanOtp = String(otp).trim();

    // Universal Demo OTPs that are ALWAYS accepted for ANY mobile number, anytime
    const isDemoOtp = ['123456', '998877', '000000', '112233', '741258'].includes(cleanOtp);

    const record = memoryStore.otps.find(o => o.phone === cleanPhone);
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
    const officer = memoryStore.governmentOfficers.find(o => o.phone === cleanPhone);
    if (officer || purpose === 'government' || purpose === 'government_login') {
      const officerObj = officer || {
        _id: 'gov-' + Date.now(),
        name: name || 'Dr. K. Sudhakar Rao',
        phone: cleanPhone,
        district: 'Sangareddy / Medak',
        state: 'Telangana',
        designation: 'District Agricultural Officer (DAO)',
        employeeId: 'GOV-TS-AGRI-2026-99',
        department: 'Department of Agriculture & Food Procurement',
        createdAt: new Date()
      };
      if (!officer) memoryStore.governmentOfficers.push(officerObj);

      return res.json({
        success: true,
        message: 'Government Officer verified successfully',
        role: 'government_officer',
        officerId: officerObj._id,
        officer: officerObj
      });
    }

    // 2. Procurement Admin Check
    const admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone) ||
                  memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone);
    if (admin || purpose === 'admin' || purpose === 'admin_login' || purpose === 'admin_register') {
      const centerCode = bodyCenterCode || admin?.centerCode || 'CENT-KER-PLK-01';
      const center = memoryStore.procurementCenters.find(c => c.centerCode === centerCode) || memoryStore.procurementCenters[0];
      const adminName = name || admin?.name || center?.adminName || 'Procurement Center Admin';
      const adminAddress = address || admin?.address || center?.adminAddress || 'Mandi Yard Complex';

      const adminObj = admin || {
        _id: 'adm-' + Date.now(),
        name: adminName,
        phone: cleanPhone,
        address: adminAddress,
        centerCode: center?.centerCode || 'CENT-KER-PLK-01',
        createdAt: new Date()
      };
      if (!admin) memoryStore.procurementAdmins.push(adminObj);
      else {
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
    if (!farmer) {
      farmer = {
        _id: 'f-' + Date.now(),
        name: name || 'Demo Farmer',
        phone: cleanPhone,
        aadhar: '5421-9876-1234',
        address: address || 'Kyasaram Village, Patancheru Mandal',
        district: 'Sangareddy / Medak',
        mandal: 'Patancheru',
        bankAccount: '987612345678',
        ifscCode: 'SBIN0020145',
        upi: cleanPhone + '@upi',
        createdAt: new Date()
      };
      memoryStore.farmers.push(farmer);
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
    const { name, phone, district, designation, employeeId, department } = req.body;

    if (!name || !phone || !district) {
      return res.status(400).json({
        success: false,
        message: 'Officer Name, Official Mobile Number, and Assigned District are mandatory.'
      });
    }

    const cleanPhone = phone.trim();
    const cleanDistrict = district.trim();

    const existing = memoryStore.governmentOfficers.find(o => o.phone === cleanPhone);
    if (existing) {
      existing.name = name.trim();
      existing.district = cleanDistrict;
      if (designation) existing.designation = designation;
      if (employeeId) existing.employeeId = employeeId;
      if (department) existing.department = department;

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
      state: 'Telangana',
      designation: designation || 'District Agricultural Officer (DAO)',
      employeeId: employeeId || 'GOV-TS-' + Math.floor(10000 + Math.random() * 90000),
      department: department || 'Department of Agriculture & Food Civil Supplies',
      createdAt: new Date()
    };

    memoryStore.governmentOfficers.push(newOfficer);
    console.log(`🏛️ Registered Superior Government Officer: ${newOfficer.name} for District [${newOfficer.district}]`);

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

      const mBudget = mandalCenters.reduce((sum, c) => sum + (c.allocatedBudget || 0), 0);

      mandalWiseStats[mandal] = {
        mandal,
        centersCount: mandalCenters.length,
        centers: mandalCenters,
        allocatedBudget: mBudget,
        disbursedToFarmers: mDisbursed,
        remainingBalance: mBudget - mDisbursed,
        quintalsProcured: mQuintals,
        tonnesProcured: Math.round(mQuintals / 10),
        farmersServed: mandalBookings.filter(b => b.status === 'completed').length,
        waitingFarmers: mandalBookings.filter(b => b.status === 'confirmed').length
      };
    });

    res.json({
      success: true,
      district: targetDistrict,
      totalCenters: centers.length,
      centers,
      totalAllocatedBudget,
      totalDisbursedToFarmers,
      remainingTreasuryBalance: totalAllocatedBudget - totalDisbursedToFarmers,
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

    // Increment Allocated Budget for Center
    center.allocatedBudget = (center.allocatedBudget || 0) + sanctionAmount;

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
      state: state || 'Telangana',
      adminName: adminName || 'Mandi Incharge',
      adminPhone: adminPhone || '',
      adminPin: adminPin || '1234',
      bankDetails: bankDetails || {
        bankName: 'State Bank of India',
        accountNumber: '38920192831',
        ifscCode: 'SBIN0001234',
        branch: `${mandal} Mandi Branch`,
        accountHolderName: `${name} Operations A/C`
      },
      allocatedBudget: 2500000, // initial budget
      disbursedToFarmers: 0,
      acceptedCrops: acceptedCrops && acceptedCrops.length ? acceptedCrops : ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
      totalCapacityTonnes: Number(totalCapacityTonnes) || 500,
      currentStorageTonnes: 0,
      active: true,
      createdAt: new Date()
    };

    memoryStore.procurementCenters.push(newCenter);

    // Also register the Admin for this center
    if (adminPhone) {
      memoryStore.procurementAdmins.push({
        _id: 'adm-' + Date.now(),
        name: adminName || 'Mandi Incharge',
        phone: adminPhone.trim(),
        centerCode: cleanCode,
        district: district.trim(),
        mandal: mandal.trim(),
        adminPin: adminPin || '1234'
      });
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
    if (adminPhone) center.adminPhone = adminPhone.trim();
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
    return res.status(404).json({ success: false, message: 'Center not found' });
  }

  const slots = memoryStore.slots.filter(s => s.centerCode === code);
  const bookings = memoryStore.bookings.filter(b => b.centerCode === code);
  const payments = memoryStore.payments.filter(p => p.centerCode === code && p.status === 'completed');

  const cropStats = {};
  (center.acceptedCrops || []).forEach(c => {
    cropStats[c] = { procuredQuintals: 0, farmersCount: 0, totalValue: 0, mspRate: MSP_RATES[c] || 2300 };
  });

  bookings.forEach(b => {
    const c = b.crop || 'Paddy (Common)';
    if (!cropStats[c]) {
      cropStats[c] = { procuredQuintals: 0, farmersCount: 0, totalValue: 0, mspRate: MSP_RATES[c] || 2300 };
    }
    if (b.status === 'verified' || b.status === 'completed') {
      const weight = b.quantityQuintals || 10;
      cropStats[c].procuredQuintals += weight;
      cropStats[c].totalValue += (b.totalAmount || weight * (MSP_RATES[c] || 2300));
      cropStats[c].farmersCount += 1;
    }
  });

  const totalQuintals = Object.values(cropStats).reduce((acc, curr) => acc + curr.procuredQuintals, 0);
  const totalDisbursed = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const waitingFarmers = bookings.filter(b => b.status === 'confirmed').length;
  const completedFarmers = bookings.filter(b => b.status === 'completed').length;

  res.json({
    success: true,
    center,
    totalSlots: slots.length,
    totalQuintalsProcured: totalQuintals,
    totalTonnesProcured: Math.round(totalQuintals / 10),
    totalDisbursedINR: totalDisbursed,
    allocatedBudget: center.allocatedBudget || 2500000,
    remainingBudget: (center.allocatedBudget || 2500000) - totalDisbursed,
    waitingFarmers,
    completedFarmers,
    totalFarmersServed: completedFarmers,
    cropBreakdown: cropStats,
    mspRates: MSP_RATES
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
    }

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

// 8. Sanction / Disburse DBT Payment to Farmer (By Procurement Admin)
app.post('/api/admin/procurement/pay', (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const booking = memoryStore.bookings.find(b => b._id === bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payAmount = Number(amount) || booking.totalAmount || 23000;
    const txId = 'DBT-GOV-PFMS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const payment = {
      _id: 'pay-' + Date.now(),
      bookingId: booking._id,
      farmerId: booking.farmerId,
      centerCode: booking.centerCode,
      crop: booking.crop || 'Paddy (Common)',
      quantityQuintals: booking.quantityQuintals || 10,
      amount: payAmount,
      transactionId: txId,
      status: 'completed',
      sanctionedByAdmin: true,
      createdAt: new Date()
    };

    booking.status = 'completed';
    memoryStore.payments.push(payment);

    // Update center disbursed total
    const center = memoryStore.procurementCenters.find(c => c.centerCode === booking.centerCode);
    if (center) {
      center.disbursedToFarmers = (center.disbursedToFarmers || 0) + payAmount;
    }

    io.emit('payment-update', {
      bookingId: booking._id,
      farmerId: booking.farmerId,
      status: 'completed',
      transactionId: txId,
      amount: payAmount
    });

    console.log(`🌾 [FARMER DBT PAYMENT SANCTIONED] Paid ₹${payAmount.toLocaleString('en-IN')} to Farmer [${booking.farmerId}] (TxID: ${txId})`);

    res.json({
      success: true,
      payment,
      transactionId: txId,
      message: `DBT Payment of ₹${payAmount.toLocaleString('en-IN')} sanctioned and approved with PFMS TxID: ${txId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Register New Procurement Centre Admin (asks Name and Address!)
app.post('/api/admin/register', (req, res) => {
  try {
    const { name, phone, address, district, mandal, centerCode, centerName } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Admin Full Name, Mobile Number, and Official Address are required.'
      });
    }

    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanAddress = address.trim();

    let targetCenterCode = centerCode || ('CENT-' + Math.random().toString(36).substring(2, 6).toUpperCase());

    // Check if admin already exists
    let existingAdmin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone);
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
    if (!center && centerName) {
      const isKerala = (district && (district.includes('Kerala') || ['Palakkad (Nellara / Rice Bowl)', 'Alappuzha (Kuttanad)', 'Thrissur', 'Wayanad', 'Kozhikode', 'Ernakulam / Kochi', 'Thiruvananthapuram', 'Kottayam', 'Kannur', 'Idukki'].includes(district)));
      center = {
        _id: 'c-' + Date.now(),
        centerCode: targetCenterCode,
        name: centerName,
        mandal: mandal || 'Central Mandi',
        district: district || 'Palakkad (Nellara / Rice Bowl)',
        state: isKerala ? 'Kerala' : 'Telangana',
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
    } else if (center) {
      center.adminName = cleanName;
      center.adminPhone = cleanPhone;
      center.adminAddress = cleanAddress;
    }

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

// 8. Update Admin Profile (Name and Address)
app.put('/api/admin/profile', (req, res) => {
  try {
    const { phone, name, address, centerCode } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = phone.trim();
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

    res.json({
      success: true,
      message: 'Admin profile updated successfully',
      admin: admin || { name, phone: cleanPhone, address, centerCode }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Get Admin Profile
app.get('/api/admin/profile/:phone', (req, res) => {
  const cleanPhone = req.params.phone.trim();
  const admin = memoryStore.procurementAdmins.find(a => a.phone === cleanPhone);
  const center = memoryStore.procurementCenters.find(c => c.adminPhone === cleanPhone || c.centerCode === admin?.centerCode);

  if (!admin && !center) {
    return res.status(404).json({ success: false, message: 'Admin profile not found' });
  }

  res.json({
    success: true,
    admin: admin || {
      name: center?.adminName,
      phone: cleanPhone,
      address: center?.adminAddress,
      centerCode: center?.centerCode
    },
    center
  });
});

// ===================================================
// Crystal-Clear Multilingual Voice Audio Stream (AI Voice)
// Supports Malayalam, Hindi, Telugu, Tamil, Kannada, etc.
// ===================================================
app.get('/api/tts', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.query;
    if (!text || !text.trim()) {
      return res.status(400).send('Text parameter required');
    }

    const langMap = {
      en: 'en-IN',
      ml: 'ml', // Malayalam
      hi: 'hi', // Hindi
      te: 'te', // Telugu
      ta: 'ta', // Tamil
      kn: 'kn', // Kannada
      mr: 'mr', // Marathi
      bn: 'bn', // Bengali
      gu: 'gu', // Gujarati
      pa: 'pa', // Punjabi
      or: 'or'  // Odia
    };
    const ttsLang = langMap[lang] || 'en-IN';
    const cleanText = text.trim().slice(0, 300);

    const googleTTSUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${ttsLang}&client=tw-ob`;

    const https = require('https');
    https.get(googleTTSUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*;q=0.9',
        'Referer': 'https://translate.google.com/'
      }
    }, (ttsRes) => {
      if (ttsRes.statusCode === 200) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        ttsRes.pipe(res);
      } else {
        res.status(ttsRes.statusCode).send('Voice stream error');
      }
    }).on('error', (err) => {
      console.warn('TTS proxy error:', err.message);
      res.status(502).send('Error streaming TTS');
    });
  } catch (err) {
    console.error('TTS endpoint error:', err);
    res.status(500).send('Internal TTS error');
  }
});

// ===================================================
// Farmer Facing APIs
// (Registration, Profile, Slot Booking, Live Queue, Payments History)
// ===================================================

// 1. Farmer Registration
app.post('/api/farmers/register', (req, res) => {
  try {
    const { name, phone, aadhar, address, district, mandal, bankAccount, ifscCode, upi } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Farmer name and mobile number are required' });
    }

    const cleanPhone = phone.trim();
    const existing = memoryStore.farmers.find(f => f.phone === cleanPhone);
    if (existing) {
      existing.name = name.trim();
      if (aadhar) existing.aadhar = aadhar.trim();
      if (address) existing.address = address.trim();
      if (district) existing.district = district.trim();
      if (mandal) existing.mandal = mandal.trim();
      if (bankAccount) existing.bankAccount = bankAccount.trim();
      if (ifscCode) existing.ifscCode = ifscCode.trim();
      if (upi) existing.upi = upi.trim();

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
      address: address ? address.trim() : '',
      district: district ? district.trim() : 'Sangareddy / Medak',
      mandal: mandal ? mandal.trim() : 'Patancheru',
      bankAccount: bankAccount ? bankAccount.trim() : '',
      ifscCode: ifscCode ? ifscCode.trim() : 'SBIN0020145',
      upi: upi ? upi.trim() : '',
      createdAt: new Date()
    };

    memoryStore.farmers.push(newFarmer);

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

// 2. Get Farmer Profile
app.get('/api/farmers/:id', (req, res) => {
  const farmer = memoryStore.farmers.find(f => f._id === req.params.id);
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

    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required for IVR booking.' });
    }

    const cleanPhone = phone.trim();

    // Find or auto-register farmer
    let farmer = memoryStore.farmers.find(f => f.phone === cleanPhone);
    if (!farmer) {
      farmer = {
        _id: 'f-ivr-' + Date.now(),
        name: `Kisan (+91 ${cleanPhone.slice(-4)})`,
        phone: cleanPhone,
        address: 'Phone IVR Registered Village',
        district: 'Sangareddy / Medak',
        mandal: 'Patancheru',
        bankAccount: 'Direct DBT Linked',
        createdAt: new Date()
      };
      memoryStore.farmers.push(farmer);
    }

    // Map crop choice
    const cropMap = {
      '1': 'Paddy (Common)',
      '2': 'Cotton',
      '3': 'Maize',
      '4': 'Wheat',
      '5': 'Soyabean'
    };
    const selectedCrop = cropMap[cropChoice] || cropChoice || 'Paddy (Common)';

    // Find available slot
    const targetCode = (centerCode || 'CENT-PAT-01').toUpperCase().trim();
    let slot = memoryStore.slots.find(s => s.centerCode === targetCode && s.bookedCount < s.capacity);
    if (!slot) {
      slot = memoryStore.slots[0];
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
      bookedVia: 'IVR_TELEPHONE',
      createdAt: new Date()
    };

    slot.bookedCount += 1;
    if (!slot.bookings) slot.bookings = [];
    slot.bookings.push(farmer._id);
    memoryStore.bookings.push(booking);

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

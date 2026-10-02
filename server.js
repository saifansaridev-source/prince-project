require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { demoBrokers, demoUsers, demoProperties } = require("./seed-rooms");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(PUBLIC, "uploads");

// Ensure local uploads directory exists as fallback
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Cloudinary Configuration
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log("☁️  Cloudinary integration configured");
} else {
  console.log("ℹ️  Cloudinary not configured in .env — using local upload / image URL fallback");
}

// Multer Storage Setup (memory storage for seamless Cloudinary upload or local write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP) are allowed."));
    }
  }
});

// Helper: Upload file buffer to Cloudinary or local fallback
async function uploadImageFile(buffer, originalname) {
  if (hasCloudinary) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "gharbazaar_properties",
          resource_type: "image",
          transformation: [{ quality: "auto" }, { fetch_format: "auto" }]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      );
      stream.end(buffer);
    });
  } else {
    // Local storage fallback
    const ext = path.extname(originalname) || ".jpg";
    const filename = `prop_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const targetPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(targetPath, buffer);
    return {
      url: `/uploads/${filename}`,
      public_id: `local_${filename}`
    };
  }
}

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, lowercase: true, trim: true, required: true },
  password: { salt: String, hash: String },
  role: { type: String, enum: ["user", "broker", "admin"], default: "user" },
  phone: { type: String, default: "" },
  agencyName: { type: String, default: "" },
  googleId: { type: String, default: "" },
  emailVerified: { type: Boolean, default: false },
  verificationOtp: String,
  verificationExpires: Number
}, { timestamps: true });

const propertySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  brokerId: { type: String, required: true },
  brokerName: { type: String, required: true },
  brokerPhone: { type: String, default: "" },
  brokerEmail: { type: String, default: "" },
  agencyName: { type: String, default: "" },
  title: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  area: { type: String, required: true, lowercase: true, trim: true },
  type: { type: String, enum: ["private", "pg", "studio", "apartment"], required: true },
  price: { type: Number, required: true, min: 0 },
  deposit: { type: Number, default: 0 },
  badge: { type: String, default: "Verified" },
  rating: { type: Number, default: 4.8 },
  beds: { type: String, default: "1 Bed" },
  bath: { type: String, default: "Private Bath" },
  size: { type: String, default: "200 sq.ft" },
  amenities: { type: [String], default: [] },
  image: { type: String, required: true },
  images: [{ url: String, public_id: String }],
  description: { type: String, default: "" },
  availability: { type: String, enum: ["available", "booked", "unavailable"], default: "available" },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userPhone: { type: String, default: "" },
  brokerId: { type: String, required: true },
  propertyId: { type: String, required: true },
  propertyTitle: { type: String, required: true },
  propertyLocation: { type: String, default: "" },
  propertyPrice: { type: Number, default: 0 },
  requestType: { type: String, enum: ["booking", "visit"], default: "booking" },
  requestedDate: { type: String, default: "" },
  message: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
    default: "pending"
  },
  agreedAmount: { type: Number, default: 0 },
  brokerageRate: { type: Number, default: 0.02 }, // 2% brokerage mediator platform fee
  brokerageAmount: { type: Number, default: 0 }, // calculated when deal completed
  completedAt: Date
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  recipientId: { type: String, required: true }, // broker ID or user ID
  recipientRole: { type: String, enum: ["broker", "user"], default: "broker" },
  type: { type: String, default: "booking_request" },
  message: { type: String, required: true },
  bookingId: { type: String, default: "" },
  propertyTitle: { type: String, default: "" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Property = mongoose.model("Property", propertySchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Notification = mongoose.model("Notification", notificationSchema);

// Express Middleware
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "Ghar-Bazaar-college-project-secure-session-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set to true in production HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Password Hashing Helpers
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString("hex")
  };
}

function verifyPassword(password, record) {
  try {
    if (!record || !record.salt || !record.hash) return false;
    return crypto.timingSafeEqual(
      crypto.scryptSync(password, record.salt, 64),
      Buffer.from(record.hash, "hex")
    );
  } catch {
    return false;
  }
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone || "",
    agencyName: u.agencyName || "",
    emailVerified: Boolean(u.emailVerified)
  };
}

// Role Authorization Middlewares
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please log in to continue." });
  }
  next();
}

function requireBroker(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please log in as a broker." });
  }
  if (req.session.user.role !== "broker") {
    return res.status(403).json({ message: "Broker access required." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please log in as an administrator." });
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

function requireBrokerOrAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  if (!["broker", "admin"].includes(req.session.user.role)) {
    return res.status(403).json({ message: "Broker or Admin authorization required." });
  }
  next();
}

// Mailer Setup
const mailer = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

async function sendVerificationEmail(email, name, otp) {
  if (!mailer) {
    console.log(`\n=========================================`);
    console.log(`📧 [EMAIL AUTH DEMO] Verification code for ${email}: [ ${otp} ]`);
    console.log(`=========================================\n`);
    return false;
  }
  try {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Ghar Bazaar - Verify your email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
          <div style="text-align:center;margin-bottom:20px">
            <h1 style="color:#0f5132;margin:0">Ghar<span style="color:#d97706">Bazaar</span></h1>
            <p style="color:#64748b;font-size:14px">Rental Marketplace & Mediator Platform</p>
          </div>
          <h2 style="color:#1e293b">Welcome, ${name}!</h2>
          <p style="color:#475569;line-height:1.6">Your email verification code is:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:16px;background:#f0fdf4;color:#166534;border:1px dashed #86efac;border-radius:8px;text-align:center;margin:16px 0">
            ${otp}
          </div>
          <p style="color:#64748b;font-size:13px">This OTP code expires in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error("Mailer Error:", err.message);
    return false;
  }
}

// Database Initialization & Seeding
async function initDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Please check .env file.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB connected successfully");

  // 1. Seed Admin
  const adminEmail = "admin@gharbazaar.com";
  if (!(await User.exists({ email: adminEmail }))) {
    const p = hashPassword("Admin@123");
    await User.create({
      id: "U001",
      name: "Administrator",
      email: adminEmail,
      password: p,
      role: "admin",
      phone: "+91 98765 00000",
      emailVerified: true
    });
    console.log("✅ Default Admin created (admin@gharbazaar.com / Admin@123)");
  }

  // 2. Seed Demo Brokers
  for (const b of demoBrokers) {
    if (!(await User.exists({ email: b.email }))) {
      const p = hashPassword("Broker@123");
      await User.create({
        id: b.id,
        name: b.name,
        email: b.email,
        password: p,
        role: "broker",
        phone: b.phone,
        agencyName: b.agencyName,
        emailVerified: true
      });
      console.log(`✅ Demo Broker created: ${b.name} (${b.email} / Broker@123)`);
    }
  }

  // 3. Seed Demo Renter
  for (const u of demoUsers) {
    if (!(await User.exists({ email: u.email }))) {
      const p = hashPassword("User@123");
      await User.create({
        id: u.id,
        name: u.name,
        email: u.email,
        password: p,
        role: "user",
        phone: u.phone,
        emailVerified: true
      });
      console.log(`✅ Demo Renter created: ${u.name} (${u.email} / User@123)`);
    }
  }

  // 4. Seed Properties
  const propCount = await Property.countDocuments();
  if (propCount === 0) {
    await Property.insertMany(demoProperties);
    console.log(`✅ Seeded ${demoProperties.length} rental properties`);

    // 5. Seed a demo completed deal to showcase 2% brokerage calculation
    const demoBooking = await Booking.create({
      id: "B1001",
      userId: "U101",
      userName: "Rahul Verma",
      userEmail: "rahul.renter@gmail.com",
      userPhone: "+91 98765 43210",
      brokerId: "B001",
      propertyId: "P001",
      propertyTitle: "Furnished Private Room in Malad West",
      propertyLocation: "Malad West, Mumbai",
      propertyPrice: 12500,
      requestType: "booking",
      requestedDate: "2026-10-01",
      message: "Looking for immediate move-in for college semester.",
      status: "completed",
      agreedAmount: 12500,
      brokerageRate: 0.02,
      brokerageAmount: Math.round(12500 * 0.02), // ₹250
      completedAt: new Date()
    });

    // Seed sample pending booking
    await Booking.create({
      id: "B1002",
      userId: "U101",
      userName: "Rahul Verma",
      userEmail: "rahul.renter@gmail.com",
      userPhone: "+91 98765 43210",
      brokerId: "B001",
      propertyId: "P002",
      propertyTitle: "Shared PG Near Andheri Station",
      propertyLocation: "Andheri East, Mumbai",
      propertyPrice: 9800,
      requestType: "visit",
      requestedDate: "Tomorrow at 4:00 PM",
      message: "Want to inspect the room and amenities before final decision.",
      status: "pending",
      agreedAmount: 9800,
      brokerageRate: 0.02,
      brokerageAmount: 0
    });

    // Seed broker notification
    await Notification.create({
      id: "N1001",
      recipientId: "B001",
      recipientRole: "broker",
      type: "booking_request",
      message: "New visit request from Rahul Verma for 'Shared PG Near Andheri Station'.",
      bookingId: "B1002",
      propertyTitle: "Shared PG Near Andheri Station",
      read: false
    });

    console.log("✅ Seeded demo booking and broker notification with 2% brokerage recorded");
  }
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Get Current Logged-in User Session
app.get("/api/auth/me", (req, res) => {
  res.json({
    authenticated: Boolean(req.session.user),
    user: req.session.user || null
  });
});

// Google OAuth Client ID endpoint for frontend configuration
app.get("/api/auth/google-client-id", (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    configured: Boolean(process.env.GOOGLE_CLIENT_ID)
  });
});

// Demo OTP Helper for Viva Demonstration (active when SMTP is in offline demo mode)
app.get("/api/auth/demo-otp", async (req, res) => {
  if (mailer) {
    return res.status(403).json({ message: "SMTP is active. OTP was sent to your inbox." });
  }
  const email = String(req.query.email || "").toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user || !user.verificationOtp) {
    return res.status(404).json({ message: "No pending OTP for this account." });
  }
  res.json({ otp: user.verificationOtp, demoMode: true });
});

// User or Broker Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role, phone, agencyName } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: "Name, valid email, and password (min 6 characters) are required." });
    }

    const assignedRole = role === "broker" ? "broker" : "user";
    const normalizedEmail = email.trim().toLowerCase();

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const newUser = await User.create({
      id: "U" + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password: hashPassword(password),
      role: assignedRole,
      phone: phone ? phone.trim() : "",
      agencyName: agencyName ? agencyName.trim() : "",
      emailVerified: false,
      verificationOtp: otp,
      verificationExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    const emailSent = await sendVerificationEmail(newUser.email, newUser.name, otp);

    res.status(201).json({
      requiresVerification: true,
      email: newUser.email,
      role: newUser.role,
      emailSent,
      message: emailSent
        ? "Verification OTP sent to your email."
        : "Email service in demo mode. Check server console for your 6-digit OTP."
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "An error occurred during account creation. Please try again." });
  }
});

// Verify OTP
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.emailVerified) {
      req.session.user = publicUser(user);
      return res.json({ user: req.session.user, message: "Email already verified. Logged in successfully." });
    }

    if (!user.verificationOtp || Date.now() > Number(user.verificationExpires)) {
      return res.status(400).json({ message: "OTP has expired. Please request a new code." });
    }

    if (user.verificationOtp !== otp) {
      return res.status(400).json({ message: "Invalid verification code. Please check and try again." });
    }

    user.emailVerified = true;
    user.verificationOtp = undefined;
    user.verificationExpires = undefined;
    await user.save();

    req.session.user = publicUser(user);
    res.json({
      user: req.session.user,
      message: "Email verified successfully!"
    });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ message: "Failed to verify email." });
  }
});

// Resend OTP
app.post("/api/auth/resend-verification", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verificationOtp = otp;
    user.verificationExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const sent = await sendVerificationEmail(user.email, user.name, otp);
    res.json({
      emailSent: sent,
      message: sent ? "New verification OTP sent to your email." : "Demo mode: OTP printed in server console."
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ message: "Could not send verification email." });
  }
});

// Standard Login (User or Broker)
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.emailVerified && user.role !== "admin") {
      return res.status(403).json({
        message: "Please verify your email address to log in.",
        needsVerification: true,
        email: user.email
      });
    }

    req.session.user = publicUser(user);
    res.json({
      user: req.session.user,
      message: `Welcome back, ${user.name}!`
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// Admin Login
app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email, role: "admin" });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Invalid administrator credentials." });
    }

    req.session.user = publicUser(user);
    res.json({ user: req.session.user, message: "Admin access granted." });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Admin authentication error." });
  }
});

// Google Sign-In (Supports Google Identity Services credential token or demo viva login)
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential, requestedRole, demoUser: isDemo, email: demoEmail, name: demoName } = req.body;
    let googleUser = null;

    if (credential && process.env.GOOGLE_CLIENT_ID) {
      // Decode JWT payload safely
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.email) {
            googleUser = {
              email: payload.email.toLowerCase(),
              name: payload.name || payload.email.split("@")[0],
              sub: payload.sub
            };
          }
        }
      } catch (e) {
        console.error("Google token decode failed:", e);
      }
    }

    // Demo viva fallback mode if Google credentials are not yet configured in .env
    if (!googleUser && (isDemo || demoEmail)) {
      const email = String(demoEmail || "google.demo@gharbazaar.com").toLowerCase().trim();
      googleUser = {
        email,
        name: demoName || "Google User",
        sub: "demo_google_" + Date.now()
      };
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ message: "Invalid Google authentication response." });
    }

    let user = await User.findOne({ email: googleUser.email });
    if (!user) {
      const assignedRole = requestedRole === "broker" ? "broker" : "user";
      user = await User.create({
        id: "U" + Date.now(),
        name: googleUser.name,
        email: googleUser.email,
        role: assignedRole,
        googleId: googleUser.sub,
        emailVerified: true
      });
      console.log(`✅ Created new ${assignedRole} via Google Sign-In: ${user.email}`);
    } else {
      user.emailVerified = true;
      if (!user.googleId) user.googleId = googleUser.sub;
      await user.save();
    }

    req.session.user = publicUser(user);
    res.json({ user: req.session.user, message: "Logged in with Google successfully." });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Google authentication failed." });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Could not log out." });
    res.clearCookie("connect.sid");
    res.json({ ok: true, message: "Logged out successfully." });
  });
});

// ==========================================
// FILE UPLOAD ROUTE (Cloudinary / Local)
// ==========================================

app.post("/api/upload", requireBrokerOrAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please select an image file to upload." });
    }
    const result = await uploadImageFile(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload image. Please try again." });
  }
});

// ==========================================
// PROPERTY MANAGEMENT ROUTES
// ==========================================

// Get All Properties (Publicly searchable & filterable)
app.get("/api/properties", async (req, res) => {
  try {
    const { search, type, maxRent, area, sort, availability } = req.query;
    const filter = {};

    if (type && ["private", "pg", "studio", "apartment"].includes(type)) {
      filter.type = type;
    }
    if (maxRent && Number(maxRent) > 0) {
      filter.price = { $lte: Number(maxRent) };
    }
    if (area) {
      filter.area = String(area).toLowerCase().trim();
    }
    if (availability) {
      filter.availability = availability;
    }

    let query = Property.find(filter);

    if (search) {
      const q = String(search).trim();
      query = query.or([
        { title: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { area: { $regex: q, $options: "i" } },
        { amenities: { $regex: q, $options: "i" } }
      ]);
    }

    if (sort === "low") query = query.sort({ price: 1 });
    else if (sort === "high") query = query.sort({ price: -1 });
    else if (sort === "rating") query = query.sort({ rating: -1 });
    else if (sort === "newest") query = query.sort({ createdAt: -1 });
    else query = query.sort({ featured: -1, rating: -1, createdAt: -1 });

    const properties = await query.lean();
    res.json(properties);
  } catch (err) {
    console.error("Properties fetch error:", err);
    res.status(500).json({ message: "Failed to load properties." });
  }
});

// Backwards compatibility alias for /api/rooms
app.get("/api/rooms", async (req, res) => {
  const properties = await Property.find().sort({ featured: -1, rating: -1 }).lean();
  res.json(properties);
});

// Get Single Property by ID
app.get("/api/properties/:id", async (req, res) => {
  try {
    const property = await Property.findOne({ id: req.params.id }).lean();
    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }
    res.json(property);
  } catch (err) {
    console.error("Property detail error:", err);
    res.status(500).json({ message: "Failed to fetch property details." });
  }
});

// Create New Property Listing (Broker or Admin)
app.post("/api/properties", requireBrokerOrAdmin, upload.single("imageFile"), async (req, res) => {
  try {
    const user = req.session.user;
    const body = req.body;

    let imageUrl = body.image || "";
    let images = [];

    // If an image file was uploaded via form-data
    if (req.file) {
      const uploaded = await uploadImageFile(req.file.buffer, req.file.originalname);
      imageUrl = uploaded.url;
      images.push({ url: uploaded.url, public_id: uploaded.public_id });
    } else if (imageUrl) {
      images.push({ url: imageUrl, public_id: "external" });
    }

    if (!body.title || !body.location || !body.price || !imageUrl) {
      return res.status(400).json({ message: "Title, location, monthly rent, and a property image are required." });
    }

    const amenitiesList = Array.isArray(body.amenities)
      ? body.amenities
      : typeof body.amenities === "string"
      ? body.amenities.split(",").map(a => a.trim()).filter(Boolean)
      : [];

    const newProperty = await Property.create({
      id: "P" + Date.now(),
      brokerId: user.id,
      brokerName: user.name,
      brokerPhone: user.phone || body.brokerPhone || "",
      brokerEmail: user.email,
      agencyName: user.agencyName || body.agencyName || "",
      title: body.title.trim(),
      location: body.location.trim(),
      area: (body.area || body.location.split(",")[0] || "mumbai").toLowerCase().trim(),
      type: body.type || "private",
      price: Number(body.price),
      deposit: Number(body.deposit || 0),
      badge: body.badge || "Verified",
      rating: Number(body.rating || 4.8),
      beds: body.beds || "1 Bed",
      bath: body.bath || "Private Bath",
      size: body.size || "200 sq.ft",
      amenities: amenitiesList,
      image: imageUrl,
      images: images.length ? images : [{ url: imageUrl, public_id: "default" }],
      description: body.description || "",
      availability: body.availability || "available",
      featured: Boolean(body.featured === true || body.featured === "true")
    });

    res.status(201).json({
      property: newProperty,
      message: "Property listing published successfully!"
    });
  } catch (err) {
    console.error("Create property error:", err);
    res.status(500).json({ message: "Failed to create property listing." });
  }
});

// Update Property Listing (Broker can only edit their own; Admin can edit any)
app.put("/api/properties/:id", requireBrokerOrAdmin, upload.single("imageFile"), async (req, res) => {
  try {
    const user = req.session.user;
    const property = await Property.findOne({ id: req.params.id });

    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    // Role ownership check
    if (user.role === "broker" && property.brokerId !== user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own property listings." });
    }

    const body = req.body;
    let imageUrl = property.image;
    let images = property.images || [];

    if (req.file) {
      const uploaded = await uploadImageFile(req.file.buffer, req.file.originalname);
      imageUrl = uploaded.url;
      images = [{ url: uploaded.url, public_id: uploaded.public_id }, ...images];
    } else if (body.image) {
      imageUrl = body.image;
    }

    const amenitiesList = Array.isArray(body.amenities)
      ? body.amenities
      : typeof body.amenities === "string"
      ? body.amenities.split(",").map(a => a.trim()).filter(Boolean)
      : property.amenities;

    property.title = body.title ? body.title.trim() : property.title;
    property.location = body.location ? body.location.trim() : property.location;
    property.area = body.area ? body.area.toLowerCase().trim() : property.area;
    property.type = body.type || property.type;
    property.price = body.price !== undefined ? Number(body.price) : property.price;
    property.deposit = body.deposit !== undefined ? Number(body.deposit) : property.deposit;
    property.beds = body.beds || property.beds;
    property.bath = body.bath || property.bath;
    property.size = body.size || property.size;
    property.amenities = amenitiesList;
    property.image = imageUrl;
    property.images = images;
    property.description = body.description !== undefined ? body.description : property.description;
    property.availability = body.availability || property.availability;
    if (body.badge) property.badge = body.badge;
    if (body.rating !== undefined) property.rating = Number(body.rating);
    if (body.featured !== undefined) property.featured = Boolean(body.featured === true || body.featured === "true");

    await property.save();

    res.json({
      property,
      message: "Property listing updated successfully!"
    });
  } catch (err) {
    console.error("Update property error:", err);
    res.status(500).json({ message: "Failed to update property listing." });
  }
});

// Toggle Property Availability (Available / Unavailable / Booked)
app.patch("/api/properties/:id/availability", requireBrokerOrAdmin, async (req, res) => {
  try {
    const user = req.session.user;
    const property = await Property.findOne({ id: req.params.id });

    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    if (user.role === "broker" && property.brokerId !== user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only modify your own listings." });
    }

    const nextStatus = req.body.availability || (property.availability === "available" ? "unavailable" : "available");
    property.availability = nextStatus;
    await property.save();

    res.json({
      id: property.id,
      availability: property.availability,
      message: `Property marked as ${property.availability}.`
    });
  } catch (err) {
    console.error("Availability toggle error:", err);
    res.status(500).json({ message: "Failed to toggle property availability." });
  }
});

// Delete Property Listing (Broker can only delete their own; Admin can delete any)
app.delete("/api/properties/:id", requireBrokerOrAdmin, async (req, res) => {
  try {
    const user = req.session.user;
    const property = await Property.findOne({ id: req.params.id });

    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    if (user.role === "broker" && property.brokerId !== user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own listings." });
    }

    // Optional Cloudinary clean-up if public_id exists
    if (hasCloudinary && property.images && property.images.length) {
      for (const img of property.images) {
        if (img.public_id && img.public_id !== "external" && img.public_id !== "default") {
          try {
            await cloudinary.uploader.destroy(img.public_id);
          } catch (e) {
            console.error("Cloudinary delete error:", e.message);
          }
        }
      }
    }

    await Property.deleteOne({ id: property.id });
    res.json({ ok: true, message: "Property listing removed successfully." });
  } catch (err) {
    console.error("Delete property error:", err);
    res.status(500).json({ message: "Failed to delete property listing." });
  }
});

// Backwards compatibility room endpoints
app.post("/api/rooms", requireAdmin, async (req, res) => {
  const room = await Property.create({ ...req.body, id: "R" + Date.now(), brokerId: req.session.user.id, brokerName: req.session.user.name });
  res.status(201).json(room.toObject());
});
app.put("/api/rooms/:id", requireAdmin, async (req, res) => {
  const room = await Property.findOneAndUpdate({ id: req.params.id }, { ...req.body }, { new: true }).lean();
  res.json(room);
});
app.delete("/api/rooms/:id", requireAdmin, async (req, res) => {
  await Property.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// ==========================================
// BROKER PORTAL ROUTES
// ==========================================

// Broker Profile & Performance Summary
app.get("/api/broker/profile", requireBroker, async (req, res) => {
  try {
    const brokerId = req.session.user.id;
    const myProperties = await Property.find({ brokerId }).lean();
    const myBookings = await Booking.find({ brokerId }).lean();

    const completedBookings = myBookings.filter(b => b.status === "completed");
    const totalBrokerage = completedBookings.reduce((sum, b) => sum + (Number(b.brokerageAmount) || 0), 0);

    res.json({
      user: req.session.user,
      stats: {
        totalListings: myProperties.length,
        availableListings: myProperties.filter(p => p.availability === "available").length,
        totalRequests: myBookings.length,
        pendingRequests: myBookings.filter(b => b.status === "pending").length,
        completedDeals: completedBookings.length,
        totalBrokerageEarned: totalBrokerage
      }
    });
  } catch (err) {
    console.error("Broker profile error:", err);
    res.status(500).json({ message: "Could not load broker profile." });
  }
});

// Get Only Current Broker's Properties
app.get("/api/broker/properties", requireBroker, async (req, res) => {
  try {
    const brokerId = req.session.user.id;
    const properties = await Property.find({ brokerId }).sort({ createdAt: -1 }).lean();
    res.json(properties);
  } catch (err) {
    console.error("Broker properties error:", err);
    res.status(500).json({ message: "Failed to load broker properties." });
  }
});

// Get Bookings & Visit Requests for Current Broker
app.get("/api/broker/bookings", requireBroker, async (req, res) => {
  try {
    const brokerId = req.session.user.id;
    const bookings = await Booking.find({ brokerId }).sort({ createdAt: -1 }).lean();
    res.json(bookings);
  } catch (err) {
    console.error("Broker bookings error:", err);
    res.status(500).json({ message: "Failed to load booking requests." });
  }
});

// Get Broker Notifications
app.get("/api/broker/notifications", requireBroker, async (req, res) => {
  try {
    const brokerId = req.session.user.id;
    const notifications = await Notification.find({ recipientId: brokerId }).sort({ createdAt: -1 }).limit(20).lean();
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Broker notifications error:", err);
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

// Mark Single Notification as Read
app.patch("/api/broker/notifications/:id/read", requireBroker, async (req, res) => {
  try {
    await Notification.updateOne({ id: req.params.id, recipientId: req.session.user.id }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notification read." });
  }
});

// Mark All Broker Notifications as Read
app.post("/api/broker/notifications/read-all", requireBroker, async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.session.user.id }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notifications read." });
  }
});

// ==========================================
// BOOKING / VISIT REQUEST & MEDIATOR WORKFLOW
// ==========================================

// User Submits a Booking / Visit Request
app.post("/api/bookings", requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { propertyId, requestType, requestedDate, message, userPhone } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: "Property ID is required." });
    }

    const property = await Property.findOne({ id: propertyId });
    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    if (property.brokerId === user.id) {
      return res.status(400).json({ message: "You cannot book or request a visit for your own property." });
    }

    const bookingId = "B" + Date.now();
    const type = requestType === "visit" ? "visit" : "booking";

    const newBooking = await Booking.create({
      id: bookingId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: userPhone || user.phone || "",
      brokerId: property.brokerId,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyLocation: property.location,
      propertyPrice: property.price,
      requestType: type,
      requestedDate: requestedDate || "As soon as possible",
      message: message ? message.trim() : "",
      status: "pending",
      agreedAmount: property.price,
      brokerageRate: 0.02,
      brokerageAmount: 0 // Recorded when deal completes
    });

    // Notify the Broker in MongoDB
    await Notification.create({
      id: "N" + Date.now(),
      recipientId: property.brokerId,
      recipientRole: "broker",
      type: "booking_request",
      message: `New ${type} request from ${user.name} for "${property.title}".`,
      bookingId: newBooking.id,
      propertyTitle: property.title,
      read: false
    });

    res.status(201).json({
      booking: newBooking,
      message: `Your ${type} request has been submitted! The broker has been notified.`
    });
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ message: "Failed to submit booking request." });
  }
});

// Backwards compatibility alias for inquiries
app.post("/api/inquiries", requireAuth, async (req, res) => {
  try {
    const booking = await Booking.create({
      id: "I" + Date.now(),
      userId: req.session.user.id,
      userName: req.session.user.name,
      userEmail: req.session.user.email,
      brokerId: req.body.brokerId || "B001",
      propertyId: req.body.roomId || "P001",
      propertyTitle: req.body.roomTitle || "Inquiry Listing",
      requestType: "visit",
      message: req.body.message || "Inquiry from website",
      status: "pending"
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Inquiry submission failed." });
  }
});

app.get("/api/inquiries", requireAdmin, async (req, res) => {
  const list = await Booking.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

// User Views Their Own Bookings
app.get("/api/bookings/my", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json(bookings);
  } catch (err) {
    console.error("My bookings error:", err);
    res.status(500).json({ message: "Failed to load your bookings." });
  }
});

// Update Booking Status (Broker or Admin)
// IMPORTANT: Marks Deal Completed and Calculates 2% Brokerage
app.patch("/api/bookings/:id/status", requireBrokerOrAdmin, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, agreedAmount } = req.body;
    const validStatuses = ["pending", "accepted", "rejected", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    const booking = await Booking.findOne({ id: req.params.id });
    if (!booking) {
      return res.status(404).json({ message: "Booking request not found." });
    }

    // Broker authorization check
    if (user.role === "broker" && booking.brokerId !== user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only manage requests for your own listings." });
    }

    booking.status = status;

    // When deal is marked COMPLETED:
    // Calculate and record the 2% brokerage amount
    if (status === "completed") {
      const finalDealAmount = Number(agreedAmount) || booking.agreedAmount || booking.propertyPrice || 0;
      booking.agreedAmount = finalDealAmount;
      booking.brokerageRate = 0.02; // 2%
      booking.brokerageAmount = Math.round(finalDealAmount * 0.02);
      booking.completedAt = new Date();

      // Optionally update property status to booked
      await Property.updateOne({ id: booking.propertyId }, { availability: "booked" });
    }

    await booking.save();

    // Notify User about status update
    await Notification.create({
      id: "N" + Date.now(),
      recipientId: booking.userId,
      recipientRole: "user",
      type: "booking_status",
      message: `Your ${booking.requestType} for "${booking.propertyTitle}" has been marked as "${status}".`,
      bookingId: booking.id,
      propertyTitle: booking.propertyTitle,
      read: false
    });

    res.json({
      booking,
      message: status === "completed"
        ? `Deal completed! 2% Brokerage of ₹${booking.brokerageAmount.toLocaleString("en-IN")} recorded.`
        : `Booking request updated to "${status}".`
    });
  } catch (err) {
    console.error("Booking status update error:", err);
    res.status(500).json({ message: "Failed to update booking status." });
  }
});

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT ROUTES
// ==========================================

// Admin Platform Statistics
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [
      usersCount,
      brokersCount,
      properties,
      bookings
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "broker" }),
      Property.find().lean(),
      Booking.find().lean()
    ]);

    const completedBookings = bookings.filter(b => b.status === "completed");
    const totalBrokerage = completedBookings.reduce((sum, b) => sum + (Number(b.brokerageAmount) || 0), 0);
    const avgRent = properties.length
      ? Math.round(properties.reduce((sum, p) => sum + Number(p.price || 0), 0) / properties.length)
      : 0;

    res.json({
      users: usersCount,
      brokers: brokersCount,
      properties: properties.length,
      bookings: bookings.length,
      completedDeals: completedBookings.length,
      totalBrokerage,
      avgRent,
      availableProperties: properties.filter(p => p.availability === "available").length,
      bookedProperties: properties.filter(p => p.availability === "booked").length
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Failed to fetch platform statistics." });
  }
});

// Admin Users List
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to load users." });
  }
});

// Admin Brokers List
app.get("/api/admin/brokers", requireAdmin, async (req, res) => {
  try {
    const brokers = await User.find({ role: "broker" }).select("-password").sort({ createdAt: -1 }).lean();
    res.json(brokers);
  } catch (err) {
    res.status(500).json({ message: "Failed to load brokers." });
  }
});

// Admin Properties List
app.get("/api/admin/properties", requireAdmin, async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 }).lean();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: "Failed to load all properties." });
  }
});

// Admin Bookings List
app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to load all bookings." });
  }
});

// ==========================================
// FRONTEND PAGE ROUTE SERVING
// ==========================================

// Clean friendly URLs
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "index.html")));
app.get("/properties", (req, res) => res.sendFile(path.join(PUBLIC, "properties.html")));
app.get("/property.html", (req, res) => res.sendFile(path.join(PUBLIC, "property.html")));
app.get("/login", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(PUBLIC, "signup.html")));
app.get("/verify-email", (req, res) => res.sendFile(path.join(PUBLIC, "verify-email.html")));

app.get("/broker-login", (req, res) => res.sendFile(path.join(PUBLIC, "broker-login.html")));
app.get("/broker-signup", (req, res) => res.sendFile(path.join(PUBLIC, "broker-signup.html")));
app.get(["/broker-dashboard", "/broker-dashboard.html"], requireBroker, (req, res) => {
  res.sendFile(path.join(PUBLIC, "broker-dashboard.html"));
});
app.get(["/add-property", "/add-property.html"], requireBroker, (req, res) => {
  res.sendFile(path.join(PUBLIC, "add-property.html"));
});

app.get(["/user-dashboard", "/user-dashboard.html"], requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC, "user-dashboard.html"));
});

app.get(["/admin", "/admin.html"], requireAdmin, (req, res) => {
  res.sendFile(path.join(PUBLIC, "admin.html"));
});
app.get(["/admin-login", "/admin-login.html"], (req, res) => {
  res.sendFile(path.join(PUBLIC, "admin-login.html"));
});

// Legacy /app route redirects to user dashboard or home
app.get("/app", (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === "broker") return res.redirect("/broker-dashboard.html");
    if (req.session.user.role === "admin") return res.redirect("/admin.html");
    return res.redirect("/user-dashboard.html");
  }
  res.redirect("/login.html");
});

// Static assets
app.use(express.static(PUBLIC));

// 404 Handler for APIs
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

// Global Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC, "index.html"));
});

// Start Server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Ghar Bazaar Server running at http://localhost:${PORT}`);
      console.log(`🌐 Public Landing Page: http://localhost:${PORT}`);
      console.log(`🏢 Broker Portal:       http://localhost:${PORT}/broker-dashboard.html`);
      console.log(`👤 User Dashboard:      http://localhost:${PORT}/user-dashboard.html`);
      console.log(`🛠️  Admin Dashboard:     http://localhost:${PORT}/admin.html`);
      console.log(`======================================================\n`);
    });
  })
  .catch(err => {
    console.error("❌ Fatal Startup Error:", err.message);
    process.exit(1);
  });

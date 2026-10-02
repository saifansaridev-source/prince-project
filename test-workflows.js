// Comprehensive Verification Script for Ghar Bazaar
const assert = require("assert");

const BASE = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Starting Ghar Bazaar Verification Tests...\n");

  // Helper for requests maintaining cookies (session)
  class SessionClient {
    constructor() {
      this.cookies = "";
    }
    async request(path, options = {}) {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
      };
      if (this.cookies) {
        headers["Cookie"] = this.cookies;
      }
      const res = await fetch(`${BASE}${path}`, { ...options, headers });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        this.cookies = setCookie.split(";")[0];
      }
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data, headers: res.headers };
    }
  }

  // TEST 1: User Signup, Verification, Login
  console.log("▶ TEST 1: User signup, email verification, and login");
  const userClient = new SessionClient();
  const testEmail = `testuser_${Date.now()}@example.com`;
  
  // Signup
  const signupRes = await userClient.request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Amit Patel",
      email: testEmail,
      password: "UserPass@123",
      role: "user",
      phone: "+91 99999 11111"
    })
  });
  assert.strictEqual(signupRes.status, 201, "User signup should return 201");
  assert.strictEqual(signupRes.data.requiresVerification, true);
  console.log("  ✓ User signup created pending user with OTP requirement");

  // Get user from DB to read OTP for testing verification
  const mongoose = require("mongoose");
  require("dotenv").config();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  const userCol = mongoose.connection.collection("users");
  const createdUser = await userCol.findOne({ email: testEmail });
  assert(createdUser && createdUser.verificationOtp, "User record must have verificationOtp");
  
  // Verify OTP
  const verifyRes = await userClient.request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email: testEmail, otp: createdUser.verificationOtp })
  });
  assert.strictEqual(verifyRes.status, 200, "Verify email should return 200");
  assert.strictEqual(verifyRes.data.user.emailVerified, true);
  console.log("  ✓ Email verified successfully and user logged in");

  // TEST 2: Google Login
  console.log("\n▶ TEST 2: Google Sign-In simulation");
  const googleClient = new SessionClient();
  const googleRes = await googleClient.request("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({
      demoUser: true,
      email: `google_${Date.now()}@gmail.com`,
      name: "Google Renter Demo",
      requestedRole: "user"
    })
  });
  assert.strictEqual(googleRes.status, 200);
  assert.strictEqual(googleRes.data.user.emailVerified, true);
  console.log("  ✓ Google login returned active verified user session");

  // TEST 3: Broker Login
  console.log("\n▶ TEST 3: Broker login & broker dashboard access");
  const broker1 = new SessionClient();
  const brokerLoginRes = await broker1.request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "rajesh.broker@gharbazaar.com",
      password: "Broker@123"
    })
  });
  assert.strictEqual(brokerLoginRes.status, 200);
  assert.strictEqual(brokerLoginRes.data.user.role, "broker");
  
  const brokerProfile = await broker1.request("/api/broker/profile");
  assert.strictEqual(brokerProfile.status, 200);
  console.log(`  ✓ Broker logged in. Active listings: ${brokerProfile.data.stats.totalListings}`);

  // TEST 4: Broker Adds Property
  console.log("\n▶ TEST 4: Broker adds new property listing");
  const newPropRes = await broker1.request("/api/properties", {
    method: "POST",
    body: JSON.stringify({
      title: "Spacious 1BHK in Malad Link Road",
      type: "apartment",
      location: "Malad West, Mumbai",
      area: "malad",
      price: 21000,
      deposit: 42000,
      beds: "1 Bed",
      bath: "Private Bath",
      size: "420 sq.ft",
      amenities: ["WiFi", "AC", "Lift", "Parking"],
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      description: "Sunlit apartment near Inorbit Mall and metro."
    })
  });
  assert.strictEqual(newPropRes.status, 201);
  const createdPropId = newPropRes.data.property.id;
  console.log(`  ✓ Property added with ID: ${createdPropId}`);

  // Verify it appears in public catalog
  const publicProps = await userClient.request(`/api/properties?search=Spacious%201BHK`);
  assert(publicProps.data.some(p => p.id === createdPropId), "New property must appear in search");
  console.log("  ✓ Property successfully queryable in live public catalog");

  // TEST 5: Broker Edits Own Property
  console.log("\n▶ TEST 5: Broker edits own property");
  const editRes = await broker1.request(`/api/properties/${createdPropId}`, {
    method: "PUT",
    body: JSON.stringify({
      price: 22500,
      description: "Updated description with latest furnishings."
    })
  });
  assert.strictEqual(editRes.status, 200);
  assert.strictEqual(editRes.data.property.price, 22500);
  console.log("  ✓ Broker successfully edited own property rent to ₹22,500");

  // TEST 6: Broker Cannot Edit Another Broker's Property
  console.log("\n▶ TEST 6: Broker authorization enforcement");
  const broker2 = new SessionClient();
  await broker2.request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "sunita.broker@gharbazaar.com",
      password: "Broker@123"
    })
  });
  const unauthEditRes = await broker2.request(`/api/properties/${createdPropId}`, {
    method: "PUT",
    body: JSON.stringify({ price: 1000 })
  });
  assert.strictEqual(unauthEditRes.status, 403, "Must return 403 when broker modifies another's listing");
  console.log("  ✓ Unauthorized property edit successfully blocked with 403");

  // TEST 7: User Submits Booking Request
  console.log("\n▶ TEST 7: User submits booking request");
  const bookingRes = await userClient.request("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      propertyId: createdPropId,
      requestType: "booking",
      requestedDate: "First of next month",
      message: "Ready to pay security deposit and move in immediately.",
      userPhone: "+91 99999 11111"
    })
  });
  assert.strictEqual(bookingRes.status, 201);
  const bookingId = bookingRes.data.booking.id;
  assert.strictEqual(bookingRes.data.booking.status, "pending");
  console.log(`  ✓ Booking request created with ID: ${bookingId}`);

  // TEST 8: Broker Receives Notification
  console.log("\n▶ TEST 8: Broker receives booking notification");
  const notifRes = await broker1.request("/api/broker/notifications");
  assert.strictEqual(notifRes.status, 200);
  const matchingNotif = notifRes.data.notifications.find(n => n.bookingId === bookingId);
  assert(matchingNotif, "Broker must have a notification for the booking request");
  console.log(`  ✓ Broker received notification: "${matchingNotif.message}"`);

  // TEST 9: Broker Accepts Booking
  console.log("\n▶ TEST 9: Broker accepts booking");
  const acceptRes = await broker1.request(`/api/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "accepted" })
  });
  assert.strictEqual(acceptRes.status, 200);
  assert.strictEqual(acceptRes.data.booking.status, "accepted");
  console.log("  ✓ Booking status changed to 'accepted'");

  // TEST 10: Broker Marks Completed -> 2% Brokerage Recorded
  console.log("\n▶ TEST 10: Deal completion and 2% brokerage recording");
  const completeRes = await broker1.request(`/api/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "completed",
      agreedAmount: 22000
    })
  });
  assert.strictEqual(completeRes.status, 200);
  assert.strictEqual(completeRes.data.booking.status, "completed");
  assert.strictEqual(completeRes.data.booking.brokerageRate, 0.02);
  const expectedBrokerage = Math.round(22000 * 0.02); // ₹440
  assert.strictEqual(completeRes.data.booking.brokerageAmount, expectedBrokerage);
  console.log(`  ✓ Deal completed. Agreed Amount: ₹22,000 -> 2% Brokerage Recorded: ₹${expectedBrokerage}`);

  // TEST 11: Admin Dashboard Statistics
  console.log("\n▶ TEST 11: Admin dashboard statistics and brokerage ledger");
  const adminClient = new SessionClient();
  const adminLoginRes = await adminClient.request("/api/auth/admin-login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@gharbazaar.com",
      password: "Admin@123"
    })
  });
  assert.strictEqual(adminLoginRes.status, 200);

  const adminStats = await adminClient.request("/api/admin/stats");
  assert.strictEqual(adminStats.status, 200);
  assert(adminStats.data.users > 0, "Users count > 0");
  assert(adminStats.data.brokers >= 3, "Brokers count >= 3");
  assert(adminStats.data.completedDeals >= 2, "Completed deals recorded");
  assert(adminStats.data.totalBrokerage > 0, "Total brokerage recorded > 0");
  console.log(`  ✓ Admin Stats Verified:`);
  console.log(`    • Total Users: ${adminStats.data.users}`);
  console.log(`    • Total Brokers: ${adminStats.data.brokers}`);
  console.log(`    • Total Properties: ${adminStats.data.properties}`);
  console.log(`    • Completed Deals: ${adminStats.data.completedDeals}`);
  console.log(`    • Total 2% Brokerage Recorded: ₹${adminStats.data.totalBrokerage}`);

  // TEST 12: Logout
  console.log("\n▶ TEST 12: Logout verification");
  const logoutRes = await userClient.request("/api/auth/logout", { method: "POST" });
  assert.strictEqual(logoutRes.status, 200);
  const checkAuth = await userClient.request("/api/auth/me");
  assert.strictEqual(checkAuth.data.authenticated, false);
  console.log("  ✓ Session destroyed on logout");

  // TEST 13: Unauthorized Route Protection
  console.log("\n▶ TEST 13: Protected API security enforcement");
  const unauthProp = await userClient.request("/api/broker/profile");
  assert.strictEqual(unauthProp.status, 401, "Unauthenticated broker profile access must return 401");
  const unauthAdmin = await userClient.request("/api/admin/stats");
  assert.strictEqual(unauthAdmin.status, 401, "Unauthenticated admin stats must return 401");
  console.log("  ✓ Protected broker and admin APIs securely guarded");

  console.log("\n🎉 ALL 13 TEST CASES PASSED WITH 100% SUCCESS!\n");
  process.exit(0);
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

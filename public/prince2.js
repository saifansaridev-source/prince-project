const DEFAULT_ROOMS = [
  {id:"R001",title:"Furnished Private Room in Malad West",location:"Malad West, Mumbai",area:"malad",type:"private",price:12500,badge:"Verified",rating:4.9,beds:"1 Bed",bath:"Private Bath",size:"180 sq.ft",amenities:["WiFi","AC","Wardrobe","Attached Bath"],image:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85",description:"Bright furnished private room in a convenient residential area, suitable for students and working professionals.",featured:true},
  {id:"R002",title:"Shared PG Near Andheri Station",location:"Andheri East, Mumbai",area:"andheri",type:"pg",price:9800,badge:"Popular",rating:4.8,beds:"2 Beds",bath:"Shared Bath",size:"220 sq.ft",amenities:["WiFi","Food Available","Metro Nearby","Housekeeping"],image:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=85",description:"Affordable PG with quick access to Andheri station, ideal for students and professionals.",featured:true},
  {id:"R003",title:"Premium Studio Apartment",location:"Borivali West, Mumbai",area:"borivali",type:"studio",price:16000,badge:"Luxury",rating:4.9,beds:"1 Bed",bath:"Private Bath",size:"320 sq.ft",amenities:["Balcony","Lift","Parking","AC"],image:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=85",description:"Modern studio with balcony and parking, designed for comfortable independent living.",featured:true},
  {id:"R004",title:"Cozy PG for Working Professionals",location:"Goregaon East, Mumbai",area:"goregaon",type:"pg",price:8500,badge:"Value",rating:4.6,beds:"2 Beds",bath:"Shared Bath",size:"210 sq.ft",amenities:["WiFi","Food","Power Backup","Security"],image:"https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=85",description:"Practical PG option with essential amenities and easy access to local transport.",featured:false},
  {id:"R005",title:"Modern Private Room Near Metro",location:"Kandivali West, Mumbai",area:"kandivali",type:"private",price:11000,badge:"Verified",rating:4.7,beds:"1 Bed",bath:"Private Bath",size:"190 sq.ft",amenities:["WiFi","Metro Nearby","Wardrobe","Fan"],image:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=82",description:"Clean private room with convenient metro connectivity and essential furnishings.",featured:false},
  {id:"R006",title:"Executive Studio with Balcony",location:"Thane West, Mumbai",area:"thane",type:"studio",price:19500,badge:"Premium",rating:4.8,beds:"1 Bed",bath:"Private Bath",size:"380 sq.ft",amenities:["Balcony","AC","Lift","Parking"],image:"https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=85",description:"Spacious studio with modern interiors, balcony and parking for a premium rental experience.",featured:true},
  {id:"R007",title:"Student-Friendly PG",location:"Vile Parle East, Mumbai",area:"vileparle",type:"pg",price:9000,badge:"Student Pick",rating:4.7,beds:"2 Beds",bath:"Shared Bath",size:"230 sq.ft",amenities:["WiFi","Food","Study Desk","Security"],image:"https://images.unsplash.com/photo-1529408632839-a54952c491e5?auto=format&fit=crop&w=1000&q=85",description:"Student-friendly PG with study space, food options and a convenient neighbourhood.",featured:false},
  {id:"R008",title:"Fully Furnished Private Room",location:"Jogeshwari West, Mumbai",area:"jogeshwari",type:"private",price:13500,badge:"New",rating:4.8,beds:"1 Bed",bath:"Private Bath",size:"205 sq.ft",amenities:["WiFi","AC","TV","Housekeeping"],image:"https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1000&q=85",description:"Move-in ready private room with comfortable furniture and regular housekeeping support.",featured:false},
  {id:"R009",title:"Budget PG Near Local Train",location:"Dahisar East, Mumbai",area:"dahisar",type:"pg",price:7800,badge:"Budget",rating:4.5,beds:"3 Beds",bath:"Shared Bath",size:"250 sq.ft",amenities:["WiFi","Train Nearby","Food","Security"],image:"https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1000&q=85",description:"One of the budget-friendly choices for renters who want easy local train connectivity.",featured:false},
  {id:"R010",title:"Luxury Private Room",location:"Powai, Mumbai",area:"powai",type:"private",price:22000,badge:"Luxury",rating:5.0,beds:"1 Bed",bath:"Private Bath",size:"260 sq.ft",amenities:["AC","WiFi","Gym","Parking"],image:"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85",description:"Premium private room in Powai with lifestyle amenities and a polished interior.",featured:true},
  {id:"R011",title:"Compact Studio for Professionals",location:"Mulund West, Mumbai",area:"mulund",type:"studio",price:17500,badge:"Verified",rating:4.7,beds:"1 Bed",bath:"Private Bath",size:"300 sq.ft",amenities:["Lift","AC","Kitchenette","Security"],image:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=85",description:"Compact studio with kitchenette, lift and security for an independent lifestyle.",featured:false},
  {id:"R012",title:"Affordable Furnished Room",location:"Mira Road, Mumbai",area:"miraroad",type:"private",price:9500,badge:"Value",rating:4.6,beds:"1 Bed",bath:"Shared Bath",size:"200 sq.ft",amenities:["WiFi","Wardrobe","Parking","Fan"],image:"https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1000&q=85",description:"Affordable furnished room with useful everyday amenities and parking availability.",featured:false}
];

const FAV_KEY = "Ghar BazaarFavoritesV3";
const COMPARE_KEY = "Ghar BazaarCompareV3";
async function getRooms(){const r=await fetch("/api/rooms"); if(!r.ok){if(r.status===401){location.href="/login.html";} throw new Error("Unable to load rooms");} return r.json();}
function getFavorites(){try{return JSON.parse(localStorage.getItem(FAV_KEY))||[]}catch{return []}}
function saveFavorites(list){localStorage.setItem(FAV_KEY,JSON.stringify(list))}
let rooms=[];
let favorites=getFavorites();
let compare=(()=>{try{return JSON.parse(localStorage.getItem(COMPARE_KEY))||[]}catch{return []}})();
let currentModalRoom=null;
const grid = document.getElementById("listingsGrid");
const emptyState = document.getElementById("emptyState");
const resultsCount = document.getElementById("resultsCount");
const statRooms = document.getElementById("statRooms");
const toast = document.getElementById("toast");

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function typeLabel(type) {
  return type === "pg" ? "PG Room" : type === "studio" ? "Studio Apartment" : "Private Room";
}

function renderRooms() {
  if (!grid) return;

  const q = (document.getElementById("citySearch")?.value || "").trim().toLowerCase();
  const type = document.getElementById("roomType")?.value || "";
  const budget = Number(document.getElementById("budget")?.value || 0);
  const sort = document.getElementById("sortRooms")?.value || "featured";

  let filtered = rooms.filter(r => {
    const text = `${r.title} ${r.location} ${r.area} ${r.amenities.join(" ")}`.toLowerCase();
    return (!q || text.includes(q)) && (!type || r.type === type) && (!budget || Number(r.price) <= budget);
  });

  if (sort === "low") filtered.sort((a,b) => a.price-b.price);
  if (sort === "high") filtered.sort((a,b) => b.price-a.price);
  if (sort === "rating") filtered.sort((a,b) => b.rating-a.rating);
  if (sort === "featured") filtered.sort((a,b) => Number(b.featured)-Number(a.featured) || b.rating-a.rating);

  resultsCount.textContent = `${filtered.length} room${filtered.length === 1 ? "" : "s"} found`;
  statRooms.textContent = `${rooms.length}+`;

  grid.innerHTML = filtered.map(roomCard).join("");
  emptyState.hidden = filtered.length !== 0;
  document.querySelectorAll(".favorite-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.id));
  });
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openRoomModal(btn.dataset.id));
  });
  document.querySelectorAll(".compare-check").forEach(box => {
    box.addEventListener("change", () => toggleCompare(box.dataset.id, box.checked));
  });
  document.querySelectorAll(".inquiry-btn").forEach(btn => {
    btn.addEventListener("click", () => sendWhatsApp(btn.dataset.id));
  });
  updateCompareBar();
}

function roomCard(room) {
  const fav = favorites.includes(room.id);
  const selected = compare.includes(room.id);
  return `
  <article class="listing-card">
    <div class="image-wrap">
      <img src="${room.image}" class="listing-img" alt="${escapeHtml(room.title)}" loading="lazy">
      <span class="listing-badge">${escapeHtml(room.badge || "Verified")}</span>
      <button class="favorite-btn ${fav ? "active" : ""}" data-id="${room.id}" aria-label="Favourite room">${fav ? "♥" : "♡"}</button>
      <div class="image-type">${typeLabel(room.type)}</div>
    </div>
    <div class="listing-content">
      <div class="card-price-row"><div class="price">${money(room.price)} <small>/ month</small></div><span class="rating">★ ${room.rating}</span></div>
      <h3>${escapeHtml(room.title)}</h3>
      <div class="location">📍 ${escapeHtml(room.location)}</div>
      <div class="details">
        <span>${escapeHtml(room.beds || "1 Bed")}</span>
        <span>${escapeHtml(room.bath || "Private Bath")}</span>
        <span>${escapeHtml(room.size || "—")}</span>
      </div>
      <div class="amenity-preview">${(room.amenities || []).slice(0,3).map(a => `<span>${escapeHtml(a)}</span>`).join("")}</div>
      <div class="card-actions">
        <button class="btn-outline view-btn" data-id="${room.id}">View Details</button>
        <button class="btn-primary inquiry-btn" data-id="${room.id}">Inquiry</button>
      </div>
      <label class="compare-label"><input type="checkbox" class="compare-check" data-id="${room.id}" ${selected ? "checked" : ""}> Add to compare</label>
    </div>
  </article>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function toggleFavorite(id) {
  favorites = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
  saveFavorites(favorites);
  renderRooms();
  showToast(favorites.includes(id) ? "♥ Added to favourites" : "Removed from favourites");
}

function toggleCompare(id, checked) {
  if (checked) {
    if (compare.length >= 3) {
      showToast("You can compare up to 3 rooms.");
      renderRooms();
      return;
    }
    if (!compare.includes(id)) compare.push(id);
  } else {
    compare = compare.filter(x => x !== id);
  }
  localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
  updateCompareBar();
}

function updateCompareBar() {
  const bar = document.getElementById("compareBar");
  const count = document.getElementById("compareCount");
  if (!bar) return;
  count.textContent = compare.length;
  bar.classList.toggle("visible", compare.length > 0);
}

function openRoomModal(id) {
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  currentModalRoom = room;
  document.getElementById("modalImage").src = room.image;
  document.getElementById("modalImage").alt = room.title;
  document.getElementById("modalBadge").textContent = room.badge || "Verified";
  document.getElementById("modalRating").textContent = `★ ${room.rating}`;
  document.getElementById("modalTitle").textContent = room.title;
  document.getElementById("modalLocation").textContent = `📍 ${room.location} · ${typeLabel(room.type)}`;
  document.getElementById("modalPrice").textContent = `${money(room.price)} / month`;
  document.getElementById("modalDescription").textContent = room.description || "Verified room listing.";
  document.getElementById("modalAmenities").innerHTML = (room.amenities || []).map(a => `<span>${escapeHtml(a)}</span>`).join("");
  document.getElementById("roomModal").classList.add("open");
  document.getElementById("roomModal").setAttribute("aria-hidden", "false");
}

function closeRoomModal() {
  document.getElementById("roomModal")?.classList.remove("open");
}

async function sendWhatsApp(id) {
  const me = await fetch("/api/auth/me"); if(!me.ok || !(await me.json()).authenticated){ location.href="/login.html"; return; }
  const room = typeof id === "string" ? rooms.find(r => r.id === id) : currentModalRoom;
  if (!room) return;
  const phone = "917977930331"; // Replace with your WhatsApp number
  const message = `🏠 Ghar Bazaar Inquiry\n\nRoom: ${room.title}\nLocation: ${room.location}\nRent: ${money(room.price)}/month\n\nI would like more details / a visit.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

async function requestVisit() {
  if (!currentModalRoom) return;
  const response = await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId:currentModalRoom.id,roomTitle:currentModalRoom.title,type:"visit"})});
  if(!response.ok){ if(response.status===401) location.href="/login.html"; return; }
  const message = `Visit request received for ${currentModalRoom.title}. Please contact the customer.`;
  showToast("✓ Visit request prepared");
  const phone = "917977930331";
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

function openCompare() {
  const selected = compare.map(id => rooms.find(r => r.id === id)).filter(Boolean);
  if (!selected.length) return;
  document.getElementById("compareGrid").innerHTML = selected.map(r => `
    <div class="compare-item">
      <img src="${r.image}" alt="${escapeHtml(r.title)}">
      <h3>${escapeHtml(r.title)}</h3>
      <strong>${money(r.price)}/mo</strong>
      <p>★ ${r.rating}</p>
      <p>${escapeHtml(r.location)}</p>
      <p>${typeLabel(r.type)}</p>
      <div>${(r.amenities || []).map(a => `<span>${escapeHtml(a)}</span>`).join("")}</div>
    </div>
  `).join("");
  document.getElementById("compareModal").classList.add("open");
}

function clearFilters() {
  document.getElementById("citySearch").value = "";
  document.getElementById("roomType").value = "";
  document.getElementById("budget").value = "";
  document.getElementById("sortRooms").value = "featured";
  renderRooms();
}

document.getElementById("searchBtn")?.addEventListener("click", () => {
  renderRooms();
  document.getElementById("listings")?.scrollIntoView({behavior:"smooth"});
});
["citySearch","roomType","budget","sortRooms"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", renderRooms);
  document.getElementById(id)?.addEventListener("change", renderRooms);
});
document.getElementById("clearFilters")?.addEventListener("click", clearFilters);
document.getElementById("emptyClear")?.addEventListener("click", clearFilters);
document.getElementById("compareBtn")?.addEventListener("click", openCompare);
document.getElementById("compareClear")?.addEventListener("click", () => {
  compare = [];
  localStorage.setItem(COMPARE_KEY, "[]");
  renderRooms();
});
document.querySelectorAll("[data-close-modal]").forEach(x => x.addEventListener("click", closeRoomModal));
document.querySelectorAll("[data-close-compare]").forEach(x => x.addEventListener("click", () => document.getElementById("compareModal").classList.remove("open")));
document.getElementById("modalWhatsApp")?.addEventListener("click", () => sendWhatsApp());
document.getElementById("modalVisit")?.addEventListener("click", requestVisit);

document.getElementById("contactForm")?.addEventListener("submit", e => {
  e.preventDefault();
  fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e.target.querySelector("textarea")?.value||"Website inquiry",type:"contact"})}).then(r=>{if(r.status===401) location.href="/login.html"; else showToast("✓ Inquiry sent successfully. Our agent will contact you.");});
  e.target.reset();
});

document.getElementById("mobileMenu")?.addEventListener("click", () => {
  document.getElementById("navRight")?.classList.toggle("open");
});

document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => document.getElementById("navRight")?.classList.remove("open")));

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeRoomModal();
    document.getElementById("compareModal")?.classList.remove("open");
  }
});


// User logout: destroy the server-side session, then return to the public home page.
async function logoutUser() {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Logout failed");
    window.location.href = "/";
  } catch (error) {
    showToast("Unable to logout. Please try again.");
  }
}

async function setupUserSession() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    if (!data.authenticated) {
      window.location.href = "/login.html";
      return;
    }
    const welcome = document.getElementById("userWelcome");
    if (welcome) welcome.textContent = `Hi, ${data.user?.name || "User"}`;
    document.getElementById("userLogout")?.addEventListener("click", logoutUser);
  } catch {
    window.location.href = "/login.html";
  }
}

setupUserSession();
getRooms().then(data=>{rooms=data; renderRooms();}).catch(err=>console.error(err));

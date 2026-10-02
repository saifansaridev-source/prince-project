let rooms=[];
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const d=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401||r.status===403) location.href="/admin-login.html";throw Error(d.message||"Request failed");}return d;}
async function load(){rooms=await api("/api/rooms");render();loadStats();}
async function loadStats(){const s=await api("/api/admin/stats");roomCount.textContent=s.rooms;verifiedCount.textContent=s.verified;featuredCount.textContent=s.featured;avgRent.textContent=money(s.avgRent);}
function render(){
 const q=(adminSearch?.value||"").toLowerCase();
 const list=rooms.filter(r=>`${r.title} ${r.location} ${r.type}`.toLowerCase().includes(q));
 roomTableBody.innerHTML=list.map(r=>`<tr><td><div class="room-name"><img src="${esc(r.image)}" alt=""><div><strong>${esc(r.title)}</strong><small>${esc(r.id)}</small></div></div></td><td>${esc(r.location)}</td><td>${r.type==="pg"?"PG":r.type==="studio"?"Studio":"Private"}</td><td><strong>${money(r.price)}</strong></td><td>★ ${Number(r.rating||0).toFixed(1)}</td><td><span class="status">${esc(r.badge||"Verified")}</span></td><td><div class="table-actions"><button onclick="editRoom('${r.id}')">Edit</button><button class="delete" onclick="deleteRoom('${r.id}')">Delete</button></div></td></tr>`).join("")||`<tr><td colspan="7">No rooms found.</td></tr>`;
}
function values(){return {title:roomTitle.value.trim(),location:roomLocation.value.trim(),area:roomArea.value.trim().toLowerCase(),type:roomType.value,price:Number(roomPrice.value),rating:Number(roomRating.value||4.7),badge:roomBadge.value,beds:roomBeds.value.trim(),bath:roomBath.value.trim(),size:roomSize.value.trim(),image:roomImage.value.trim(),amenities:roomAmenities.value.split(",").map(x=>x.trim()).filter(Boolean),description:roomDescription.value.trim(),featured:roomFeatured.checked};}
let editingId=null;
roomForm?.addEventListener("submit",async e=>{e.preventDefault();try{const body=JSON.stringify(values());if(editingId){await api("/api/rooms/"+editingId,{method:"PUT",body});showAdminToast("✓ Room updated");}else{await api("/api/rooms",{method:"POST",body});showAdminToast("✓ Room published");}editingId=null;roomForm.reset();roomRating.value="4.7";roomBeds.value="1 Bed";roomBath.value="Private Bath";roomSize.value="200 sq.ft";await load();}catch(err){showAdminToast(err.message);}});
window.editRoom=id=>{const r=rooms.find(x=>x.id===id);if(!r)return;editingId=id;roomTitle.value=r.title;roomLocation.value=r.location;roomArea.value=r.area;roomType.value=r.type;roomPrice.value=r.price;roomRating.value=r.rating;roomBadge.value=r.badge;roomBeds.value=r.beds;roomBath.value=r.bath;roomSize.value=r.size;roomImage.value=r.image;roomAmenities.value=(r.amenities||[]).join(", ");roomDescription.value=r.description||"";roomFeatured.checked=!!r.featured;roomForm.scrollIntoView({behavior:"smooth"});showAdminToast("Edit mode enabled");};
window.deleteRoom=async id=>{if(!confirm("Delete this room?"))return;try{await api("/api/rooms/"+id,{method:"DELETE"});await load();showAdminToast("Room deleted");}catch(err){showAdminToast(err.message);}};
logoutBtn?.addEventListener("click",async()=>{await api("/api/auth/logout",{method:"POST"});location.href="/";});
adminSearch?.addEventListener("input",render);
load().catch(e=>showAdminToast(e.message));

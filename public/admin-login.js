const form=document.getElementById("adminLoginForm");
const message=document.getElementById("loginMessage");
form?.addEventListener("submit",async e=>{
 e.preventDefault();
 try{
   const r=await fetch("/api/auth/admin-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:adminEmail.value.trim(),password:adminPassword.value})});
   const data=await r.json();
   if(!r.ok) throw new Error(data.message||"Invalid credentials");
   location.href="/admin";
 }catch(err){message.textContent=err.message;message.style.color="crimson";}
});

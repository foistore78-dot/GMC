import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GEMINI_FIREBASE_SERVICE_ACCOUNT || "C:/Users/Salvatore/.gemini/antigravity/firebase_service_account.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const allM = await db.collection("members").get();
  const allR = await db.collection("membership_requests").get();

  console.log("\nIN MEMORY FILTER:");
  allM.forEach(d => {
    const fn = (d.data().firstName || "").toLowerCase();
    const ln = (d.data().lastName || "").toLowerCase();
    if (fn.includes("test") || ln.includes("test")) {
      console.log("MEMBER FOUND:", d.id, JSON.stringify(d.data(), null, 2));
    }
  });
  allR.forEach(d => {
    const fn = (d.data().firstName || "").toLowerCase();
    const ln = (d.data().lastName || "").toLowerCase();
    if (fn.includes("test") || ln.includes("test")) {
      console.log("REQUEST FOUND:", d.id, JSON.stringify(d.data(), null, 2));
    }
  });
}
run().catch(console.error);

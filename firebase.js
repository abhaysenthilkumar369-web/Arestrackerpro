import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Firebase Configuration (Skeletal implementation per prompt requirements)
const firebaseConfig = {
  projectId: "ares-tracker-pro",
  // In a real app, you'd have apiKey, authDomain, etc.
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State variable to ensure it only saves once per session
let hasSavedThissession = false;

// Generate or retrieve a unique User ID from localStorage
export const getUserId = () => {
    let userId = localStorage.getItem('ares_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ares_user_id', userId);
    }
    return userId;
};

// Save User to Firebase exactly once per session
export const saveUserToFirebase = async (lat, lon) => {
    if (hasSavedThissession) {
        console.log("Already saved to Firebase this session.");
        return;
    }

    try {
        const userId = getUserId();
        await setDoc(doc(db, "users", userId), {
            lat,
            lon,
            timestamp: new Date()
        });
        hasSavedThissession = true;
        console.log(`User ${userId} location saved to Firebase.`);
    } catch (error) {
        console.error("Error saving to Firebase:", error);
    }
};

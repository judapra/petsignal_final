'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  "projectId": "petlife-manager-cbkr6",
  "appId": "1:934737916234:web:1eae518e666820c3dd51b3",
  "storageBucket": "petlife-manager-cbkr6.firebasestorage.app",
  "apiKey": "AIzaSyA0cmQSN2V8Vt_Haq9P3vQUUCBdE6Npg_E",
  "authDomain": "petlife-manager-cbkr6.firebaseapp.com",
  "messagingSenderId": "934737916234"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
}

export { app, db, storage, auth, messaging };
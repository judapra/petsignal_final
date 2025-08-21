
'use client';

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged,
    deleteUser,
    User
} from "firebase/auth";
import { auth, db, storage } from "./firebase";
import { collection, query, where, getDocs, writeBatch, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { ref, deleteObject, listAll } from "firebase/storage";
import { deleteFile } from "./storage";

export function onAuthStateChangedHelper(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
    return auth.currentUser;
}

export function signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function signOut() {
    return firebaseSignOut(auth);
}

export async function saveFcmToken(token: string) {
    const user = getCurrentUser();
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
             await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
            });
        } else {
             await writeBatch(db).set(userRef, { fcmTokens: [token] }).commit();
        }
    } catch (error) {
        console.error("Error saving FCM token:", error);
        throw error;
    }
}

export async function removeFcmToken(token: string) {
    const user = getCurrentUser();
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        fcmTokens: arrayRemove(token)
    });
}


async function deleteAllUserData() {
    const user = auth.currentUser;
    if (!user) throw new Error("Nenhum usuário logado para excluir dados.");

    const batch = writeBatch(db);
    
    const userRef = doc(db, "users", user.uid);
    batch.delete(userRef);

    const petsQuery = query(collection(db, "pets"), where("ownerUid", "==", user.uid));
    const petsSnapshot = await getDocs(petsQuery);

    for (const petDoc of petsSnapshot.docs) {
        const petData = petDoc.data();
        
        const filesToDelete: string[] = [];
        if (petData.photoPath) filesToDelete.push(petData.photoPath);
        (petData.exams || []).forEach((e: any) => e.resultPath && filesToDelete.push(e.resultPath));
        (petData.consultations || []).forEach((c: any) => c.attachmentPath && filesToDelete.push(c.attachmentPath));

        for (const path of filesToDelete) {
            try {
                await deleteFile(path);
            } catch (error) {
                console.error(`Falha ao excluir o arquivo ${path}:`, error)
            }
        }
        
        batch.delete(petDoc.ref);
    }
    
    const expensesQuery = query(collection(db, "expenses"), where("ownerUid", "==", user.uid));
    const expensesSnapshot = await getDocs(expensesQuery);
    expensesSnapshot.forEach(doc => batch.delete(doc.ref));

    const locationsQuery = query(collection(db, "locations"), where("ownerUid", "==", user.uid));
    const locationsSnapshot = await getDocs(locationsQuery);
    locationsSnapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}


export async function deleteUserAccount() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Usuário não encontrado ou não autenticado.");
    }
    
    try {
        await deleteAllUserData();
        await deleteUser(user);
    } catch (error) {
        console.error("Erro durante o processo de exclusão da conta:", error);
        throw error;
    }
}

import { auth, db } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    getDoc, 
    doc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Check if user is logged in before allowing access to a page
 * If not logged in, redirect to login page
 */
export function onUserReady(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is logged in
            callback();
        } else {
            // User is not logged in - redirect to login
            window.location.href = "login.html";
        }
    });
}

/**
 * Display the currently logged-in user's email
 */
export function displayUserEmail() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const emailElement = document.getElementById("userEmail");
            if (emailElement) {
                emailElement.textContent = user.email;
            }
        }
    });
}

/**
 * Login user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}

/**
 * Logout user
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
        throw error;
    }
}

// ============================================
// ITEM LISTING FUNCTIONS
// ============================================

/**
 * Create a new item listing
 * @param {object} data - Item data (productName, description, price, category, condition, location, pickupDate, pickupTime)
 * @param {array} imageUrls - Array of image URLs from Cloudinary
 */
export async function createItem(data, imageUrls) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }

        const itemsRef = collection(db, "items");
        const itemData = {
            ...data,
            imageUrls: imageUrls,
            createdAt: new Date(),
            sellerEmail: user.email,
            userId: user.uid
        };
        
        const docRef = await addDoc(itemsRef, itemData);
        console.log("Item created with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating item:", error);
        throw error;
    }
}

/**
 * Get all items created by the current user
 */
export async function getUserListings() {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const itemsRef = collection(db, "items");
        const q = query(itemsRef, where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching user listings:", error);
        return [];
    }
}

/**
 * Get all items (excluding current user's items) for marketplace
 */
export async function getAllItems() {
    try {
        const user = auth.currentUser;
        const itemsRef = collection(db, "items");
        const snapshot = await getDocs(itemsRef);
        
        return snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(item => item.userId !== user?.uid); // Exclude user's own items
    } catch (error) {
        console.error("Error fetching all items:", error);
        return [];
    }
}

/**
 * Get a single item by ID
 * @param {string} itemId - The item's document ID
 */
export async function getItemById(itemId) {
    try {
        const itemRef = doc(db, "items", itemId);
        const itemSnapshot = await getDoc(itemRef);
        
        if (itemSnapshot.exists()) {
            return {
                id: itemSnapshot.id,
                ...itemSnapshot.data()
            };
        } else {
            throw new Error("Item not found");
        }
    } catch (error) {
        console.error("Error fetching item:", error);
        throw error;
    }
}

/**
 * Update an existing item
 * @param {string} itemId - The item's document ID
 * @param {object} updated - Fields to update
 */
export async function updateItem(itemId, updated) {
    try {
        const itemRef = doc(db, "items", itemId);
        await updateDoc(itemRef, updated);
        console.log("Item updated successfully");
    } catch (error) {
        console.error("Error updating item:", error);
        throw error;
    }
}

/**
 * Delete an item listing
 * @param {string} itemId - The item's document ID
 */
export async function deleteItem(itemId) {
    try {
        const itemRef = doc(db, "items", itemId);
        await deleteDoc(itemRef);
        console.log("Item deleted successfully");
    } catch (error) {
        console.error("Error deleting item:", error);
        throw error;
    }
}

// ============================================
// SHORTLIST FUNCTIONS
// ============================================

/**
 * Add item to user's shortlist
 * @param {string} itemId - The item's document ID
 */
export async function addToShortlist(itemId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }

        const shortlistRef = collection(db, "users", user.uid, "shortlist");
        
        // Check if item is already shortlisted
        const q = query(shortlistRef, where("itemId", "==", itemId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            throw new Error("Item already shortlisted");
        }

        // Add to shortlist
        const docRef = await addDoc(shortlistRef, {
            itemId: itemId,
            addedAt: new Date()
        });
        
        console.log("Item added to shortlist");
        return docRef.id;
    } catch (error) {
        console.error("Error adding to shortlist:", error);
        throw error;
    }
}

/**
 * Remove item from user's shortlist
 * @param {string} shortlistId - The shortlist document ID (NOT the item ID)
 */
export async function removeFromShortlist(shortlistId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }
        
        const shortlistDocRef = doc(db, "users", user.uid, "shortlist", shortlistId);
        await deleteDoc(shortlistDocRef);
        console.log("Item removed from shortlist");
    } catch (error) {
        console.error("Error removing from shortlist:", error);
        throw error;
    }
}

/**
 * Get all shortlisted items for current user
 */
export async function getShortlistedItems() {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const shortlistRef = collection(db, "users", user.uid, "shortlist");
        const snapshot = await getDocs(shortlistRef);
        
        const items = [];
        for (const doc of snapshot.docs) {
            const shortlistData = doc.data();
            const itemRef = doc(db, "items", shortlistData.itemId);
            const itemSnapshot = await getDoc(itemRef);
            
            if (itemSnapshot.exists()) {
                items.push({
                    shortlistId: doc.id,
                    id: itemSnapshot.id,
                    ...itemSnapshot.data()
                });
            }
        }
        
        return items;
    } catch (error) {
        console.error("Error fetching shortlisted items:", error);
        return [];
    }
}

/**
 * Check if an item is shortlisted by current user
 * @param {string} itemId - The item's document ID
 */
export async function isItemShortlisted(itemId) {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        const shortlistRef = collection(db, "users", user.uid, "shortlist");
        const q = query(shortlistRef, where("itemId", "==", itemId));
        const snapshot = await getDocs(q);
        
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking shortlist status:", error);
        return false;
    }
}

// ============================================
// SETUP ON PAGE LOAD
// ============================================

// Display user email on all pages that have the userEmail element
displayUserEmail();

console.log("app.js loaded successfully");


import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

// Display Authentication Messages
function showMessage(message) {
    const messageBox = document.getElementById("authMessage");

    if (messageBox) {
        messageBox.textContent = message;
    }
}

// Handle Firebase Errors
function getErrorMessage(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Your password does not meet the requirements.";

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password.";

        case "auth/operation-not-allowed":
            return "Email/Password sign-in is not enabled.";

        case "auth/network-request-failed":
            return "Network error. Check your connection.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        default:
            console.error("Firebase error:", error);
            return "Something went wrong. Please try again.";
    }
}

// Create User Profile in Firestore
async function createUserProfile(user) {

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // Only create a profile if one doesn't exist
    if (!userSnap.exists()) {

        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp()
        });

        console.log("User profile created in Firestore.");

    } else {
        console.log("User profile already exists.");
    }
}

// Sign Up
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        const button = signupForm.querySelector('button[type="submit"]');
        button.disabled = true;

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Save new user profile
            try {
                await createUserProfile(userCredential.user);
            } catch (error) {
                console.error("Profile creation error:", error);
                showMessage(
                    "Account created, but the Firestore profile could not be saved. Check the database rules."
                );
                return;
            }

            console.log("Account created successfully.");
            window.location.href = "/index.html";

        } catch (error) {
            showMessage(getErrorMessage(error));

        } finally {
            button.disabled = false;
        }
    });
}

// Log In
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Create a profile for existing users if needed
            try {
                await createUserProfile(userCredential.user);
            } catch (error) {
                console.error("Profile creation error:", error);
                showMessage(
                    "Signed in, but the Firestore profile could not be saved. Check the database rules."
                );
                return;
            }

            console.log("Logged in successfully.");
            window.location.href = "/index.html";

        } catch (error) {
            showMessage(getErrorMessage(error));

        } finally {
            button.disabled = false;
        }
    });
}

// Log Out
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
        try {
            await signOut(auth);

            console.log("Logged out successfully.");
            window.location.href = "/index.html";

        } catch (error) {
            console.error("Logout error:", error);
            alert("Unable to log out. Please try again.");
        }
    });
}

// Update Navigation Based on Login Status
onAuthStateChanged(auth, function(user) {

    const loginLink = document.getElementById("loginLink");
    const signupLink = document.getElementById("signupLink");
    const accountStatus = document.getElementById("accountStatus");

    // Show or Hide Login and Signup
    if (loginLink) {
        loginLink.hidden = Boolean(user);
    }

    if (signupLink) {
        signupLink.hidden = Boolean(user);
    }

    // Show or Hide Logout
    if (logoutButton) {
        logoutButton.hidden = !user;
    }

    // Display User Email
    if (accountStatus) {
        accountStatus.hidden = !user;

        accountStatus.textContent = user
            ? `Signed in as ${user.email}`
            : "";
    }

    // Set Decision Page Destination
    const destination = user
        ? "/create-decision.html"
        : "/login.html";

    // Update Decision Buttons
    const decisionButtons = [
        "getStartedLink",
        "createDecisionLink",
        "createDecisionButton"
    ];

    decisionButtons.forEach(function(buttonId) {
        const button = document.getElementById(buttonId);

        if (button) {
            button.href = destination;
        }
    });
});

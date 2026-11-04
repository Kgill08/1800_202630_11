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

// Create a user profile in Firestore
async function createUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp()
        });
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
            console.error("Authentication error:", error);
            return "Authentication failed. Please try again.";
    }
}

// SIGN UP
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
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

            try {
                await createUserProfile(userCredential.user);
                console.log("User profile saved to Firestore.");
            } catch (profileError) {
                console.error("Profile creation error:", profileError);
                showMessage(
                    "Account created, but profile could not be saved. Check Firestore Rules."
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

// LOG IN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
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

            try {
                await createUserProfile(userCredential.user);
                console.log("User profile checked in Firestore.");
            } catch (profileError) {
                console.error("Profile creation error:", profileError);
                showMessage(
                    "Logged in, but user profile could not be saved. Check Firestore Rules."
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

// LOG OUT
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async function () {
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

// UPDATE NAVIGATION BASED ON LOGIN STATUS
onAuthStateChanged(auth, function (user) {

    const loginLink = document.getElementById("loginLink");
    const signupLink = document.getElementById("signupLink");
    const accountStatus = document.getElementById("accountStatus");

    if (loginLink) {
        loginLink.hidden = Boolean(user);
    }

    if (signupLink) {
        signupLink.hidden = Boolean(user);
    }

    if (logoutButton) {
        logoutButton.hidden = !user;
    }

    if (accountStatus) {
        accountStatus.hidden = !user;
        accountStatus.textContent = user
            ? `Signed in as ${user.email}`
            : "";
    }

    const destination = user
        ? "/create-decision.html"
        : "/login.html";

    const decisionButtons = [
        "getStartedLink",
        "createDecisionLink",
        "createDecisionButton"
    ];

    decisionButtons.forEach(function (buttonId) {
        const button = document.getElementById(buttonId);

        if (button) {
            button.href = destination;
        }
    });
});
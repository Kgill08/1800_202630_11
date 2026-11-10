import { auth } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";

// Check if the user is logged in
onAuthStateChanged(auth, function(user) {

    const protectedContent = document.getElementById("protectedContent");

    if (!user) {
        // Redirect logged-out users to Login
        window.location.replace("/login.html");
        return;
    }

    // Show the page to logged-in users
    if (protectedContent) {
        protectedContent.hidden = false;
    }

    console.log("User authenticated:", user.email);
});

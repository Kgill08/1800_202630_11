import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "firebase/firestore";

// CREATE DECISION PAGE
const decisionForm = document.getElementById("decisionForm");

if (decisionForm) {
    const continueButton = document.getElementById("continueButton");
    const optionsSection = document.getElementById("optionsSection");
    const optionsList = document.getElementById("optionsList");
    const addOptionButton = document.getElementById("addOptionButton");
    const previewButton = document.getElementById("previewDecisionButton");
    const decisionPreview = document.getElementById("decisionPreview");
    const saveButton = document.getElementById("saveDecisionButton");
    const saveMessage = document.getElementById("saveMessage");

    const title = document.getElementById("decisionTitle");
    const description = document.getElementById("decisionDescription");

    let optionNumber = 2;

    decisionForm.addEventListener("submit", event => {
        event.preventDefault();
    });

    continueButton.addEventListener("click", () => {
        if (!title.value.trim() || !description.value.trim()) {
            alert("Please enter a title and description.");
            return;
        }

        optionsSection.hidden = false;
        continueButton.hidden = true;
    });

    addOptionButton.addEventListener("click", () => {
        optionNumber++;

        const optionRow = document.createElement("div");
        optionRow.className = "option-row";

        const label = document.createElement("label");
        label.htmlFor = `option${optionNumber}`;
        label.textContent = `Option ${optionNumber}`;

        const input = document.createElement("input");
        input.type = "text";
        input.id = `option${optionNumber}`;
        input.className = "option-input";
        input.placeholder = "Enter another option";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-option";
        removeButton.textContent = "Remove Option";

        optionRow.append(label, input, removeButton);
        optionsList.appendChild(optionRow);
    });

    optionsList.addEventListener("click", event => {
        if (event.target.classList.contains("remove-option")) {
            event.target.closest(".option-row").remove();
        }
    });

    function getOptions() {
        return Array.from(document.querySelectorAll(".option-input"))
            .map(input => input.value.trim());
    }

    previewButton.addEventListener("click", () => {
        const options = getOptions();

        if (!title.value.trim() || !description.value.trim()) {
            alert("Please enter a title and description.");
            return;
        }

        if (options.length < 2 || options.some(option => !option)) {
            alert("Please enter at least two complete options.");
            return;
        }

        const numberedOptions = options
            .map((option, index) => `${index + 1}. ${option}`)
            .join("\n");

        decisionPreview.textContent =
            `Decision: ${title.value.trim()}\n\n` +
            `Description: ${description.value.trim()}\n\n` +
            `Options:\n${numberedOptions}`;

        decisionPreview.hidden = false;
        saveButton.hidden = false;
        saveMessage.textContent = "";
    });

    // SAVE DECISION TO FIRESTORE
    saveButton.addEventListener("click", async () => {
        const user = auth.currentUser;

        if (!user) {
            saveMessage.textContent = "Please log in first.";
            return;
        }

        const options = getOptions();

        if (
            !title.value.trim() ||
            !description.value.trim() ||
            options.length < 2 ||
            options.some(option => !option)
        ) {
            saveMessage.textContent = "Please complete all fields.";
            return;
        }

        saveButton.disabled = true;
        saveMessage.textContent = "Saving decision...";

        try {
            await addDoc(collection(db, "decisions"), {
                title: title.value.trim(),
                description: description.value.trim(),
                options: options,
                userId: user.uid,
                createdAt: serverTimestamp()
            });

            saveMessage.textContent = "Decision saved successfully!";
            saveMessage.style.color = "green";

            saveButton.hidden = true;

        } catch (error) {
            console.error("Error saving decision:", error);
            saveMessage.textContent =
                "Unable to save decision: " + error.message;
            saveMessage.style.color = "red";

        } finally {
            saveButton.disabled = false;
        }
    });
}

// PAST DECISIONS PAGE
const decisionsList = document.getElementById("decisionsList");

if (decisionsList) {
    const emptyState = document.getElementById("emptyState");

    onAuthStateChanged(auth, async user => {
        if (!user) {
            decisionsList.textContent = "Please log in to view your decisions.";
            emptyState.hidden = true;
            return;
        }

        try {
            const decisionsQuery = query(
                collection(db, "decisions"),
                where("userId", "==", user.uid)
            );

            const snapshot = await getDocs(decisionsQuery);

            decisionsList.replaceChildren();

            if (snapshot.empty) {
                emptyState.hidden = false;
                return;
            }

            emptyState.hidden = true;

            snapshot.forEach(documentSnapshot => {
                const decision = documentSnapshot.data();

                const card = document.createElement("article");
                card.className = "decision-card";

                const heading = document.createElement("h2");
                heading.textContent = decision.title;

                const description = document.createElement("p");
                description.textContent = decision.description;

                const optionsHeading = document.createElement("h3");
                optionsHeading.textContent = "Options";

                const optionsList = document.createElement("ul");

                (decision.options || []).forEach(option => {
                    const item = document.createElement("li");
                    item.textContent = option;
                    optionsList.appendChild(item);
                });

                card.append(
                    heading,
                    description,
                    optionsHeading,
                    optionsList
                );

                decisionsList.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading decisions:", error);
            decisionsList.textContent =
                "Unable to load decisions: " + error.message;
        }
    });
}
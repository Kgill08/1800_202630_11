
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

// ==========================================
// CREATE DECISION PAGE
// ==========================================

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

    let optionNumber = 0;

    decisionForm.addEventListener("submit", event => {
        event.preventDefault();
    });

    function showMessage(message, type = "") {
        saveMessage.textContent = message;
        saveMessage.className = type ? `status-message ${type}` : "status-message";
    }

    function hidePreview() {
        decisionPreview.hidden = true;
        saveButton.hidden = true;
    }

    // Add pros, cons, final choice and remove controls to each option.
    function enhanceOptionRow(row) {
        const input = row.querySelector(".option-input");
        const optionId = input.id;

        row.dataset.optionId = optionId;
        input.required = true;

        if (row.querySelector(".pros-input")) return;

        const prosLabel = document.createElement("label");
        prosLabel.htmlFor = `${optionId}-pros`;
        prosLabel.textContent = "Pros (one per line)";

        const prosInput = document.createElement("textarea");
        prosInput.id = `${optionId}-pros`;
        prosInput.className = "pros-input";
        prosInput.rows = 3;
        prosInput.placeholder = "List the advantages of this option";
        prosInput.required = true;

        const consLabel = document.createElement("label");
        consLabel.htmlFor = `${optionId}-cons`;
        consLabel.textContent = "Cons (one per line)";

        const consInput = document.createElement("textarea");
        consInput.id = `${optionId}-cons`;
        consInput.className = "cons-input";
        consInput.rows = 3;
        consInput.placeholder = "List the disadvantages of this option";
        consInput.required = true;

        const finalLabel = document.createElement("label");
        finalLabel.className = "final-option-label";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "finalOption";
        radio.value = optionId;
        radio.required = true;

        finalLabel.append(
            radio,
            document.createTextNode(" Select as my final decision")
        );

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-option";
        removeButton.textContent = "Remove option";

        row.append(
            prosLabel,
            prosInput,
            consLabel,
            consInput,
            finalLabel,
            removeButton
        );
    }

    // Create additional options dynamically.
    function createOptionRow() {
        optionNumber++;

        const row = document.createElement("div");
        row.className = "option-row sprint-option-card";

        const label = document.createElement("label");
        label.htmlFor = `option${optionNumber}`;
        label.textContent = `Option ${optionNumber}`;

        const input = document.createElement("input");
        input.type = "text";
        input.id = `option${optionNumber}`;
        input.className = "option-input";
        input.placeholder = "Enter another option";

        row.append(label, input);
        optionsList.appendChild(row);

        enhanceOptionRow(row);
    }

    // Enhance the two options already in the HTML.
    const existingRows = Array.from(
        optionsList.querySelectorAll(".option-row")
    );

    optionNumber = existingRows.length;
    existingRows.forEach(enhanceOptionRow);

    // Read option names, pros and cons.
    function getOptionDetails() {
        return Array.from(
            optionsList.querySelectorAll(".option-row")
        ).map(row => ({
            id: row.dataset.optionId,
            name: row.querySelector(".option-input").value.trim(),
            pros: row.querySelector(".pros-input").value
                .split("\n").map(item => item.trim()).filter(Boolean),
            cons: row.querySelector(".cons-input").value
                .split("\n").map(item => item.trim()).filter(Boolean)
        }));
    }

    function getSelectedOptionId() {
        return optionsList.querySelector(
            'input[name="finalOption"]:checked'
        )?.value || "";
    }

    // Validate all inputs before previewing or saving.
    function validateOptions() {
        const options = getOptionDetails();

        if (options.length < 2) {
            return "Please add at least two options.";
        }

        if (options.some(option => !option.name)) {
            return "Please enter a name for every option.";
        }

        if (options.some(option => option.pros.length === 0)) {
            return "Please enter at least one pro for every option.";
        }

        if (options.some(option => option.cons.length === 0)) {
            return "Please enter at least one con for every option.";
        }

        if (!getSelectedOptionId()) {
            return "Please select your final decision option.";
        }

        return "";
    }

    // Continue to the options section.
    continueButton.addEventListener("click", () => {
        if (!title.value.trim() || !description.value.trim()) {
            showMessage("Please enter a title and description.", "error");
            return;
        }

        optionsSection.hidden = false;
        continueButton.hidden = true;
        showMessage("");
    });

    // Add an option.
    addOptionButton.addEventListener("click", () => {
        createOptionRow();
        hidePreview();
        showMessage("");
    });

    // Remove an option, keeping at least two.
    optionsList.addEventListener("click", event => {
        if (!event.target.classList.contains("remove-option")) return;

        if (optionsList.querySelectorAll(".option-row").length <= 2) {
            showMessage("A decision must have at least two options.", "error");
            return;
        }

        event.target.closest(".option-row").remove();
        hidePreview();
        showMessage("");
    });

    // Clear outdated previews when information changes.
    decisionForm.addEventListener("input", () => {
        hidePreview();
        showMessage("");
    });

    decisionForm.addEventListener("change", () => {
        hidePreview();
        showMessage("");
    });

    // Preview the decision.
    previewButton.addEventListener("click", () => {
        if (!title.value.trim() || !description.value.trim()) {
            showMessage("Please enter a title and description.", "error");
            return;
        }

        const error = validateOptions();

        if (error) {
            showMessage(error, "error");
            return;
        }

        const options = getOptionDetails();
        const selected = options.find(
            option => option.id === getSelectedOptionId()
        );

        const preview = [
            `Decision: ${title.value.trim()}`,
            `Description: ${description.value.trim()}`,
            "",
            ...options.flatMap((option, index) => [
                `Option ${index + 1}: ${option.name}`,
                `Pros: ${option.pros.join("; ")}`,
                `Cons: ${option.cons.join("; ")}`,
                ""
            ]),
            `Final decision: ${selected.name}`
        ];

        decisionPreview.textContent = preview.join("\n");
        decisionPreview.hidden = false;
        saveButton.hidden = false;

        showMessage("Review your decision, then select Save Decision.");
    });

    // Save decision information to Firestore.
    saveButton.addEventListener("click", async () => {
        const user = auth.currentUser;

        if (!user) {
            showMessage("Please log in before saving your decision.", "error");
            return;
        }

        if (!title.value.trim() || !description.value.trim()) {
            showMessage("Please enter a title and description.", "error");
            return;
        }

        const error = validateOptions();

        if (error) {
            showMessage(error, "error");
            return;
        }

        const details = getOptionDetails();
        const selected = details.find(
            option => option.id === getSelectedOptionId()
        );

        saveButton.disabled = true;
        showMessage("Saving decision...");

        try {
            await addDoc(collection(db, "decisions"), {
                title: title.value.trim(),
                description: description.value.trim(),

                // Preserve the original options array.
                options: details.map(option => option.name),

                // New Sprint 3 fields.
                optionDetails: details.map(({ name, pros, cons }) => ({
                    name,
                    pros,
                    cons
                })),

                selectedOption: selected.name,
                userId: user.uid,
                createdAt: serverTimestamp()
            });

            showMessage(
                "Decision saved successfully! View it on Past Decisions.",
                "success"
            );

            saveButton.hidden = true;

        } catch (error) {
            console.error("Error saving decision:", error);

            showMessage(
                `Unable to save decision: ${error.message || "Please try again."}`,
                "error"
            );

        } finally {
            saveButton.disabled = false;
        }
    });
}


// ==========================================
// PAST DECISIONS PAGE
// ==========================================

const decisionsList = document.getElementById("decisionsList");

if (decisionsList) {
    const emptyState = document.getElementById("emptyState");

    onAuthStateChanged(auth, async user => {
        if (!user) {
            decisionsList.textContent =
                "Please log in to view your decisions.";

            if (emptyState) emptyState.hidden = true;
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
                if (emptyState) emptyState.hidden = false;
                return;
            }

            if (emptyState) emptyState.hidden = true;

            snapshot.forEach(documentSnapshot => {
                const decision = documentSnapshot.data();

                const card = document.createElement("article");
                card.className = "decision-card";

                const heading = document.createElement("h2");
                heading.textContent = decision.title || "Untitled decision";

                const description = document.createElement("p");
                description.textContent = decision.description || "";

                card.append(heading, description);

                const details = Array.isArray(decision.optionDetails)
                    ? decision.optionDetails
                    : [];

                if (details.length > 0) {
                    const optionsHeading = document.createElement("h3");
                    optionsHeading.textContent = "Options and comparison";
                    card.appendChild(optionsHeading);

                    details.forEach(option => {
                        const section = document.createElement("section");
                        section.className = "saved-option";

                        const optionHeading = document.createElement("h4");
                        optionHeading.textContent = option.name || "Option";

                        const prosHeading = document.createElement("strong");
                        prosHeading.textContent = "Pros";

                        const prosList = document.createElement("ul");

                        (option.pros || []).forEach(pro => {
                            const item = document.createElement("li");
                            item.textContent = pro;
                            prosList.appendChild(item);
                        });

                        const consHeading = document.createElement("strong");
                        consHeading.textContent = "Cons";

                        const consList = document.createElement("ul");

                        (option.cons || []).forEach(con => {
                            const item = document.createElement("li");
                            item.textContent = con;
                            consList.appendChild(item);
                        });

                        section.append(
                            optionHeading,
                            prosHeading,
                            prosList,
                            consHeading,
                            consList
                        );

                        card.appendChild(section);
                    });

                } else {
                    // Show older Sprint 2 decisions as well.
                    const optionsHeading = document.createElement("h3");
                    optionsHeading.textContent = "Options";

                    const list = document.createElement("ul");

                    (decision.options || []).forEach(option => {
                        const item = document.createElement("li");
                        item.textContent = option;
                        list.appendChild(item);
                    });

                    card.append(optionsHeading, list);
                }

                if (decision.selectedOption) {
                    const finalChoice = document.createElement("p");
                    finalChoice.className = "final-choice-result";

                    const label = document.createElement("strong");
                    label.textContent = "Final decision: ";

                    finalChoice.append(
                        label,
                        document.createTextNode(decision.selectedOption)
                    );

                    card.appendChild(finalChoice);
                }

                decisionsList.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading decisions:", error);

            decisionsList.textContent =
                `Unable to load decisions: ${error.message || "Please refresh and try again."}`;
        }
    });
}

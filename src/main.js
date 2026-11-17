import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    query,
    where,
    serverTimestamp
} from "firebase/firestore";

// Small shared helpers -------------------------------------------------------
const byId = id => document.getElementById(id);
const text = value => String(value ?? "").trim();

function showMessage(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.className = type ? `status-message ${type}` : "status-message";
}

function addText(parent, tagName, value, className = "") {
    const element = document.createElement(tagName);
    element.textContent = value || "";
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
}

function optionDetailsFromDecision(decision) {
    if (Array.isArray(decision.optionDetails)) return decision.optionDetails;
    return (Array.isArray(decision.options) ? decision.options : []).map(name => ({
        name,
        pros: [],
        cons: []
    }));
}

function ratingLabel(rating) {
    return ({
        worse: "Worse than expected",
        as_expected: "As expected",
        better: "Better than expected"
    })[rating] || "Not reviewed yet";
}

function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

// CREATE DECISION PAGE -------------------------------------------------------
const decisionForm = byId("decisionForm");

if (decisionForm) {
    const continueButton = byId("continueButton");
    const optionsSection = byId("optionsSection");
    const optionsList = byId("optionsList");
    const addOptionButton = byId("addOptionButton");
    const previewButton = byId("previewDecisionButton");
    const decisionPreview = byId("decisionPreview");
    const saveButton = byId("saveDecisionButton");
    const saveMessage = byId("saveMessage");

    const title = byId("decisionTitle");
    const description = byId("decisionDescription");
    const category = byId("decisionCategory");
    const decisionReason = byId("decisionReason");
    const initialThoughts = byId("initialThoughts");
    const expectedOutcome = byId("expectedOutcome");

    let optionNumber = 0;

    decisionForm.addEventListener("submit", event => event.preventDefault());

    function hidePreview() {
        decisionPreview.hidden = true;
        saveButton.hidden = true;
    }

    function validateDecisionIntro() {
        if (!text(title.value)) return "Please enter a decision title.";
        if (!text(description.value)) return "Please enter a short description.";
        if (!text(category.value)) return "Please choose a decision category.";
        if (!text(decisionReason.value)) return "Please explain why you are making this decision.";
        if (!text(initialThoughts.value)) return "Please enter your initial thoughts.";
        if (!text(expectedOutcome.value)) return "Please describe what you expect will happen.";
        return "";
    }

    function enhanceOptionRow(row) {
        const input = row.querySelector(".option-input");
        if (!input) return;
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

        finalLabel.append(radio, document.createTextNode(" Select as my final decision"));

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-option";
        removeButton.textContent = "Remove option";

        row.append(prosLabel, prosInput, consLabel, consInput, finalLabel, removeButton);
    }

    function createOptionRow() {
        optionNumber += 1;
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

    const existingRows = Array.from(optionsList.querySelectorAll(".option-row"));
    optionNumber = existingRows.length;
    existingRows.forEach(enhanceOptionRow);

    function getOptionDetails() {
        return Array.from(optionsList.querySelectorAll(".option-row")).map(row => ({
            id: row.dataset.optionId,
            name: text(row.querySelector(".option-input")?.value),
            pros: text(row.querySelector(".pros-input")?.value)
                .split("\n").map(item => item.trim()).filter(Boolean),
            cons: text(row.querySelector(".cons-input")?.value)
                .split("\n").map(item => item.trim()).filter(Boolean)
        }));
    }

    function getSelectedOptionId() {
        return optionsList.querySelector('input[name="finalOption"]:checked')?.value || "";
    }

    function validateOptions() {
        const options = getOptionDetails();
        if (options.length < 2) return "Please add at least two options.";
        if (options.some(option => !option.name)) return "Please enter a name for every option.";
        if (options.some(option => option.pros.length === 0)) return "Please enter at least one pro for every option.";
        if (options.some(option => option.cons.length === 0)) return "Please enter at least one con for every option.";
        if (!getSelectedOptionId()) return "Please select your final decision option.";
        return "";
    }

    continueButton.addEventListener("click", () => {
        const error = validateDecisionIntro();
        if (error) {
            showMessage(saveMessage, error, "error");
            return;
        }
        optionsSection.hidden = false;
        continueButton.hidden = true;
        showMessage(saveMessage, "");
        optionsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    addOptionButton.addEventListener("click", () => {
        createOptionRow();
        hidePreview();
        showMessage(saveMessage, "");
    });

    optionsList.addEventListener("click", event => {
        if (!event.target.classList.contains("remove-option")) return;
        if (optionsList.querySelectorAll(".option-row").length <= 2) {
            showMessage(saveMessage, "A decision must have at least two options.", "error");
            return;
        }
        event.target.closest(".option-row").remove();
        hidePreview();
        showMessage(saveMessage, "");
    });

    decisionForm.addEventListener("input", () => {
        hidePreview();
        showMessage(saveMessage, "");
    });
    decisionForm.addEventListener("change", () => {
        hidePreview();
        showMessage(saveMessage, "");
    });

    previewButton.addEventListener("click", () => {
        const introError = validateDecisionIntro();
        if (introError) {
            showMessage(saveMessage, introError, "error");
            return;
        }
        const optionError = validateOptions();
        if (optionError) {
            showMessage(saveMessage, optionError, "error");
            return;
        }

        const options = getOptionDetails();
        const selected = options.find(option => option.id === getSelectedOptionId());
        const previewLines = [
            `Decision: ${text(title.value)}`,
            `Category: ${category.value}`,
            `Description: ${text(description.value)}`,
            `Why I made this decision: ${text(decisionReason.value)}`,
            `Initial thoughts: ${text(initialThoughts.value)}`,
            `Expected outcome: ${text(expectedOutcome.value)}`,
            "",
            ...options.flatMap((option, index) => [
                `Option ${index + 1}: ${option.name}`,
                `Pros: ${option.pros.join("; ")}`,
                `Cons: ${option.cons.join("; ")}`,
                ""
            ]),
            `Final decision: ${selected.name}`
        ];

        decisionPreview.textContent = previewLines.join("\n");
        decisionPreview.hidden = false;
        saveButton.hidden = false;
        showMessage(saveMessage, "Review your decision, then select Save Decision.");
    });

    saveButton.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            showMessage(saveMessage, "Please log in before saving your decision.", "error");
            return;
        }

        const introError = validateDecisionIntro();
        const optionError = validateOptions();
        if (introError || optionError) {
            showMessage(saveMessage, introError || optionError, "error");
            return;
        }

        const details = getOptionDetails();
        const selected = details.find(option => option.id === getSelectedOptionId());
        saveButton.disabled = true;
        showMessage(saveMessage, "Saving decision...");

        try {
            await addDoc(collection(db, "decisions"), {
                title: text(title.value),
                description: text(description.value),
                category: category.value,
                decisionReason: text(decisionReason.value),
                initialThoughts: text(initialThoughts.value),
                expectedOutcome: text(expectedOutcome.value),
                options: details.map(option => option.name),
                optionDetails: details.map(({ name, pros, cons }) => ({ name, pros, cons })),
                selectedOption: selected.name,
                userId: user.uid,
                createdAt: serverTimestamp()
            });

            showMessage(saveMessage, "Decision saved successfully! You can review it from Past Decisions.", "success");
            saveButton.hidden = true;
        } catch (error) {
            console.error("Error saving decision:", error);
            showMessage(saveMessage, `Unable to save decision: ${error.message || "Please try again."}`, "error");
        } finally {
            saveButton.disabled = false;
        }
    });
}

// PAST DECISIONS, SEARCH, FILTERS AND PATTERN SUMMARY ------------------------
const decisionsList = byId("decisionsList");

if (decisionsList) {
    const emptyState = byId("emptyState");
    const searchInput = byId("decisionSearch");
    const categoryFilterButtons = byId("categoryFilterButtons");
    const listMessage = byId("listMessage");
    let allDecisions = [];
    let selectedCategory = "all";

    function renderPatterns(decisions) {
        const total = decisions.length;
        const reviewed = decisions.filter(item => item.data.review).length;
        const better = decisions.filter(item => item.data.review?.rating === "better").length;
        const counts = {};
        decisions.forEach(item => {
            const key = item.data.category || "Uncategorized";
            counts[key] = (counts[key] || 0) + 1;
        });
        const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        if (byId("totalDecisionCount")) byId("totalDecisionCount").textContent = total;
        if (byId("reviewedDecisionCount")) byId("reviewedDecisionCount").textContent = reviewed;
        if (byId("betterOutcomeCount")) byId("betterOutcomeCount").textContent = better;
        if (byId("topDecisionCategory")) byId("topDecisionCategory").textContent = topCategory;

        const patternList = byId("categoryPatternList");
        if (!patternList) return;
        patternList.replaceChildren();
        const heading = document.createElement("h3");
        heading.textContent = "Decisions by category";
        patternList.appendChild(heading);

        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (!entries.length) {
            addText(patternList, "p", "Your category patterns will appear after you save decisions.", "muted-text");
            return;
        }
        entries.forEach(([name, count]) => {
            const row = document.createElement("div");
            row.className = "pattern-row";
            const label = document.createElement("span");
            label.textContent = `${name} (${count})`;
            const track = document.createElement("div");
            track.className = "pattern-bar-track";
            const bar = document.createElement("div");
            bar.className = "pattern-bar";
            bar.style.width = `${Math.max(8, (count / total) * 100)}%`;
            track.appendChild(bar);
            row.append(label, track);
            patternList.appendChild(row);
        });
    }

    function matchesSearch(item, search, selectedCategory) {
        const data = item.data;
        const category = data.category || "Uncategorized";
        if (selectedCategory !== "all" && category !== selectedCategory) return false;
        if (!search) return true;
        const optionText = optionDetailsFromDecision(data).map(option => `${option.name || ""} ${(option.pros || []).join(" ")} ${(option.cons || []).join(" ")}`).join(" ");
        const searchable = [
            data.title, data.description, data.decisionReason,
            data.initialThoughts, data.expectedOutcome, data.selectedOption,
            data.review?.actualOutcome, data.review?.lessonsLearned,
            category, optionText
        ].join(" ").toLowerCase();
        return searchable.includes(search);
    }

    function renderDecisions() {
        const search = text(searchInput?.value).toLowerCase();
        const visible = allDecisions.filter(item => matchesSearch(item, search, selectedCategory));
        decisionsList.replaceChildren();

        if (emptyState) emptyState.hidden = visible.length !== 0;
        showMessage(listMessage, visible.length ? `${visible.length} decision(s) found.` : "");

        visible.forEach(item => {
            const data = item.data;
            const card = document.createElement("article");
            card.className = "decision-card";
            addText(card, "h2", data.title || "Untitled decision");
            addText(card, "p", data.description || "");

            const meta = document.createElement("div");
            meta.className = "decision-meta";
            addText(meta, "span", data.category || "Uncategorized", "category-pill");
            const date = formatDate(data.createdAt);
            if (date) addText(meta, "span", `Created ${date}`, "muted-text");
            card.appendChild(meta);

            if (data.selectedOption) {
                const choice = document.createElement("p");
                choice.className = "final-choice-result";
                const strong = document.createElement("strong");
                strong.textContent = "Final decision: ";
                choice.append(strong, document.createTextNode(data.selectedOption));
                card.appendChild(choice);
            }

            if (data.review) {
                addText(card, "p", `Outcome: ${ratingLabel(data.review.rating)}`, "review-status");
            } else {
                addText(card, "p", "Not reviewed yet", "muted-text");
            }

            const link = document.createElement("a");
            link.className = "new-decision-button detail-link";
            link.href = `/decision-details.html?id=${encodeURIComponent(item.id)}`;
            link.textContent = data.review ? "View Details / Reflection" : "View Details / Review Decision";
            card.appendChild(link);
            decisionsList.appendChild(card);
        });
    }

    if (searchInput) searchInput.addEventListener("input", renderDecisions);
    if (categoryFilterButtons) {
        categoryFilterButtons.addEventListener("click", event => {
            const button = event.target.closest("button[data-category]");
            if (!button) return;
            selectedCategory = button.dataset.category || "all";
            categoryFilterButtons.querySelectorAll("button[data-category]").forEach(chip => {
                const active = chip === button;
                chip.classList.toggle("active", active);
                chip.setAttribute("aria-pressed", String(active));
            });
            renderDecisions();
        });
    }

    onAuthStateChanged(auth, async user => {
        if (!user) {
            decisionsList.replaceChildren();
            showMessage(listMessage, "Please log in to view your decisions.", "error");
            if (emptyState) emptyState.hidden = true;
            return;
        }
        try {
            const saved = await getDocs(query(collection(db, "decisions"), where("userId", "==", user.uid)));
            allDecisions = saved.docs.map(savedDoc => ({ id: savedDoc.id, data: savedDoc.data() }));
            renderPatterns(allDecisions);
            renderDecisions();
        } catch (error) {
            console.error("Error loading decisions:", error);
            showMessage(listMessage, `Unable to load decisions: ${error.message || "Please refresh."}`, "error");
        }
    });
}

// DECISION DETAILS AND REVIEW PAGE ------------------------------------------
const detailCard = byId("decisionDetailCard");

if (detailCard) {
    const detailMessage = byId("detailMessage");
    const reviewSection = byId("reviewSection");
    const reviewForm = byId("reviewForm");
    const actualOutcomeInput = byId("actualOutcome");
    const outcomeRatingInput = byId("outcomeRating");
    const lessonsInput = byId("lessonsLearned");
    const reviewMessage = byId("reviewMessage");
    const saveReviewButton = byId("saveReviewButton");
    const decisionId = new URLSearchParams(window.location.search).get("id");
    let loadedDecision = null;

    function renderDetail(data) {
        detailCard.replaceChildren();
        addText(detailCard, "h1", data.title || "Untitled decision");
        addText(detailCard, "p", data.description || "");

        const meta = document.createElement("div");
        meta.className = "decision-meta";
        addText(meta, "span", data.category || "Uncategorized", "category-pill");
        const date = formatDate(data.createdAt);
        if (date) addText(meta, "span", `Created ${date}`, "muted-text");
        detailCard.appendChild(meta);

        const information = [
            ["Why I made this decision", data.decisionReason],
            ["Initial thoughts", data.initialThoughts],
            ["What I expected", data.expectedOutcome]
        ];
        information.forEach(([heading, value]) => {
            if (!value) return;
            addText(detailCard, "h3", heading);
            addText(detailCard, "p", value);
        });

        addText(detailCard, "h2", "Options and comparison");
        optionDetailsFromDecision(data).forEach(option => {
            const section = document.createElement("section");
            section.className = "saved-option";
            addText(section, "h3", option.name || "Option");
            addText(section, "strong", "Pros");
            const pros = document.createElement("ul");
            (option.pros || []).forEach(value => addText(pros, "li", value));
            section.appendChild(pros);
            addText(section, "strong", "Cons");
            const cons = document.createElement("ul");
            (option.cons || []).forEach(value => addText(cons, "li", value));
            section.appendChild(cons);
            detailCard.appendChild(section);
        });

        if (data.selectedOption) {
            const finalChoice = document.createElement("p");
            finalChoice.className = "final-choice-result";
            const label = document.createElement("strong");
            label.textContent = "Final decision: ";
            finalChoice.append(label, document.createTextNode(data.selectedOption));
            detailCard.appendChild(finalChoice);
        }

        if (data.review) {
            addText(detailCard, "h2", "Your Reflection");
            addText(detailCard, "p", `How did it go? ${ratingLabel(data.review.rating)}`);
            addText(detailCard, "h3", "What actually happened?");
            addText(detailCard, "p", data.review.actualOutcome || "");
            addText(detailCard, "h3", "What did you learn?");
            addText(detailCard, "p", data.review.lessonsLearned || "");
            actualOutcomeInput.value = data.review.actualOutcome || "";
            outcomeRatingInput.value = data.review.rating || "";
            lessonsInput.value = data.review.lessonsLearned || "";
            saveReviewButton.textContent = "Update Reflection";
        }
        detailCard.hidden = false;
        reviewSection.hidden = false;
    }

    onAuthStateChanged(auth, async user => {
        if (!user) {
            showMessage(detailMessage, "Please log in to view this decision.", "error");
            return;
        }
        if (!decisionId) {
            showMessage(detailMessage, "No decision was selected. Return to Past Decisions and choose a decision.", "error");
            return;
        }
        try {
            const decisionRef = doc(db, "decisions", decisionId);
            const snapshot = await getDoc(decisionRef);
            if (!snapshot.exists()) {
                showMessage(detailMessage, "This decision could not be found.", "error");
                return;
            }
            loadedDecision = snapshot.data();
            if (loadedDecision.userId !== user.uid) {
                showMessage(detailMessage, "You do not have permission to view this decision.", "error");
                return;
            }
            renderDetail(loadedDecision);
        } catch (error) {
            console.error("Error loading decision details:", error);
            showMessage(detailMessage, `Unable to load this decision: ${error.message || "Please try again."}`, "error");
        }
    });

    reviewForm.addEventListener("submit", async event => {
        event.preventDefault();
        const user = auth.currentUser;
        if (!user || !loadedDecision || !decisionId) {
            showMessage(reviewMessage, "The decision could not be loaded. Refresh and try again.", "error");
            return;
        }

        const actualOutcome = text(actualOutcomeInput.value);
        const rating = outcomeRatingInput.value;
        const lessonsLearned = text(lessonsInput.value);
        if (!actualOutcome || !rating || !lessonsLearned) {
            showMessage(reviewMessage, "Please complete the outcome, rating, and lessons learned fields.", "error");
            return;
        }

        saveReviewButton.disabled = true;
        showMessage(reviewMessage, "Saving your reflection...");
        try {
            await updateDoc(doc(db, "decisions", decisionId), {
                review: {
                    actualOutcome,
                    rating,
                    lessonsLearned,
                    reviewedAt: serverTimestamp()
                }
            });
            loadedDecision.review = { actualOutcome, rating, lessonsLearned };
            renderDetail(loadedDecision);
            showMessage(reviewMessage, "Your reflection was saved successfully.", "success");
        } catch (error) {
            console.error("Error saving reflection:", error);
            showMessage(reviewMessage, `Unable to save reflection: ${error.message || "Please try again."}`, "error");
        } finally {
            saveReviewButton.disabled = false;
        }
    });
}

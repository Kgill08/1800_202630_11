const decisionForm = document.getElementById("decisionForm");

// Only run this code on the decision creation page
if (decisionForm) {

    const continueButton = document.getElementById("continueButton");
    const optionsSection = document.getElementById("optionsSection");
    const optionsList = document.getElementById("optionsList");
    const addOptionButton = document.getElementById("addOptionButton");
    const previewButton = document.getElementById("previewDecisionButton");
    const decisionPreview = document.getElementById("decisionPreview");

    const title = document.getElementById("decisionTitle");
    const description = document.getElementById("decisionDescription");

    let optionNumber = 2;

    // Prevent the form from reloading the page
    decisionForm.addEventListener("submit", function(event) {
        event.preventDefault();
    });

    // Show the options section
    continueButton.addEventListener("click", function() {

        if (!title.value.trim() || !description.value.trim()) {
            alert("Please enter a title and description.");
            return;
        }

        optionsSection.hidden = false;
        continueButton.hidden = true;
    });

    // Add another option input
    addOptionButton.addEventListener("click", function() {

        optionNumber++;

        const optionRow = document.createElement("div");
        optionRow.className = "option-row";

        optionRow.innerHTML = `
            <label for="option${optionNumber}">
                Option ${optionNumber}
            </label>

            <input type="text"
                   id="option${optionNumber}"
                   class="option-input"
                   placeholder="Enter another option">

            <button type="button" class="remove-option">
                Remove Option
            </button>
        `;

        optionsList.appendChild(optionRow);
    });

    // Remove an additional option
    optionsList.addEventListener("click", function(event) {

        if (event.target.classList.contains("remove-option")) {
            event.target.closest(".option-row").remove();
        }
    });

    // Preview the decision without saving it
    previewButton.addEventListener("click", function() {

        const optionInputs = document.querySelectorAll(".option-input");

        const options = Array.from(optionInputs).map(function(input) {
            return input.value.trim();
        });

        if (options.some(option => option === "")) {
            alert("Please fill in all option fields.");
            return;
        }

        const numberedOptions = options.map(function(option, index) {
            return `${index + 1}. ${option}`;
        }).join("\n");

        decisionPreview.textContent =
            `Decision: ${title.value.trim()}\n\n` +
            `Description: ${description.value.trim()}\n\n` +
            `Options:\n${numberedOptions}`;

        decisionPreview.hidden = false;

        console.log("Decision preview:", {
            title: title.value.trim(),
            description: description.value.trim(),
            options: options
        });
    });
}

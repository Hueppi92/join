// Error-Message
function setupRequiredField(inputId, wrapperClass) {
    let input = document.getElementById(inputId);
    let wrapper = document.querySelector(wrapperClass);

    if (!input || !wrapper) {
        console.warn("setupRequiredField: not found", { inputId, wrapperClass, input, wrapper });
        return;
    }

    let wasFocused = false;

    input.addEventListener("focus", () => {
        wasFocused = true;
    });

    input.addEventListener("blur", () => {
        if (wasFocused && input.value.trim() === "") {
            wrapper.classList.add("error");
        } else {
            wrapper.classList.remove("error");
        }
    });
}

function loadTaskEditorPage() {
    setupRequiredField("titleInput", ".title_field");
    setupRequiredField("dateInput", ".date_field");
}

loadTaskEditorPage();
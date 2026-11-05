const colorGrid = document.getElementById("color-grid");
const themeButtons = document.querySelectorAll(".theme-button");
const cookieBanner = document.getElementById("cookie-banner");
const acceptCookiesButton = document.getElementById("accept-cookies");
const playerNameInput = document.getElementById("player-name-input");
const generateNameButton = document.getElementById("generate-name-button");

const colors = [
  "#e63946",
  "#f77f00",
  "#ffd60a",
  "#2a9d8f",
  "#1f7a3f",
  "#0096c7",
  "#4361ee",
  "#7209b7",
  "#f72585",
  "#6c757d"
];

function createColorButtons() {
  colors.forEach((color) => {
    const button = document.createElement("button");
    button.className = "color-button";
    button.type = "button";
    button.style.backgroundColor = color;
    button.setAttribute("aria-label", `Selecionar a cor ${color}`);
    button.dataset.color = color;

    button.addEventListener("click", () => {
      setPreferences({ color });
      applyPreferences();
      updateSelectedColor(color);
    });

    colorGrid.appendChild(button);
  });
}

function updateSelectedColor(selectedColor) {
  document.querySelectorAll(".color-button").forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.color === selectedColor
    );
  });
}

function updateSelectedTheme(selectedTheme) {
  themeButtons.forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.theme === selectedTheme
    );
  });
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.theme;

    setPreferences({ theme });
    applyPreferences();
    updateSelectedTheme(theme);
  });
});

playerNameInput.addEventListener("input", () => {
  setPreferences({ playerName: playerNameInput.value.trim() });
});

generateNameButton.addEventListener("click", () => {
  const newName = generatePlayerName();

  playerNameInput.value = newName;
  setPreferences({ playerName: newName });
});

acceptCookiesButton.addEventListener("click", () => {
  setPreferences({ cookies_accepted: true });
  cookieBanner.classList.add("hidden");
});

const preferences = getPreferences();
createColorButtons();
updateSelectedTheme(preferences.theme || "dark");
updateSelectedColor(preferences.color || "#4361ee");

playerNameInput.value = getPlayerName();

if (isCookieAccepted()) {
  cookieBanner.classList.add("hidden");
}
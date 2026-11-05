const createGameButton = document.getElementById("create-game-button");
const joinGameButton = document.getElementById("join-game-button");
const settingsButton = document.getElementById("settings-button");

createGameButton.addEventListener("click", () => {
  window.location.href = "/host.html";
});

joinGameButton.addEventListener("click", () => {
  window.location.href = "/entrar.html";
});

settingsButton.addEventListener("click", () => {
  window.location.href = "/config.html";
});
const COOKIE_NAME = "pokerlocal_preferences";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const namePrefixes = [
  "Ás", "Rei", "Dama", "Valete", "Coringa", "Ficha", "Pote", "River",
  "Turn", "Flop", "Dealer", "Blind", "Naipe", "Baralho", "Carta"
];

const nameSuffixes = [
  "Silencioso", "Agressivo", "Sortudo", "Real", "Nobre", "Veloz", "Sombrio",
  "Brilhante", "Corajoso", "Tranquilo", "Selvagem", "Esperto", "Fortune",
  "Alfa", "Neon"
];

function getPreferences() {
  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    if (cookie.startsWith(`${COOKIE_NAME}=`)) {
      try {
        return JSON.parse(decodeURIComponent(cookie.split("=")[1]));
      } catch {
        return {};
      }
    }
  }

  return {};
}

function setPreferences(preferences) {
  const current = getPreferences();
  const updated = { ...current, ...preferences };

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(updated)
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function generatePlayerName() {
  const prefix =
    namePrefixes[Math.floor(Math.random() * namePrefixes.length)];
  const suffix =
    nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;

  return `${prefix} ${suffix} ${number}`;
}

function getPlayerName() {
  const preferences = getPreferences();

  if (!preferences.playerName) {
    const newName = generatePlayerName();
    setPreferences({ playerName: newName });

    return newName;
  }

  return preferences.playerName;
}

function applyPreferences() {
  const { theme = "dark", color = "#4361ee" } = getPreferences();
  const validThemes = ["light", "dark", "night"];
  const selectedTheme = validThemes.includes(theme) ? theme : "dark";

  document.documentElement.setAttribute("data-theme", selectedTheme);
  document.documentElement.style.setProperty("--primary", color);
}

function isCookieAccepted() {
  return getPreferences().cookies_accepted === true;
}

applyPreferences();
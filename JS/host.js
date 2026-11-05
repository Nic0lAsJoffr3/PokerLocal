const hostForm = document.getElementById("host-form");
const buyInInput = document.getElementById("buy-in");

const hasDealerInput = document.getElementById("has-dealer");
const hasSmallBlindInput = document.getElementById("has-small-blind");
const hasBigBlindInput = document.getElementById("has-big-blind");

const smallBlindGroup = document.getElementById("small-blind-group");
const bigBlindGroup = document.getElementById("big-blind-group");

const smallBlindInput = document.getElementById("small-blind");
const smallBlindSlider = document.getElementById("small-blind-slider");

const bigBlindInput = document.getElementById("big-blind");
const bigBlindSlider = document.getElementById("big-blind-slider");

const createRoomButton = hostForm.querySelector(".primary-button");

const sliderFields = [
  {
    input: smallBlindInput,
    slider: smallBlindSlider
  },
  {
    input: bigBlindInput,
    slider: bigBlindSlider
  },
  {
    input: document.getElementById("ante"),
    slider: document.getElementById("ante-slider")
  },
  {
    input: document.getElementById("blind-increment"),
    slider: document.getElementById("blind-increment-slider")
  },
  {
    input: document.getElementById("minimum-raise"),
    slider: document.getElementById("minimum-raise-slider")
  },
  {
    input: document.getElementById("maximum-raise"),
    slider: document.getElementById("maximum-raise-slider")
  }
];

function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return code;
}

function updateSliderLimits() {
  const buyIn = Number(buyInInput.value) || 0;

  sliderFields.forEach(({ input, slider }) => {
    slider.max = buyIn;

    const value = Number(input.value) || 0;

    if (value > buyIn) {
      input.value = buyIn;
    }

    slider.value = input.value;
  });
}

function updateBlindFields() {
  const hasSmallBlind = hasSmallBlindInput.checked;
  const hasBigBlind = hasBigBlindInput.checked;

  smallBlindGroup.classList.toggle("hidden", !hasSmallBlind);
  bigBlindGroup.classList.toggle("hidden", !hasBigBlind);

  smallBlindInput.disabled = !hasSmallBlind;
  smallBlindSlider.disabled = !hasSmallBlind;
  smallBlindInput.required = hasSmallBlind;
  smallBlindSlider.required = hasSmallBlind;

  bigBlindInput.disabled = !hasBigBlind;
  bigBlindSlider.disabled = !hasBigBlind;
  bigBlindInput.required = hasBigBlind;
  bigBlindSlider.required = hasBigBlind;
}

sliderFields.forEach(({ input, slider }) => {
  input.addEventListener("input", () => {
    const value = Number(input.value);

    if (value >= Number(slider.min) && value <= Number(slider.max)) {
      slider.value = value;
    }
  });

  slider.addEventListener("input", () => {
    input.value = slider.value;
  });
});

buyInInput.addEventListener("input", updateSliderLimits);

hasSmallBlindInput.addEventListener("change", updateBlindFields);
hasBigBlindInput.addEventListener("change", updateBlindFields);

updateSliderLimits();
updateBlindFields();

hostForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const roomName = document.getElementById("room-name").value.trim();
  const maxPlayers = Number(document.getElementById("max-players").value);
  const buyIn = Number(buyInInput.value);
  const hasDealer = hasDealerInput.checked;
  const hasSmallBlind = hasSmallBlindInput.checked;
  const hasBigBlind = hasBigBlindInput.checked;
  const smallBlind = hasSmallBlind ? Number(smallBlindInput.value) : 0;
  const bigBlind = hasBigBlind ? Number(bigBlindInput.value) : 0;
  const ante = Number(document.getElementById("ante").value);
  const blindIncrement = Number(
    document.getElementById("blind-increment").value
  );
  const minimumRaise = Number(document.getElementById("minimum-raise").value);
  const maximumRaise = Number(document.getElementById("maximum-raise").value);

  if (!roomName) {
    alert("Informe o nome da mesa.");
    return;
  }

  if (maxPlayers < 2 || maxPlayers > 10) {
    alert("A mesa deve ter entre 2 e 10 jogadores.");
    return;
  }

  if (buyIn < 1) {
    alert("As fichas iniciais devem ser maiores que zero.");
    return;
  }

  if (hasSmallBlind && smallBlind < 1) {
    alert("A Small Blind deve ser maior que zero.");
    return;
  }

  if (hasBigBlind && bigBlind < 1) {
    alert("A Big Blind deve ser maior que zero.");
    return;
  }

  if (hasSmallBlind && hasBigBlind && bigBlind <= smallBlind) {
    alert("A Big Blind deve ser maior que a Small Blind.");
    return;
  }

  if (ante < 0 || ante > buyIn) {
    alert("O Ante deve estar entre 0 e as fichas iniciais.");
    return;
  }

  if (blindIncrement < 0 || blindIncrement > buyIn) {
    alert("O incremento dos blinds deve estar entre 0 e as fichas iniciais.");
    return;
  }

  if (minimumRaise < 1) {
    alert("O Raise mínimo deve ser maior que zero.");
    return;
  }

  if (maximumRaise <= minimumRaise) {
    alert("O Raise máximo deve ser maior que o Raise mínimo.");
    return;
  }

  if (maximumRaise > buyIn) {
    alert("O Raise máximo não pode ser maior que as fichas iniciais.");
    return;
  }

  createRoomButton.disabled = true;
  createRoomButton.textContent = "Criando mesa...";

  const roomCode = generateRoomCode();
  const hostToken = crypto.randomUUID();

  const { data, error } = await supabaseClient
    .from("POKER_rooms")
    .insert({
      code: roomCode,
      name: roomName,
      max_players: maxPlayers,
      buy_in: buyIn,
      has_dealer: hasDealer,
      has_small_blind: hasSmallBlind,
      has_big_blind: hasBigBlind,
      small_blind: smallBlind,
      big_blind: bigBlind,
      ante: ante,
      blind_increment: blindIncrement,
      minimum_raise: minimumRaise,
      maximum_raise: maximumRaise,
      status: "waiting"
    })
    .select("id, code")
    .single();

  if (error) {
    createRoomButton.disabled = false;
    createRoomButton.textContent = "Criar mesa";

    alert(`Não foi possível criar a mesa: ${error.message}`);
    console.error(error);
    return;
  }

  sessionStorage.setItem(
    "pokerlocal_room",
    JSON.stringify({
      id: data.id,
      code: data.code,
      hostToken,
      isHost: true
    })
  );

  window.location.href = "/sala.html";
});
const joinForm = document.getElementById("join-form");
const roomCodeInput = document.getElementById("room-code-input");
const joinButton = document.getElementById("join-button");

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
});

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const roomCode = roomCodeInput.value.trim();
  const playerName = getPlayerName();

  if (roomCode.length !== 6) {
    alert("Informe um código de sala válido com 6 caracteres.");
    return;
  }

  joinButton.disabled = true;
  joinButton.textContent = "Entrando...";

  const { data: room, error: roomError } = await supabaseClient
    .from("POKER_rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    joinButton.disabled = false;
    joinButton.textContent = "Entrar na mesa";

    alert("Sala não encontrada. Verifique o código.");
    return;
  }

  const { data: players, error: playersError } = await supabaseClient
    .from("POKER_players")
    .select("seat")
    .eq("room_id", room.id);

  if (playersError) {
    joinButton.disabled = false;
    joinButton.textContent = "Entrar na mesa";

    alert("Não foi possível verificar os jogadores da sala.");
    console.error(playersError);
    return;
  }

  if (players.length >= room.max_players) {
    joinButton.disabled = false;
    joinButton.textContent = "Entrar na mesa";

    alert("Esta mesa está cheia.");
    return;
  }

  const usedSeats = players.map((player) => player.seat);
  let seat = 1;

  while (usedSeats.includes(seat)) {
    seat += 1;
  }

  const { data: player, error: playerError } = await supabaseClient
    .from("POKER_players")
    .insert({
      room_id: room.id,
      name: playerName,
      seat,
      stack: room.buy_in,
      is_host: false
    })
    .select("id")
    .single();

  if (playerError) {
    joinButton.disabled = false;
    joinButton.textContent = "Entrar na mesa";

    alert(`Não foi possível entrar na mesa: ${playerError.message}`);
    console.error(playerError);
    return;
  }

  sessionStorage.setItem(
    "pokerlocal_room",
    JSON.stringify({
      id: room.id,
      code: room.code,
      playerId: player.id,
      isHost: false
    })
  );

  window.location.href = "/sala.html";
});
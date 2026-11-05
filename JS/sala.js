const roomNameElement = document.getElementById("room-name");
const roomCodeElement = document.getElementById("room-code");
const roomStageElement = document.getElementById("room-stage");
const roomPotElement = document.getElementById("room-pot");
const myBetElement = document.getElementById("my-bet");
const myStackElement = document.getElementById("my-stack");
const myPositionsElement = document.getElementById("my-positions");
const gameWinnerElement = document.getElementById("game-winner");
const gameWinnerTextElement = document.getElementById("game-winner-text");
const eliminatedBannerElement = document.getElementById("eliminated-banner");
const playersListElement = document.getElementById("players-list");
const hostControlsElement = document.getElementById("host-controls");
const startHandButton = document.getElementById("start-hand-button");
const winnerControlElement = document.getElementById("winner-control");
const winnerSelect = document.getElementById("winner-select");
const confirmWinnerButton = document.getElementById("confirm-winner-button");
const actionControlsElement = document.getElementById("action-controls");
const actionInfoElement = document.getElementById("action-info");
const foldButton = document.getElementById("fold-button");
const checkButton = document.getElementById("check-button");
const callButton = document.getElementById("call-button");
const allInButton = document.getElementById("all-in-button");
const raiseInput = document.getElementById("raise-input");
const raiseButton = document.getElementById("raise-button");
const settingsButton = document.getElementById("settings-button");

const stageNames = {
  waiting: "Aguardando",
  preflop: "Pré-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  finished: "Mão encerrada"
};

const stageOrder = ["preflop", "flop", "turn", "river", "showdown"];
const REBUY_AMOUNT = 100;

let room = null;
let currentPlayer = null;
let isLoading = false;
let isAdvancing = false;

function getStoredRoom() {
  const storedRoom = sessionStorage.getItem("pokerlocal_room");

  if (!storedRoom) return null;

  try {
    return JSON.parse(storedRoom);
  } catch {
    return null;
  }
}

function isHost() {
  const storedRoom = getStoredRoom();

  return Boolean(
    storedRoom &&
      storedRoom.isHost === true &&
      storedRoom.hostToken &&
      room &&
      storedRoom.id === room.id
  );
}

function formatValue(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function getPlayerPositions(player) {
  const positions = [];
  const position = player.position || "";

  if (position.includes("dealer")) positions.push("Dealer");
  if (position.includes("small_blind")) positions.push("Small Blind");
  if (position.includes("big_blind")) positions.push("Big Blind");

  return positions;
}

function isDealer(player) {
  return (player.position || "").includes("dealer");
}

function getPlayersInHand() {
  return room.players.filter(
    (player) => !player.folded && !player.eliminated
  );
}

function getPlayersWhoCanAct() {
  return room.players.filter(
    (player) =>
      !player.folded &&
      !player.eliminated &&
      !player.is_all_in &&
      player.stack > 0
  );
}

function getEligiblePlayers() {
  return room.players.filter(
    (player) =>
      !player.eliminated &&
      (player.stack > 0 || player.is_all_in)
  );
}

function getNextPlayerFromSeat(seat) {
  const players = getPlayersWhoCanAct().sort(
    (a, b) => a.seat - b.seat
  );

  if (players.length === 0) return null;

  const next = players.find((player) => player.seat > seat);
  return next || players[0];
}

function renderMyInfo() {
  if (!currentPlayer) {
    myBetElement.textContent = "0";
    myStackElement.textContent = "—";
    myPositionsElement.textContent = "";
    return;
  }

  myBetElement.textContent = formatValue(currentPlayer.bet_this_round);
  myStackElement.textContent = formatValue(currentPlayer.stack);

  myPositionsElement.textContent = "";

  const positions = getPlayerPositions(currentPlayer);

  if (positions.length === 0) {
    const badge = document.createElement("span");
    badge.className = "position-badge neutral";
    badge.textContent = "Jogador";
    myPositionsElement.appendChild(badge);
    return;
  }

  positions.forEach((position) => {
    const badge = document.createElement("span");
    badge.className = "position-badge";
    badge.textContent = position;

    if (position === "Dealer") badge.classList.add("dealer");
    if (position === "Small Blind") badge.classList.add("small-blind");
    if (position === "Big Blind") badge.classList.add("big-blind");

    myPositionsElement.appendChild(badge);
  });
}

function renderBanners() {
  const gameIsOver = Boolean(room.winner_player_id);

  if (gameIsOver) {
    const winner = room.players.find(
      (player) => player.id === room.winner_player_id
    );

    if (winner) {
      gameWinnerTextElement.textContent =
        `Vencedor do jogo: ${winner.name}`;
      gameWinnerElement.classList.remove("hidden");
    } else {
      gameWinnerElement.classList.add("hidden");
    }
  } else {
    gameWinnerElement.classList.add("hidden");
  }

  const iAmEliminated =
    currentPlayer &&
    (currentPlayer.eliminated ||
      (currentPlayer.stack === 0 && !currentPlayer.is_all_in));

  eliminatedBannerElement.classList.toggle(
    "hidden",
    !iAmEliminated || gameIsOver
  );
}

function renderRoom() {
  roomNameElement.textContent = room.name || "Mesa sem nome";
  roomCodeElement.textContent = room.code;
  roomStageElement.textContent =
    stageNames[room.hand_stage] || room.hand_stage;
  roomPotElement.textContent = formatValue(room.pot);

  renderMyInfo();
  renderBanners();

  const host = isHost();
  const gameIsOver = Boolean(room.winner_player_id);

  const canStartHand =
    !gameIsOver &&
    (room.hand_stage === "waiting" || room.hand_stage === "finished") &&
    getEligiblePlayers().length >= 2;

  hostControlsElement.classList.toggle("hidden", !host || gameIsOver);
  startHandButton.classList.toggle("hidden", !canStartHand);

  const canChooseWinner =
    host && !gameIsOver && room.hand_stage === "showdown";

  winnerControlElement.classList.toggle("hidden", !canChooseWinner);

  if (canChooseWinner) {
    winnerSelect.textContent = "";

    getPlayersInHand().forEach((player) => {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = player.name;
      winnerSelect.appendChild(option);
    });
  }
}

function renderPlayers() {
  playersListElement.textContent = "";

  room.players.forEach((player) => {
    const playerElement = document.createElement("div");
    playerElement.className = "player-item";

    if (player.id === room.current_player_id) {
      playerElement.classList.add("current-turn");
    }

    if (player.folded) playerElement.classList.add("folded");

    const isEliminated =
      player.eliminated ||
      (player.stack === 0 && !player.is_all_in);

    if (isEliminated) {
      playerElement.classList.add("eliminated");
    }

    if (player.id === room.winner_player_id) {
      playerElement.classList.add("game-winner-player");
    }

    const playerInfo = document.createElement("div");
    playerInfo.className = "player-info";

    const playerName = document.createElement("strong");
    playerName.textContent = player.name;

    const positions = getPlayerPositions(player);

    if (positions.length > 0) {
      const positionBadges = document.createElement("div");
      positionBadges.className = "position-badges";

      positions.forEach((position) => {
        const badge = document.createElement("span");
        badge.className = "position-badge";
        badge.textContent = position;

        if (position === "Dealer") badge.classList.add("dealer");
        if (position === "Small Blind") badge.classList.add("small-blind");
        if (position === "Big Blind") badge.classList.add("big-blind");

        positionBadges.appendChild(badge);
      });

      playerInfo.appendChild(positionBadges);
    }

    const playerStack = document.createElement("span");
    playerStack.className = "player-stack";

    if (isEliminated) {
      playerStack.textContent = "Você perdeu todas as fichas";
    } else if (player.is_all_in) {
      playerStack.textContent = "All-in";
    } else {
      playerStack.textContent = `${formatValue(player.stack)} fichas`;
    }

    playerInfo.appendChild(playerStack);

    const playerBet = document.createElement("span");
    playerBet.className = "player-bet";
    playerBet.textContent = `Aposta: ${formatValue(player.bet_this_round)}`;

    playerElement.appendChild(playerInfo);
    playerElement.appendChild(playerBet);

    if (isHost() && !room.winner_player_id && isEliminated) {
      const rebuyButton = document.createElement("button");
      rebuyButton.className = "secondary-button rebuy-button";
      rebuyButton.type = "button";
      rebuyButton.textContent = `Trazer de volta (+${REBUY_AMOUNT})`;

      rebuyButton.addEventListener("click", () => {
        bringPlayerBack(player.id);
      });

      playerElement.appendChild(rebuyButton);
    }

    playersListElement.appendChild(playerElement);
  });
}

function renderActions() {
  const isCurrentPlayer =
    currentPlayer && currentPlayer.id === room.current_player_id;

  const canBet =
    isCurrentPlayer &&
    !room.winner_player_id &&
    room.hand_stage !== "waiting" &&
    room.hand_stage !== "showdown" &&
    room.hand_stage !== "finished" &&
    !room.betting_complete &&
    !currentPlayer.folded &&
    !currentPlayer.eliminated &&
    !currentPlayer.is_all_in &&
    currentPlayer.stack > 0;

  actionControlsElement.classList.toggle("hidden", !canBet);

  if (!canBet) return;

  const toCall = Math.max(
    0,
    room.current_bet - currentPlayer.bet_this_round
  );

  actionInfoElement.textContent =
    toCall > 0
      ? `Você precisa pagar ${formatValue(toCall)} fichas.`
      : "Nenhuma aposta para pagar nesta rodada.";

  checkButton.classList.toggle("hidden", toCall > 0);
  callButton.classList.toggle("hidden", toCall <= 0);

  checkButton.disabled = toCall > 0;
  callButton.disabled = toCall <= 0;

  raiseInput.min = room.current_bet + room.minimum_raise;
  raiseInput.max = currentPlayer.stack + currentPlayer.bet_this_round;
}

async function updateCurrentPlayer(update) {
  const { error } = await supabaseClient
    .from("POKER_players")
    .update(update)
    .eq("id", currentPlayer.id);

  if (error) {
    alert(`Não foi possível realizar a ação: ${error.message}`);
    return false;
  }

  return true;
}

async function updatePlayerById(playerId, update) {
  const { error } = await supabaseClient
    .from("POKER_players")
    .update(update)
    .eq("id", playerId);

  if (error) {
    alert(`Não foi possível atualizar o jogador: ${error.message}`);
    return false;
  }

  return true;
}

async function updatePlayers(updates) {
  for (const update of updates) {
    const { id, ...data } = update;

    const success = await updatePlayerById(id, data);

    if (!success) return false;
  }

  return true;
}

async function eliminatePlayersWithoutChips() {
  const playersToUpdate = room.players.filter(
    (player) =>
      player.stack === 0 &&
      !player.is_all_in &&
      !player.eliminated
  );

  if (playersToUpdate.length === 0) return;

  const updates = playersToUpdate.map((player) => ({
    id: player.id,
    eliminated: true
  }));

  const success = await updatePlayers(updates);

  if (!success) return;

  playersToUpdate.forEach((player) => {
    player.eliminated = true;

    if (currentPlayer && currentPlayer.id === player.id) {
      currentPlayer.eliminated = true;
    }
  });
}

async function endHandAndResetAllIns() {
  const updates = room.players.map((player) => ({
    id: player.id,
    is_all_in: false
  }));

  await updatePlayers(updates);

  room.players.forEach((player) => {
    player.is_all_in = false;

    if (currentPlayer && currentPlayer.id === player.id) {
      currentPlayer.is_all_in = false;
    }
  });

  await eliminatePlayersWithoutChips();
  await checkGameWinner();
}

async function loadRoom() {
  if (isLoading) return;

  isLoading = true;

  try {
    const storedRoom = getStoredRoom();

    if (!storedRoom || !storedRoom.id) {
      window.location.href = "/";
      return;
    }

    const { data: roomData, error: roomError } = await supabaseClient
      .from("POKER_rooms")
      .select("*")
      .eq("id", storedRoom.id)
      .single();

    if (roomError || !roomData) {
      alert(
        `Não foi possível carregar a mesa: ${
          roomError?.message || "erro desconhecido"
        }`
      );
      window.location.href = "/";
      return;
    }

    room = roomData;

    const { data: players, error: playersError } = await supabaseClient
      .from("POKER_players")
      .select("*")
      .eq("room_id", room.id)
      .order("seat", { ascending: true });

    if (playersError) {
      alert(
        `Não foi possível carregar os jogadores: ${playersError.message}`
      );
      return;
    }

    room.players = players || [];

    if (!storedRoom.playerId) {
      await joinAsPlayer();
      return;
    }

    currentPlayer = room.players.find(
      (player) => player.id === storedRoom.playerId
    );

    if (!currentPlayer) {
      await joinAsPlayer();
      return;
    }

    await eliminatePlayersWithoutChips();
    await checkGameWinner();

    renderRoom();
    renderPlayers();
    renderActions();

    await handleAutomaticProgress();
  } finally {
    isLoading = false;
  }
}

async function handleAutomaticProgress() {
  if (isAdvancing || !room || room.winner_player_id) return;

  const handIsActive =
    room.hand_stage !== "waiting" &&
    room.hand_stage !== "showdown" &&
    room.hand_stage !== "finished";

  if (!handIsActive) return;

  const playersInHand = getPlayersInHand();
  const playersWhoCanAct = getPlayersWhoCanAct();

  if (playersInHand.length >= 2 && playersWhoCanAct.length === 0) {
    await finishBettingRound();
    return;
  }

  if (room.betting_complete) {
    await finishBettingRound();
    return;
  }

  if (
    playersWhoCanAct.length === 1 &&
    playersWhoCanAct[0].bet_this_round >= room.current_bet
  ) {
    await finishBettingRound();
  }
}

async function checkGameWinner() {
  if (room.winner_player_id) return;

  const eligiblePlayers = getEligiblePlayers();
  const hasAtLeastTwoPlayers = room.players.length >= 2;

  const gameHasStarted =
    room.hand_stage !== "waiting" &&
    room.hand_stage !== "finished";

  const handAlreadyEnded =
    room.hand_stage === "finished" && room.pot === 0;

  const canDeclareWinner =
    hasAtLeastTwoPlayers &&
    eligiblePlayers.length === 1 &&
    (gameHasStarted || handAlreadyEnded);

  if (!canDeclareWinner) return;

  const winner = eligiblePlayers[0];

  const { error } = await supabaseClient
    .from("POKER_rooms")
    .update({
      winner_player_id: winner.id,
      pot: 0,
      current_bet: 0,
      current_player_id: null,
      hand_stage: "finished",
      betting_complete: true
    })
    .eq("id", room.id);

  if (error) {
    alert(`Não foi possível definir o vencedor do jogo: ${error.message}`);
    return;
  }

  room.winner_player_id = winner.id;
}

async function joinAsPlayer() {
  const storedRoom = getStoredRoom();
  const playerName = getPlayerName();

  const usedSeats = room.players.map((player) => player.seat);
  let seat = 1;

  while (usedSeats.includes(seat)) {
    seat += 1;
  }

  const { data: player, error } = await supabaseClient
    .from("POKER_players")
    .insert({
      room_id: room.id,
      name: playerName,
      seat,
      stack: room.buy_in,
      is_host: storedRoom.isHost === true
    })
    .select("*")
    .single();

  if (error) {
    alert(`Não foi possível entrar na mesa: ${error.message}`);
    return;
  }

  storedRoom.playerId = player.id;
  sessionStorage.setItem("pokerlocal_room", JSON.stringify(storedRoom));

  await loadRoom();
}

async function bringPlayerBack(playerId) {
  if (!isHost()) {
    alert("Apenas o host pode trazer jogadores de volta.");
    return;
  }

  if (room.winner_player_id) {
    alert("O jogo já terminou.");
    return;
  }

  const success = await updatePlayerById(playerId, {
    stack: REBUY_AMOUNT,
    eliminated: false,
    folded: true,
    is_all_in: false,
    bet_this_round: 0,
    has_acted: true
  });

  if (!success) return;

  await supabaseClient
    .from("POKER_rooms")
    .update({ winner_player_id: null })
    .eq("id", room.id);

  await loadRoom();
}

async function startHand() {
  if (!isHost()) {
    alert("Apenas o host pode iniciar a mão.");
    return;
  }

  if (room.winner_player_id) {
    alert("O jogo já terminou.");
    return;
  }

  const eligiblePlayers = getEligiblePlayers();

  if (eligiblePlayers.length < 2) {
    alert("É necessário pelo menos dois jogadores com fichas.");
    return;
  }

  const newSmallBlind = room.has_small_blind
    ? room.small_blind + room.blind_increment
    : 0;

  const newBigBlind = room.has_big_blind
    ? room.big_blind + room.blind_increment
    : 0;

  const players = [...eligiblePlayers].sort((a, b) => a.seat - b.seat);

  const dealerIndex = players.findIndex((player) => isDealer(player));
  const nextDealerIndex =
    dealerIndex === -1 ? 0 : (dealerIndex + 1) % players.length;

  const dealer = players[nextDealerIndex];
  const otherPlayer = players.find((player) => player.id !== dealer.id);

  const updates = players.map((player) => ({
    id: player.id,
    bet_this_round: 0,
    folded: false,
    is_all_in: false,
    has_acted: false,
    position: null
  }));

  const dealerUpdate = updates.find(
    (update) => update.id === dealer.id
  );

  let smallBlindPlayer = null;
  let bigBlindPlayer = null;

  if (players.length === 2) {
    if (room.has_dealer && room.has_small_blind) {
      dealerUpdate.position = "dealer_small_blind";
      smallBlindPlayer = dealer;
    } else if (room.has_dealer) {
      dealerUpdate.position = "dealer";
    }

    if (room.has_big_blind) {
      bigBlindPlayer = otherPlayer;

      updates.find(
        (update) => update.id === otherPlayer.id
      ).position = room.has_dealer ? "big_blind" : "dealer_big_blind";

      if (!room.has_dealer) {
        bigBlindPlayer = dealer;
        dealerUpdate.position = "dealer_big_blind";

        updates.find(
          (update) => update.id === otherPlayer.id
        ).position = null;
      }
    }
  } else {
    if (room.has_dealer) {
      dealerUpdate.position = "dealer";
    }

    if (room.has_small_blind) {
      smallBlindPlayer = players[(nextDealerIndex + 1) % players.length];

      updates.find(
        (update) => update.id === smallBlindPlayer.id
      ).position = room.has_dealer
        ? "small_blind"
        : "dealer_small_blind";

      if (!room.has_dealer) {
        smallBlindPlayer = dealer;
        dealerUpdate.position = "dealer_small_blind";
      }
    }

    if (room.has_big_blind) {
      const bigBlindIndex =
        nextDealerIndex + (room.has_small_blind ? 2 : 1);

      bigBlindPlayer = players[bigBlindIndex % players.length];

      updates.find(
        (update) => update.id === bigBlindPlayer.id
      ).position = "big_blind";
    }
  }

  let pot = 0;

  for (const update of updates) {
    const player = room.players.find(
      (current) => current.id === update.id
    );

    let mandatoryBet = room.ante;

    if (smallBlindPlayer && player.id === smallBlindPlayer.id) {
      mandatoryBet += newSmallBlind;
    }

    if (bigBlindPlayer && player.id === bigBlindPlayer.id) {
      mandatoryBet += newBigBlind;
    }

    const bet = Math.min(mandatoryBet, player.stack);

    update.bet_this_round = bet;
    update.stack = player.stack - bet;

    if (update.stack === 0) {
      update.is_all_in = true;
    }

    pot += bet;
  }

  const playersUpdated = await updatePlayers(updates);

  if (!playersUpdated) return;

  let firstPlayer;

  if (players.length === 2) {
    firstPlayer = smallBlindPlayer || dealer;
  } else if (bigBlindPlayer) {
    firstPlayer = getNextPlayerFromSeat(bigBlindPlayer.seat);
  } else if (smallBlindPlayer) {
    firstPlayer = getNextPlayerFromSeat(smallBlindPlayer.seat);
  } else {
    firstPlayer = getNextPlayerFromSeat(dealer.seat);
  }

  const currentBet = bigBlindPlayer
    ? newBigBlind
    : Math.max(newSmallBlind, room.ante);

  await supabaseClient
    .from("POKER_rooms")
    .update({
      pot,
      small_blind: newSmallBlind,
      big_blind: newBigBlind,
      current_bet: currentBet,
      current_player_id: firstPlayer ? firstPlayer.id : null,
      hand_stage: "preflop",
      betting_complete: false,
      dealer_seat: dealer.seat
    })
    .eq("id", room.id);

  await loadRoom();
}

async function advanceToNextStage() {
  const currentIndex = stageOrder.indexOf(room.hand_stage);
  const nextStage = stageOrder[currentIndex + 1];

  if (!nextStage) return;

  const dealer = room.players.find((player) => isDealer(player));

  const firstPlayer = dealer
    ? getNextPlayerFromSeat(dealer.seat)
    : getPlayersWhoCanAct()[0];

  const updates = getPlayersInHand().map((player) => ({
    id: player.id,
    bet_this_round: 0,
    has_acted: false
  }));

  const playersUpdated = await updatePlayers(updates);

  if (!playersUpdated) return;

  await supabaseClient
    .from("POKER_rooms")
    .update({
      hand_stage: nextStage,
      current_bet: 0,
      current_player_id: firstPlayer ? firstPlayer.id : null,
      betting_complete: false
    })
    .eq("id", room.id);

  await loadRoom();
}

async function finishBettingRound() {
  if (isAdvancing) return;

  isAdvancing = true;

  try {
    await supabaseClient
      .from("POKER_rooms")
      .update({
        current_player_id: null,
        betting_complete: true
      })
      .eq("id", room.id);

    await loadRoom();

    if (room.hand_stage !== "river") {
      await advanceToNextStage();
      return;
    }

    await supabaseClient
      .from("POKER_rooms")
      .update({
        hand_stage: "showdown",
        current_player_id: null,
        betting_complete: true
      })
      .eq("id", room.id);

    await loadRoom();
  } finally {
    isAdvancing = false;
  }
}

async function awardPotToLastPlayer() {
  const playersInHand = getPlayersInHand();

  if (playersInHand.length !== 1) return false;

  const winner = playersInHand[0];

  await supabaseClient
    .from("POKER_players")
    .update({
      stack: winner.stack + room.pot
    })
    .eq("id", winner.id);

  await supabaseClient
    .from("POKER_rooms")
    .update({
      pot: 0,
      current_bet: 0,
      current_player_id: null,
      hand_stage: "finished",
      betting_complete: true
    })
    .eq("id", room.id);

  await loadRoom();

  await endHandAndResetAllIns();
  await loadRoom();

  return true;
}

async function advanceTurn() {
  const playersInHand = getPlayersInHand();
  const playersWhoCanAct = getPlayersWhoCanAct();

  if (playersInHand.length === 1) {
    const awarded = await awardPotToLastPlayer();

    if (awarded) {
      await endHandAndResetAllIns();
      await loadRoom();
    }

    return;
  }

  if (playersWhoCanAct.length === 0) {
    await finishBettingRound();
    return;
  }

  if (
    playersWhoCanAct.length === 1 &&
    playersWhoCanAct[0].bet_this_round >= room.current_bet
  ) {
    await finishBettingRound();
    return;
  }

  const everyoneActed = playersWhoCanAct.every(
    (player) => player.has_acted
  );

  const everyoneMatched = playersWhoCanAct.every(
    (player) => player.bet_this_round === room.current_bet
  );

  if (everyoneActed && everyoneMatched) {
    await finishBettingRound();
    return;
  }

  const nextPlayer = getNextPlayerFromSeat(currentPlayer.seat);

  if (!nextPlayer) {
    await finishBettingRound();
    return;
  }

  await supabaseClient
    .from("POKER_rooms")
    .update({
      current_player_id: nextPlayer.id
    })
    .eq("id", room.id);

  await loadRoom();
}

async function reopenActionExcept(raiserId) {
  const updates = getPlayersWhoCanAct()
    .filter((player) => player.id !== raiserId)
    .map((player) => ({
      id: player.id,
      has_acted: false
    }));

  await updatePlayers(updates);
}

async function fold() {
  const success = await updateCurrentPlayer({
    folded: true,
    has_acted: true
  });

  if (!success) return;

  await advanceTurn();
}

async function check() {
  const toCall = room.current_bet - currentPlayer.bet_this_round;

  if (toCall > 0) {
    alert("Você não pode passar: existe uma aposta para pagar.");
    return;
  }

  const success = await updateCurrentPlayer({ has_acted: true });

  if (!success) return;

  await advanceTurn();
}

async function call() {
  const toCall = room.current_bet - currentPlayer.bet_this_round;
  const amount = Math.min(toCall, currentPlayer.stack);

  const success = await updateCurrentPlayer({
    stack: currentPlayer.stack - amount,
    bet_this_round: currentPlayer.bet_this_round + amount,
    is_all_in: currentPlayer.stack - amount === 0,
    has_acted: true
  });

  if (!success) return;

  await supabaseClient
    .from("POKER_rooms")
    .update({ pot: room.pot + amount })
    .eq("id", room.id);

  await advanceTurn();
}

async function allIn() {
  const amount = currentPlayer.stack;
  const newBet = currentPlayer.bet_this_round + amount;

  const success = await updateCurrentPlayer({
    stack: 0,
    bet_this_round: newBet,
    is_all_in: true,
    has_acted: true
  });

  if (!success) return;

  const increasesCurrentBet = newBet > room.current_bet;

  await supabaseClient
    .from("POKER_rooms")
    .update({
      pot: room.pot + amount,
      current_bet: increasesCurrentBet ? newBet : room.current_bet
    })
    .eq("id", room.id);

  if (increasesCurrentBet) {
    await reopenActionExcept(currentPlayer.id);
  }

  await advanceTurn();
}

async function raise() {
  const targetBet = Number(raiseInput.value);

  const maxBet =
    currentPlayer.stack + currentPlayer.bet_this_round;

  if (
    targetBet < room.current_bet + room.minimum_raise ||
    targetBet > maxBet
  ) {
    alert("Valor de aumento inválido.");
    return;
  }

  const amount = targetBet - currentPlayer.bet_this_round;

  const success = await updateCurrentPlayer({
    stack: currentPlayer.stack - amount,
    bet_this_round: targetBet,
    is_all_in: currentPlayer.stack - amount === 0,
    has_acted: true
  });

  if (!success) return;

  await supabaseClient
    .from("POKER_rooms")
    .update({
      pot: room.pot + amount,
      current_bet: targetBet
    })
    .eq("id", room.id);

  await reopenActionExcept(currentPlayer.id);

  await advanceTurn();
}

async function confirmWinner() {
  if (!isHost()) {
    alert("Apenas o host pode confirmar o vencedor.");
    return;
  }

  if (room.hand_stage !== "showdown") {
    alert("O vencedor só pode ser confirmado no Showdown.");
    return;
  }

  const winnerId = winnerSelect.value;

  if (!winnerId) {
    alert("Selecione o vencedor.");
    return;
  }

  const winner = room.players.find(
    (player) => player.id === winnerId
  );

  await supabaseClient
    .from("POKER_players")
    .update({
      stack: winner.stack + room.pot
    })
    .eq("id", winnerId);

  await supabaseClient
    .from("POKER_rooms")
    .update({
      pot: 0,
      current_bet: 0,
      current_player_id: null,
      hand_stage: "finished",
      betting_complete: true
    })
    .eq("id", room.id);

  await loadRoom();

  await endHandAndResetAllIns();
  await loadRoom();
}

function subscribeToRoom() {
  const storedRoom = getStoredRoom();

  if (!storedRoom || !storedRoom.id) return;

  supabaseClient
    .channel(`pokerlocal_room_${storedRoom.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "POKER_rooms",
        filter: `id=eq.${storedRoom.id}`
      },
      () => loadRoom()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "POKER_players",
        filter: `room_id=eq.${storedRoom.id}`
      },
      () => loadRoom()
    )
    .subscribe();
}

startHandButton.addEventListener("click", startHand);
foldButton.addEventListener("click", fold);
checkButton.addEventListener("click", check);
callButton.addEventListener("click", call);
allInButton.addEventListener("click", allIn);
raiseButton.addEventListener("click", raise);
confirmWinnerButton.addEventListener("click", confirmWinner);

settingsButton.addEventListener("click", () => {
  window.location.href = "/config.html";
});

loadRoom();
subscribeToRoom();
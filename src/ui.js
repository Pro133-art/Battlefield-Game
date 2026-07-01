export function createUI() {
  const statusPanel = document.getElementById("statusPanel");
  const selectionPanel = document.getElementById("selectionPanel");
  const messageBanner = document.getElementById("messageBanner");
  const restartButton = document.getElementById("restartButton");
  const pauseButton = document.getElementById("pauseButton");

  let flashTimer = 0;

  function update(game, deltaTime) {
    flashTimer = Math.max(0, flashTimer - deltaTime);

    statusPanel.innerHTML = `
      <h2>Status</h2>
      <div class="stat-grid">
        <div class="stat"><span>Blue gold</span><span class="value-good">${game.playerGold}</span></div>
        <div class="stat"><span>Red gold</span><span class="value-danger">${game.enemyGold}</span></div>
        <div class="stat"><span>Blue units</span><span>${game.units.filter((unit) => unit.team === "player").length}</span></div>
        <div class="stat"><span>Red units</span><span>${game.units.filter((unit) => unit.team === "enemy").length}</span></div>
      </div>
    `;

    const selected = game.units.find((unit) => unit.id === game.selectedUnitId) ?? null;
    if (selected) {
      selectionPanel.innerHTML = `
        <h2>Selected Unit</h2>
        <div class="selection">
          <div class="stat"><span>Type</span><span>${selected.type}</span></div>
          <div class="stat"><span>Health</span><span>${Math.max(0, Math.round(selected.health))}/${selected.maxHealth}</span></div>
          <div class="stat"><span>Damage</span><span>${selected.attackDamage}</span></div>
          <div class="stat"><span>Range</span><span>${selected.attackRangeTiles} tile(s)</span></div>
        </div>
      `;
    } else {
      selectionPanel.innerHTML = `
        <h2>Selected Unit</h2>
        <div class="selection"><p class="empty">No unit selected.</p></div>
      `;
    }

    if (flashTimer <= 0) {
      messageBanner.textContent = game.messages[0] ?? "";
    }
  }

  function flashMessage(message) {
    messageBanner.textContent = message;
    flashTimer = 2.4;
  }

  function bindControls({ onRestart, onPause }) {
    restartButton.addEventListener("click", onRestart);
    pauseButton.addEventListener("click", onPause);
  }

  return {
    update,
    flashMessage,
    bindControls,
    setPausedLabel(paused) {
      pauseButton.textContent = paused ? "Resume" : "Pause";
    },
  };
}

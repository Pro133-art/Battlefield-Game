export function createUI() {
  const statusPanel = document.getElementById("statusPanel");
  const selectionPanel = document.getElementById("selectionPanel");
  const messageBanner = document.getElementById("messageBanner");
  const restartButton = document.getElementById("restartButton");
  const pauseButton = document.getElementById("pauseButton");
  const deploymentButtons = Array.from(document.querySelectorAll(".deploy-button[data-deploy-key]")).map((button) => ({
    button,
    key: button.dataset.deployKey,
    label: button.querySelector(".deploy-button__label")?.textContent?.trim() ?? button.dataset.deployKey,
    cooldownText: button.querySelector(".deploy-button__cooldown-text"),
    cooldownFill: button.querySelector(".deploy-button__cooldown-fill"),
    cooldownSeconds: Number(button.dataset.cooldownSeconds ?? 0),
    locked: button.dataset.locked === "true",
    readyAt: 0,
  }));

  let flashTimer = 0;
  let currentTime = 0;

  function updateDeploymentDeck() {
    for (const entry of deploymentButtons) {
      const remaining = Math.max(0, entry.readyAt - currentTime);
      const onCooldown = !entry.locked && remaining > 0;
      const fill = entry.locked ? 1 : onCooldown ? Math.min(1, remaining / Math.max(entry.cooldownSeconds, 0.001)) : 0;

      entry.button.style.setProperty("--cooldown-fill", String(fill));
      entry.button.dataset.cooldownActive = String(onCooldown);

      if (entry.locked) {
        entry.cooldownText.textContent = "LOCKED";
        continue;
      }

      if (onCooldown) {
        entry.cooldownText.textContent = `${remaining.toFixed(1)}s`;
        continue;
      }

      entry.cooldownText.textContent = "READY";
    }
  }

  function update(game, deltaTime) {
    currentTime = game.time;
    flashTimer = Math.max(0, flashTimer - deltaTime);
    updateDeploymentDeck();

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

  function bindControls({ onRestart, onPause, onDeploy }) {
    restartButton.addEventListener("click", onRestart);
    pauseButton.addEventListener("click", onPause);

    for (const entry of deploymentButtons) {
      entry.button.addEventListener("click", () => {
        if (entry.locked) {
          flashMessage(`${entry.label} are not deployed yet.`);
          return;
        }

        const remaining = Math.max(0, entry.readyAt - currentTime);
        if (remaining > 0) {
          flashMessage(`${entry.label} ready in ${remaining.toFixed(1)}s.`);
          return;
        }

        const result = onDeploy?.(entry.key) ?? null;
        if (result?.message) {
          flashMessage(result.message);
        }

        if (result?.success) {
          entry.readyAt = currentTime + entry.cooldownSeconds;
          updateDeploymentDeck();
        }
      });
    }
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

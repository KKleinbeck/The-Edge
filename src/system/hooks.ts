import GrenadePicker from "../applications/grenades-picker.js";

export default function registerCustomHooks() {
  Hooks.on("ready", function() {
    _setupGrenadePicker();

    // Redraw the hotbar to a sensible actor
    ui.hotbar._onResize(); // Initialize size
    ui.hotbar.render(true);
  });

  Hooks.on("renderTokenHUD", function(_tokenHUG) { _preventGrenadePick() });

  Hooks.on("closeBasePlaceableHUD", function(_tokenHUD) { _preventGrenadePick() });

  Hooks.on("onModifierEvent", _onModifierEvent);
}


function _setupGrenadePicker() {
  let rightClickStart: number | null = null;
  let startPos: TPosition | null = null;
  let gp: GrenadePicker | null = null;
  // TODO: make user controllable options
  const maxClickDuration = 300; // ms
  const maxMoveDistance = 5;    // px

  canvas.app.view.addEventListener("mousedown", e => {
    if (e.button === 2) {
      rightClickStart = Date.now();
      startPos = { x: e.clientX, y: e.clientY };
    }
  });

  canvas.app.view.addEventListener("mouseup", e => {
    if (e.button === 2 && rightClickStart) {
      if(Date.now() - game.the_edge.tokenClickTime < maxClickDuration) {
        rightClickStart = null;
        return;
      }
      if (!startPos) return;

      const duration = Date.now() - rightClickStart;
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (duration < maxClickDuration && distance < maxMoveDistance) {
        if (gp) gp.close();
        gp = new GrenadePicker({
          position: {left: e.clientX, top: e.clientY},
          mousePosition: canvas.mousePosition
        });
        if (gp.hasContent()) {
          gp.render(true);
          e.preventDefault();
        }
      }
      rightClickStart = null;
    }
  });
}


function _preventGrenadePick() { game.the_edge.tokenClickTime = Date.now(); }


function _onModifierEvent(field: TEventNames, details: Record<string, any>): boolean {
  switch (field) {
    case "rollAttackCheck-Prior":
    case "rollAttackCheck-Posterior":
      details.actor.effectHooks(field, details)
      break;
  }
  return true;
}
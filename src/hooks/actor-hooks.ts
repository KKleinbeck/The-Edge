export default function () {
  Hooks.on("moveToken", _onMoveToken);
}

function _onMoveToken(
  _document: foundryAny,
  _movement: foundryAny,
  _operation: Partial<foundryAny>,
  _user: foundryAny,
) {
  ui.combat.updateDistance();
}

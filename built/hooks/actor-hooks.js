export default function () {
    Hooks.on("moveToken", _onMoveToken);
}
function _onMoveToken(_document, _movement, _operation, _user) { ui.combat.updateDistance(); }

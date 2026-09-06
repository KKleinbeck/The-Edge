export default function () {
    Hooks.once("TheEdgeAction", _onTheEdgeAction);
}
Hooks.once("init", () => {
});

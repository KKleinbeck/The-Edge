export default function() {
  Hooks.on("updateItem", async (item, _updateContent, _updateDetails, _userID) => {
    const actorId = item.parent?.id;
    if (item.type == "Ammunition") {
      // Refresh hotbar, if the we modify an actor owning the ammunition
      if(ui.hotbar.token?.actor?.id == actorId) ui.hotbar.render(true);
    }
  })
}

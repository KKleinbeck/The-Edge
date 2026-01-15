export default function IconSelectorMixin(BaseApplication) {
  class IconSelector extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
        iconSelectorClicked: IconSelector._onIconSelected
      }
    }

    static async _onIconSelected(_event, target) {
      const iconType = target.dataset.iconType;
      const value = target.dataset.value;
      console.log("Icon clicked", iconType, value)
      this.onIconSelected(iconType, value);
    }

    onIconSelected(iconType, value) {}

    updateIcons(iconType, details) {
      const iconButtons = this.element.querySelectorAll(
        `.icon-selector[data-icon-type="${iconType}"]`
      );
      for (const iconButton of iconButtons) {
        iconButton.classList = "icon-selector"
        if (details[iconButton.dataset.value]?.selected) {
          iconButton.classList += " icon-selector-selected"
        }
      }
    }
  }

  return IconSelector;
}
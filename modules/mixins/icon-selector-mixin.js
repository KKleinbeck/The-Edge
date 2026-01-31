export default function IconSelectorMixin(BaseApplication) {
  class IconSelector extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
        iconSelectorClicked: IconSelector._onIconSelected
      }
    }

    _onRender(context, options) {
      super._onRender(context, options)
      this.element.querySelector(".dynamic-icon")?.addEventListener("click", ev => {
        this.onIconSelected(ev.currentTarget.dataset.iconType, ev.currentTarget.value);
      })
      this.element.querySelector(".dynamic-icon")?.addEventListener("change", ev => {
        this.onIconSelected(ev.currentTarget.dataset.iconType, ev.currentTarget.value);
      })
    }

    static _onIconSelected(_event, target) {
      const iconType = target.dataset.iconType;
      const value = target.dataset.value;
      this.onIconSelected(iconType, value);
    }

    onIconSelected(iconType, value) {}

    updateIcons(iconType, details, dynamicValue = "") {
      const iconButtons = this.element.querySelectorAll(
        `[data-icon-type="${iconType}"]`
      );
      for (const iconButton of iconButtons) {
        iconButton.classList.remove("icon-selector-selected");
        if (details[iconButton.dataset.value]?.selected) {
          iconButton.classList.add("icon-selector-selected")
        }
        else if (iconButton.tagName === "INPUT") {
          const dynamicSelection = !Object.values(details).reduce(
            (acc, val) => acc = acc | val.selected, false
          ); // No static element is selected
          if (dynamicSelection) iconButton.classList.add("icon-selector-selected");
          iconButton.value = dynamicValue;
        }
      }
    }
  }

  return IconSelector;
}
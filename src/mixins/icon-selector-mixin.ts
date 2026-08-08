interface IIconSelected {
  selected: boolean
}

type intype = Constructor<HandlebarsApplication>;
export default function IconSelectorMixin<T extends intype>(BaseApplication: T): T {
  return class IconSelector extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
        iconSelectorClicked: IconSelector._onIconSelected
      }
    }

    _onRender(context, options) {
      super._onRender(context, options)
      this.element.querySelector(".dynamic-icon")?.addEventListener("click", (ev: Event) => {
        // @ts-expect-error
        this.onIconSelected(ev.currentTarget.dataset.iconType, ev.currentTarget.value);
      })
      this.element.querySelector(".dynamic-icon")?.addEventListener("change", (ev: Event) => {
        // @ts-expect-error
        this.onIconSelected(ev.currentTarget.dataset.iconType, ev.currentTarget.value);
      })
    }

    static _onIconSelected(_event, target) {
      const iconType = target.dataset.iconType;
      const value = target.dataset.value;
      // @ts-expect-error
      this.onIconSelected(iconType, value);
    }

    async onIconSelected(iconType, value) {}

    updateIcons(iconType: string, details: Record<string, IIconSelected>, dynamicValue: string = "") {
      const iconButtons = this.element.querySelectorAll(`[data-icon-type="${iconType}"]`);

      for (const iconButton of iconButtons) {
        iconButton.classList.remove("icon-selector-selected");
        // @ts-expect-error
        if (details[iconButton.dataset.value]?.selected) {
          iconButton.classList.add("icon-selector-selected")
        }
        else if (iconButton.tagName === "INPUT") {
          const dynamicSelection = !Object.values(details).reduce(
            (acc: boolean, val: IIconSelected) => acc = acc || val.selected, false
          ); // No static element is selected
          if (dynamicSelection) iconButton.classList.add("icon-selector-selected");
          // @ts-expect-error
          iconButton.value = dynamicValue;
        }
      }
    }
  }
}
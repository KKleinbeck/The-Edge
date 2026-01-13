export default function IconSelectorMixin(BaseApplication) {
  class IconSelector extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
        iconSelectorClicked: IconSelector.onIconSelected
      }
    }

    static async onIconSelected(_event, target) {
      const iconType = target.dataset.iconType;
      const value = target.dataset.value;
      console.log("Icon clicked", iconType, value)
    }
  }

  return IconSelector;
}
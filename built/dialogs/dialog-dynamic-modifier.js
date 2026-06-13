import LocalisationServer from "../system/localisation_server.js";
const { DialogV2 } = foundry.applications.api;
const { HTMLCodeMirrorElement } = foundry.applications.elements;
export default class DialogDynamicModifier extends DialogV2 {
    static DEFAULT_CONFIG = {
        position: { width: 600, height: 600 },
    };
    static async prompt(value = "", config = {}) {
        config.content = DialogDynamicModifier._setupContent(value);
        config.ok = DialogDynamicModifier._setupCallback();
        return await super.prompt(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
    static _setupContent(value) {
        let codeMirrorEl = HTMLCodeMirrorElement.create({
            language: "javascript",
            value: value
        });
        let content = document.createElement("div");
        content.style.height = "480px";
        content.appendChild(codeMirrorEl);
        // Outer element must have no style values
        let wrapper = document.createElement("div");
        wrapper.appendChild(content);
        return wrapper;
    }
    static _setupCallback() {
        return {
            label: LocalisationServer.localise("Accept Changes", "dialog"),
            callback: (_event, _button, dialog) => {
                const codeMirrorEl = dialog.element.querySelector("code-mirror");
                return codeMirrorEl.value;
            }
        };
    }
}

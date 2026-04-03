import { REPLACEMENTS } from "../templates.js";
const { renderTemplate } = foundry.applications.handlebars;
export default function () {
    Hooks.on("renderApplicationV2", (_application, element, _, _options) => {
        element.querySelectorAll(".replace-hook")
            .forEach(async (element, _key, _parent) => {
            if (!(element instanceof HTMLElement))
                return;
            const context = JSON.parse(element.dataset.context ?? "{}");
            console.log(context);
            const template = REPLACEMENTS[element.dataset.replaceBy];
            const newElementHTML = await renderTemplate(template, context);
            const newElement = document.createElement("div");
            newElement.innerHTML = newElementHTML;
            element.replaceWith(newElement);
        });
    });
}

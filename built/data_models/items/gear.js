import { generateDataModelWithComponents } from "../abstracts.js";
import DescriptionData from "./components/description.js";
import StackableData from "./components/stackable.js";
export default class GearData extends generateDataModelWithComponents(DescriptionData, StackableData) {
}

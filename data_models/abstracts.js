export class DataModelComponent {
  constructor() {
    if (new.target === DataModelComponent) {
      throw new Error("Cannot instantiate abstract class.");
    }
  }

  static get SCHEMA() {
    throw new Error("Static field SCHEMA must be defined in derived classes.");
  }
}

function mergeProperties(targetClass, referenceClass) {
  function copyByName(target, reference, name) {
    const descriptor = Object.getOwnPropertyDescriptor(reference, name);
    if (typeof reference.value === 'function') {
      // If the method already exists, chain it
      if (target[name]) {
        const existingMethod = target[name];
        target[name] = function (...args) {
          existingMethod.apply(this, args);
          return reference[name].apply(this, args);
        };
      } else {
        target[name] = reference[name];
      }
    } else {
      // For properties, just copy the descriptor
      Object.defineProperty(
        target, name, Object.getOwnPropertyDescriptor(reference, name)
      );
    }
  }

  const filterProperties = new Set([
    "name", "length", "prototype", "SCHEMA"
  ]);

  // Transfer all static methods and properties from components to the new class
  Object.getOwnPropertyNames(referenceClass)
    .filter(name => !filterProperties.has(name))
    .forEach(name => { copyByName(targetClass, referenceClass, name) });

  // Transfer all instance methods and properties from components to the new class
  Object.getOwnPropertyNames(referenceClass.prototype)
    .filter(name => name !== "constructor")
    .forEach(name => { copyByName(targetClass.prototype, referenceClass.prototype, name) });
}

function combineDataModelComponents(...components) {
  class CombinedDataModelComponent extends DataModelComponent {
    static get SCHEMA() {
      return components.reduce((acc, Component) => {
        return { ...acc, ...Component.SCHEMA };
      }, {});
    }
  }

  components.forEach(Component => {
    mergeProperties(CombinedDataModelComponent, Component)
  });

  return CombinedDataModelComponent;
}

export function generateDataModelWithComponents(...components) {
  const combinedComponent = combineDataModelComponents(...components);
  class TempDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {return combinedComponent.SCHEMA;}
  };

  mergeProperties(TempDataModel, combinedComponent);
  return TempDataModel
}

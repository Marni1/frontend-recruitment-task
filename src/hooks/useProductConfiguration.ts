import { useCallback, useState } from "react";
import type {
  AddOn,
  Configuration,
  Product,
} from "../components/ProductConfigurator/types";

type SelectionValue = string | number | boolean;
type Selections = Record<string, SelectionValue>;

type UseProductConfigurationOptions = {
  onDependencyMissing?: () => void;
};

export const getDefaultSelections = (product: Product): Selections => {
  const selections: Selections = {};

  for (const option of product.options) {
    if (option.defaultValue !== undefined) {
      selections[option.id] = option.defaultValue;
    } else if (option.choices && option.choices.length > 0) {
      const firstAvailable = option.choices.find((choice) => choice.available);

      if (firstAvailable) {
        selections[option.id] = firstAvailable.value;
      }
    }
  }

  return selections;
};

export const isAddOnAvailable = (
  addOn: AddOn,
  selections: Selections,
): boolean => {
  if (!addOn.dependsOn) return true;

  const dependencyValue = selections[addOn.dependsOn.optionId];
  return dependencyValue === addOn.dependsOn.requiredValue;
};

export const useProductConfiguration = (
  product: Product,
  initialConfiguration?: Partial<Configuration>,
  options: UseProductConfigurationOptions = {},
) => {
  const { onDependencyMissing } = options;

  const [selections, setSelections] = useState<Selections>(
    () => initialConfiguration?.selections || getDefaultSelections(product),
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(
    () => initialConfiguration?.addOns || [],
  );
  const [quantity, setQuantity] = useState<number>(
    () => initialConfiguration?.quantity || 1,
  );
  const [isDirty, setIsDirty] = useState(false);

  const handleOptionChange = useCallback(
    (optionId: string, value: SelectionValue) => {
      setSelections((prev) => ({
        ...prev,
        [optionId]: value,
      }));

      const option = product.options.find((item) => item.id === optionId);
      if (!option) return;

      const dependentAddOns = product.addOns.filter(
        (addOn) => addOn.dependsOn?.optionId === optionId,
      );
      const idsToRemove = dependentAddOns
        .filter(
          (addOn) => addOn.dependsOn && value !== addOn.dependsOn.requiredValue,
        )
        .map((addOn) => addOn.id);

      if (idsToRemove.length > 0) {
        setSelectedAddOns((prev) =>
          prev.filter((id) => !idsToRemove.includes(id)),
        );
      }
    },
    [product.options, product.addOns],
  );

  const handleAddOnToggle = useCallback(
    (addOnId: string) => {
      const addOn = product.addOns.find((item) => item.id === addOnId);
      if (!addOn) return;

      if (!isAddOnAvailable(addOn, selections)) {
        onDependencyMissing?.();
        return;
      }

      setSelectedAddOns((prev) => {
        if (prev.includes(addOnId)) {
          return prev.filter((id) => id !== addOnId);
        }

        return [...prev, addOnId];
      });
    },
    [product.addOns, selections, onDependencyMissing],
  );

  const handleQuantityChange = useCallback(
    (newQuantity: number) => {
      const quantityOption = product.options.find(
        (option) => option.type === "quantity",
      );
      const min = quantityOption?.min ?? 1;
      const max = quantityOption?.max ?? 999;

      const clampedQuantity = Math.max(min, Math.min(max, newQuantity));
      setQuantity(clampedQuantity);
    },
    [product.options],
  );

  const applyConfiguration = useCallback((configuration: Configuration) => {
    setSelections(configuration.selections);
    setSelectedAddOns(configuration.addOns);
    setQuantity(configuration.quantity);
  }, []);

  const applyPartialConfiguration = useCallback(
    (configuration: Partial<Configuration>) => {
      if (configuration.selections) setSelections(configuration.selections);
      if (configuration.addOns) setSelectedAddOns(configuration.addOns);
      if (configuration.quantity) setQuantity(configuration.quantity);
    },
    [],
  );

  const resetConfiguration = useCallback(() => {
    setSelections(getDefaultSelections(product));
    setSelectedAddOns([]);
    setQuantity(1);
    setIsDirty(false);
  }, [product]);

  return {
    selections,
    selectedAddOns,
    quantity,
    isDirty,
    setIsDirty,
    handleOptionChange,
    handleAddOnToggle,
    handleQuantityChange,
    applyConfiguration,
    applyPartialConfiguration,
    resetConfiguration,
  };
};

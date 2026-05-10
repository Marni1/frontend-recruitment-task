import type { RefObject } from "react";
import type { ProductOption } from "../types";
import { ColorOption } from "./ColorOption";
import { QuantityOption } from "./QuantityOption";
import { SelectOption } from "./SelectOption";
import { ToggleOption } from "./ToggleOption";

type NextDiscountTier = {
  needed: number;
  discount: number;
} | null;

type OptionRendererProps = {
  option: ProductOption;
  selections: Record<string, string | number | boolean>;
  currency: string;
  readOnly?: boolean;
  colorPickerRef: RefObject<HTMLDivElement | null>;
  quantity: number;
  appliedDiscount: number;
  nextTier: NextDiscountTier;
  onOptionChange: (optionId: string, value: string | number | boolean) => void;
  onQuantityChange: (quantity: number) => void;
};

export const OptionRenderer = ({
  option,
  selections,
  currency,
  readOnly = false,
  colorPickerRef,
  quantity,
  appliedDiscount,
  nextTier,
  onOptionChange,
  onQuantityChange,
}: OptionRendererProps) => {
  if (option.dependsOn) {
    const dependencyValue = selections[option.dependsOn.optionId];

    if (dependencyValue !== option.dependsOn.requiredValue) {
      return null;
    }
  }

  switch (option.type) {
    case "select":
      return (
        <SelectOption
          option={option}
          value={selections[option.id] as string}
          currency={currency}
          readOnly={readOnly}
          onChange={onOptionChange}
        />
      );
    case "color":
      return (
        <ColorOption
          option={option}
          value={selections[option.id] as string}
          readOnly={readOnly}
          pickerRef={colorPickerRef}
          onChange={onOptionChange}
        />
      );
    case "quantity":
      return (
        <QuantityOption
          option={option}
          quantity={quantity}
          appliedDiscount={appliedDiscount}
          nextTier={nextTier}
          readOnly={readOnly}
          onChange={onQuantityChange}
        />
      );
    case "toggle":
      return (
        <ToggleOption
          option={option}
          value={selections[option.id] as boolean}
          readOnly={readOnly}
          onChange={onOptionChange}
        />
      );
    default:
      return null;
  }
};

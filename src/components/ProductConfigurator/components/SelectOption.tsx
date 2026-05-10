import { formatPrice } from "../../../utils/pricing";
import type { ProductOption } from "../types";

type SelectOptionProps = {
  option: ProductOption;
  value: string;
  currency: string;
  readOnly?: boolean;
  onChange: (optionId: string, value: string) => void;
};

export const SelectOption = ({
  option,
  value,
  currency,
  readOnly = false,
  onChange,
}: SelectOptionProps) => {
  return (
    <div className="option-group">
      <label className="option-label" htmlFor={`option-${option.id}`}>
        {option.name}
        {option.required && <span className="required">*</span>}
      </label>
      <select
        id={`option-${option.id}`}
        className="option-select"
        value={value || ""}
        onChange={(e) => onChange(option.id, e.target.value)}
        disabled={readOnly}
        data-testid={`option-${option.id}`}
      >
        {option.choices?.map((choice) => (
          <option
            key={choice.id}
            value={choice.value}
            disabled={!choice.available}
          >
            {choice.label}
            {choice.priceModifier !== 0 &&
              ` (${choice.priceModifier > 0 ? "+" : ""}${formatPrice(choice.priceModifier, currency)})`}
          </option>
        ))}
      </select>
    </div>
  );
};

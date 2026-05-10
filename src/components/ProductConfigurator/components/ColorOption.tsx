import type { RefObject } from "react";
import type { ProductOption } from "../types";

type ColorOptionProps = {
  option: ProductOption;
  value: string;
  readOnly?: boolean;
  pickerRef: RefObject<HTMLDivElement | null>;
  onChange: (optionId: string, value: string) => void;
};

export const ColorOption = ({
  option,
  value,
  readOnly = false,
  pickerRef,
  onChange,
}: ColorOptionProps) => {
  return (
    <div className="option-group">
      <label className="option-label">
        {option.name}
        {option.required && <span className="required">*</span>}
      </label>
      <div
        className="color-picker"
        ref={pickerRef}
        role="radiogroup"
        aria-label={option.name}
      >
        {option.choices?.map((choice, index) => (
          <div
            key={index}
            tabIndex={0}
            className={`color-swatch ${value === choice.value ? "selected" : ""}`}
            style={{ backgroundColor: choice.colorHex }}
            onClick={() => !readOnly && onChange(option.id, choice.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!readOnly) {
                  onChange(option.id, choice.value);
                }
              }
            }}
            title={choice.label}
            role="radio"
            aria-checked={value === choice.value}
          />
        ))}
      </div>
    </div>
  );
};

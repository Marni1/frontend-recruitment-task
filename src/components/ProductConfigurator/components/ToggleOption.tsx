import type { ProductOption } from "../types";

type ToggleOptionProps = {
  option: ProductOption;
  value: boolean;
  readOnly?: boolean;
  onChange: (optionId: string, value: boolean) => void;
};

export const ToggleOption = ({
  option,
  value,
  readOnly = false,
  onChange,
}: ToggleOptionProps) => {
  return (
    <div className="option-group">
      <div className="toggle-control">
        <div
          className={`toggle-switch ${value ? "active" : ""}`}
          onClick={() => !readOnly && onChange(option.id, !value)}
          role="switch"
          aria-checked={value}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(option.id, !value);
            }
          }}
        />
        <span className="toggle-label">{option.name}</span>
      </div>
    </div>
  );
};

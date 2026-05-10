import type { ProductOption } from "../types";

type NextDiscountTier = {
  needed: number;
  discount: number;
} | null;

type QuantityOptionProps = {
  option: ProductOption;
  quantity: number;
  appliedDiscount: number;
  nextTier: NextDiscountTier;
  readOnly?: boolean;
  onChange: (quantity: number) => void;
};

export const QuantityOption = ({
  option,
  quantity,
  appliedDiscount,
  nextTier,
  readOnly = false,
  onChange,
}: QuantityOptionProps) => {
  return (
    <div className="option-group">
      <label className="option-label" htmlFor="quantity-input">
        {option.name}
        {option.required && <span className="required">*</span>}
        {appliedDiscount > 0 && (
          <span className="discount-badge">{appliedDiscount}% OFF</span>
        )}
      </label>
      <div className="quantity-control">
        <button
          className="quantity-btn"
          onClick={() => onChange(quantity - 1)}
          disabled={readOnly || quantity <= (option.min ?? 1)}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          id="quantity-input"
          type="number"
          className="quantity-input"
          value={quantity}
          onChange={(e) => onChange(parseInt(e.target.value) || 1)}
          min={option.min}
          max={option.max}
          disabled={readOnly}
        />
        <button
          className="quantity-btn"
          onClick={() => onChange(quantity + 1)}
          disabled={readOnly || quantity >= (option.max ?? 999)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      {nextTier && (
        <p className="next-discount-hint">
          Add {nextTier.needed} more for {nextTier.discount}% discount!
        </p>
      )}
    </div>
  );
};

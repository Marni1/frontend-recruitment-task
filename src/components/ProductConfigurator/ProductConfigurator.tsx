/**
 * ProductConfigurator Component
 *
 * The main configurator widget for customizing products.
 * This component handles all product configuration logic including:
 * - Option selection (dropdowns, colors, toggles)
 * - Quantity management
 * - Add-on selection
 * - Price calculation
 * - Draft saving/loading
 * - Share URL generation
 *
 * Author: Marcus (no longer with company)
 * Last updated: 2 weeks ago
 *
 * Known issues:
 * - "Some timing stuff with prices, meant to fix" - Marcus
 * - "Resize handler might have a leak" - Marcus
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type {
  Product,
  AddOn,
  Configuration,
  PriceBreakdown,
  Draft,
  ValidationResult,
} from "./types";
import { ERROR_CODES } from "./types";
import { useDebouncedPriceCalculation } from "../../hooks/usePriceCalculation";
import {
  isAddOnAvailable,
  useProductConfiguration,
} from "../../hooks/useProductConfiguration";
import {
  validateConfiguration,
  saveDraft,
  loadDraft,
  getAllDrafts,
  deleteDraft,
  encodeConfigurationToUrl,
  decodeConfigurationFromUrl,
  generatePreview,
} from "../../services/api";
import {
  formatPrice,
  getAppliedDiscountPercentage,
  getNextDiscountTier,
} from "../../utils/pricing";
import { OptionRenderer } from "./components/OptionRenderer";
import "./styles.css";

interface ProductConfiguratorProps {
  product: Product;
  initialConfiguration?: Partial<Configuration>;
  onConfigurationChange?: (config: Configuration) => void;
  onAddToCart?: (config: Configuration, price: PriceBreakdown) => void;
  readOnly?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateConfigId = (): string => {
  return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

const calculateColorColumns = (
  containerWidth: number,
  swatchSize: number = 36,
  gap: number = 8,
): number => {
  const columns = Math.floor((containerWidth + gap) / (swatchSize + gap));
  return Math.max(1, columns);
};
const focusFirstModalElement = (
  ref: React.RefObject<HTMLDivElement | null>,
) => {
  setTimeout(() => {
    const firstFocusable = ref.current?.querySelector<HTMLElement>(
      'button, input, [tabindex="0"]',
    );
    firstFocusable?.focus();
  }, 0);
};

// ============================================================================
// Main Component
// ============================================================================

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({
  product,
  initialConfiguration,
  onConfigurationChange,
  onAddToCart,
  readOnly = false,
}) => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [error, setError] = useState<string | null>(null);
  const handleDependencyMissing = useCallback(() => {
    setError(ERROR_CODES.DEPENDENCY_MISSING);
  }, []);

  const {
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
  } = useProductConfiguration(product, initialConfiguration, {
    onDependencyMissing: handleDependencyMissing,
  });

  const [configId] = useState<string>(
    () => initialConfiguration?.id || generateConfigId(),
  );
  const [createdAt] = useState(() => new Date().toISOString());
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toISOString());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftName, setDraftName] = useState("");

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string>(product.imageUrl);

  const [shareUrl, setShareUrl] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------

  const currentConfig: Configuration = useMemo(
    () => ({
      id: configId,
      productId: product.id,
      selections,
      addOns: selectedAddOns,
      quantity,
      createdAt: createdAt,
      updatedAt: updatedAt,
    }),
    [
      configId,
      product.id,
      selections,
      selectedAddOns,
      quantity,
      createdAt,
      updatedAt,
    ],
  );

  const {
    price,
    formattedTotal,
    isLoading: isPriceLoading,
    error: priceError,
  } = useDebouncedPriceCalculation(currentConfig, product);

  const appliedDiscount = getAppliedDiscountPercentage(quantity);
  const nextTier = getNextDiscountTier(quantity);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleResize = () => {
      if (colorPickerRef.current) {
        const width = colorPickerRef.current.offsetWidth;
        const cols = calculateColorColumns(width);
        colorPickerRef.current.style.setProperty(
          "--color-columns",
          cols.toString(),
        );
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      try {
        const result = await validateConfiguration(currentConfig, product);
        if (!cancelled) {
          setValidation(result);
        }
      } catch {}
    };

    validate();

    return () => {
      cancelled = true;
    };
  }, [currentConfig, product]);

  useEffect(() => {
    let cancelled = false;

    const updatePreview = async () => {
      try {
        const preview = await generatePreview(currentConfig, product);
        if (!cancelled) {
          setPreviewUrl(preview.imageUrl);
        }
      } catch {
        setPreviewUrl(product.imageUrl);
      }
    };

    updatePreview();

    return () => {
      cancelled = true;
    };
  }, [currentConfig, product]);

  useEffect(() => {
    if (onConfigurationChange) {
      onConfigurationChange(currentConfig);
    }
    (() => {
      setUpdatedAt(new Date().toISOString());
      setIsDirty(true);
    })();
  }, [selections, selectedAddOns, quantity]);

  useEffect(() => {
    if (showDraftModal) {
      getAllDrafts().then(setDrafts);
      focusFirstModalElement(modalRef);
    }
  }, [showDraftModal]);

  useEffect(() => {
    if (showShareModal) {
      const encoded = encodeConfigurationToUrl(currentConfig);
      const encodedUri = encodeURIComponent(encoded);
      const url = `${window.location.origin}${window.location.pathname}?config=${encodedUri}`;

      setShareUrl(url);
      focusFirstModalElement(modalRef);
    }
  }, [showShareModal, currentConfig]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedConfig = params.get("config");

    if (encodedConfig) {
      const decoded = decodeConfigurationFromUrl(encodedConfig);
      if (decoded) {
        applyPartialConfiguration(decoded);
      }
    }
  }, [applyPartialConfiguration]);

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft(currentConfig, draftName || "Untitled Draft");
      setLastSaved(new Date());
      setIsDirty(false);
      setDraftName("");

      setShowDraftModal(false);
    } catch {
      setError(ERROR_CODES.UNKNOWN);
    }
  }, [currentConfig, draftName]);

  const handleLoadDraft = useCallback(async (draftId: string) => {
    try {
      const draft = await loadDraft(draftId);
      if (draft) {
        applyConfiguration(draft.configuration);
        setShowDraftModal(false);
        setIsDirty(false);
      }
    } catch {
      setError(ERROR_CODES.UNKNOWN);
    }
  }, [applyConfiguration, setIsDirty]);

  const handleDeleteDraft = useCallback(async (draftId: string) => {
    try {
      await deleteDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch {
      setError(ERROR_CODES.UNKNOWN);
    }
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!validation?.valid) {
      setError(validation?.errors[0]?.code || ERROR_CODES.UNKNOWN);
      return;
    }

    if (price && onAddToCart) {
      onAddToCart(currentConfig, price);
    }
  }, [validation, price, currentConfig, onAddToCart]);

  const handleQuickAdd = useCallback(() => {
    if (!validation?.valid) {
      setError(validation?.errors[0]?.code || ERROR_CODES.UNKNOWN);
      return;
    }

    if (price && onAddToCart) {
      onAddToCart(currentConfig, price);
    }
  }, [validation, price, currentConfig, onAddToCart]);

  const handleCopyShareUrl = useCallback(() => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {})
      .catch(() => {
        setError(ERROR_CODES.UNKNOWN);
      });
  }, [shareUrl]);

  const handleModalClose = useCallback((modalType: "draft" | "share") => {
    if (modalType === "draft") {
      setShowDraftModal(false);
    } else {
      setShowShareModal(false);
    }

    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, []);

  const handleModalKeyDown = useCallback(
    (e: React.KeyboardEvent, modalType: "draft" | "share") => {
      if (e.key === "Escape") {
        handleModalClose(modalType);
      }
    },
    [handleModalClose],
  );

  const handleModalTabTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const handleDiscardChanges = useCallback(() => {
    resetConfiguration();
  }, [resetConfiguration]);

  const renderAddOn = (addOn: AddOn) => {
    const isSelected = selectedAddOns.includes(addOn.id);
    const isAvailable = isAddOnAvailable(addOn, selections);

    return (
      <div
        key={addOn.name}
        className={`addon-item ${isSelected ? "selected" : ""} ${!isAvailable ? "disabled" : ""}`}
        onClick={() => !readOnly && isAvailable && handleAddOnToggle(addOn.id)}
      >
        <input
          type="checkbox"
          className="addon-checkbox"
          checked={isSelected}
          readOnly
          disabled={readOnly || !isAvailable}
        />
        <div className="addon-info">
          <div className="addon-name">{addOn.name}</div>
          <div className="addon-description">
            {addOn.description}
            {!isAvailable && addOn.dependsOn && (
              <span style={{ color: "#e74c3c" }}>
                {" "}
                (Requires {addOn.dependsOn.optionId})
              </span>
            )}
          </div>
        </div>
        <div className="addon-price">
          +{formatPrice(addOn.price, product.currency)}
        </div>
      </div>
    );
  };

  const renderPriceBreakdown = () => {
    if (!price) return null;

    return (
      <div className="price-breakdown">
        <div className="price-line">
          <span>Base price</span>
          <span>{formatPrice(price.basePrice, product.currency)}</span>
        </div>

        {price.optionModifiers.map((mod, i) => {
          const option = product.options.find((o) => o.id === mod.optionId);
          return (
            <div className="price-line" key={i}>
              <span>{option?.name || mod.optionId}</span>
              <span>
                {mod.amount >= 0 ? "+" : ""}
                {formatPrice(mod.amount, product.currency)}
              </span>
            </div>
          );
        })}

        {price.addOnCosts.map((cost, i) => {
          const addOn = product.addOns.find((a) => a.id === cost.addOnId);
          return (
            <div className="price-line" key={i}>
              <span>{addOn?.name || cost.addOnId}</span>
              <span>+{formatPrice(cost.amount, product.currency)}</span>
            </div>
          );
        })}

        {quantity > 1 && (
          <div className="price-line">
            <span>Quantity ({quantity}×)</span>
            <span>{formatPrice(price.subtotal, product.currency)}</span>
          </div>
        )}

        {price.quantityDiscount > 0 && (
          <div className="price-line discount">
            <span>Volume discount ({appliedDiscount}%)</span>
            <span>
              -{formatPrice(price.quantityDiscount, product.currency)}
            </span>
          </div>
        )}

        <div className="price-line total">
          <span>Total</span>
          <span>{formatPrice(price.total, product.currency)}</span>
        </div>
      </div>
    );
  };

  const renderDraftModal = () => {
    if (!showDraftModal) return null;

    return (
      <div
        className="modal-overlay"
        onClick={() => handleModalClose("draft")}
        onKeyDown={(e) => handleModalKeyDown(e, "draft")}
      >
        <div
          className="modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          onKeyDown={handleModalTabTrap}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3 className="modal-title">Saved Drafts</h3>
            <button
              className="modal-close"
              onClick={() => handleModalClose("draft")}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="modal-body">
            {drafts.length === 0 ? (
              <p>No saved drafts yet.</p>
            ) : (
              <ul className="draft-list">
                {drafts.map((draft) => (
                  <li key={draft.id} className="draft-list-item">
                    <div>
                      <div className="draft-item-name">{draft.name}</div>
                      <div className="draft-item-date">
                        Saved: {formatTimestamp(draft.savedAt)}
                      </div>
                    </div>
                    <div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleLoadDraft(draft.id)}
                        style={{ marginRight: "8px" }}
                      >
                        Load
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteDraft(draft.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div
              style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #eee",
              }}
            >
              <h4>Save Current Configuration</h4>
              <input
                type="text"
                placeholder="Draft name (optional)"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                }}
              />
              <button
                className="btn btn-primary btn-block"
                onClick={handleSaveDraft}
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShareModal = () => {
    if (!showShareModal) return null;

    return (
      <div
        className="modal-overlay"
        onClick={() => handleModalClose("share")}
        onKeyDown={(e) => handleModalKeyDown(e, "share")}
      >
        <div
          className="modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          onKeyDown={handleModalTabTrap}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3 className="modal-title">Share Configuration</h3>
            <button
              className="modal-close"
              onClick={() => handleModalClose("share")}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="modal-body">
            <p>Copy this link to share your configuration:</p>
            <input
              type="text"
              className="share-url-input"
              value={shareUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => handleModalClose("share")}
            >
              Close
            </button>
            <button className="btn btn-primary" onClick={handleCopyShareUrl}>
              Copy Link
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Main Render
  // -------------------------------------------------------------------------

  return (
    <div className="configurator" ref={containerRef}>
      <div className="configurator-header">
        <div>
          <h1 className="configurator-title">{product.name}</h1>
          <p className="configurator-description">{product.description}</p>
        </div>
        <div className="configurator-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              lastFocusedElement.current =
                document.activeElement as HTMLElement;
              setShowDraftModal(true);
            }}
          >
            Drafts
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              lastFocusedElement.current =
                document.activeElement as HTMLElement;
              setShowShareModal(true);
            }}
          >
            Share
          </button>
          {isDirty && (
            <button className="btn btn-danger" onClick={handleDiscardChanges}>
              Discard
            </button>
          )}
        </div>
      </div>

      {(error || priceError) && (
        <div className="error-message">
          <div>Something went wrong. Please try again.</div>
          <div className="error-code">Error: {error || priceError}</div>
        </div>
      )}

      {validation?.warnings.map((warning, i) => (
        <div key={i} className="validation-warning">
          {warning.message}
        </div>
      ))}

      <div className="configurator-layout">
        <div className="options-section">
          {product.options
            .filter((opt) => opt.type !== "quantity")
            .map((option) => (
              <OptionRenderer
                key={option.id}
                option={option}
                selections={selections}
                currency={product.currency}
                readOnly={readOnly}
                colorPickerRef={colorPickerRef}
                quantity={quantity}
                appliedDiscount={appliedDiscount}
                nextTier={nextTier}
                onOptionChange={handleOptionChange}
                onQuantityChange={handleQuantityChange}
              />
            ))}

          {product.options
            .filter((opt) => opt.type === "quantity")
            .map((option) => (
              <OptionRenderer
                key={option.id}
                option={option}
                selections={selections}
                currency={product.currency}
                readOnly={readOnly}
                colorPickerRef={colorPickerRef}
                quantity={quantity}
                appliedDiscount={appliedDiscount}
                nextTier={nextTier}
                onOptionChange={handleOptionChange}
                onQuantityChange={handleQuantityChange}
              />
            ))}

          {product.addOns.length > 0 && (
            <div className="addons-section">
              <h3 className="addons-title">Add-ons</h3>
              {product.addOns.map(renderAddOn)}
            </div>
          )}
        </div>

        <div className="preview-panel">
          <div className="preview-image-container">
            <img
              src={previewUrl}
              alt={`${product.name} preview`}
              className="preview-image"
            />
          </div>

          <div
            className={`price-display ${isPriceLoading ? "price-loading" : ""}`}
            data-testid="price-display"
          >
            <div className="price-label">Total Price</div>
            <div className="price-value" data-testid="total-price">
              {formattedTotal}
            </div>

            {renderPriceBreakdown()}

            <div className="quick-add-section">
              <button
                className="quick-add-btn"
                onClick={handleQuickAdd}
                disabled={readOnly || !validation?.valid}
              >
                ⚡ Quick Add to Cart
              </button>
            </div>
          </div>

          <button
            className="btn btn-success btn-block"
            onClick={handleAddToCart}
            disabled={readOnly || !validation?.valid || isPriceLoading}
            data-testid="add-to-cart-button"
          >
            {isPriceLoading ? "Calculating..." : "Add to Cart"}
          </button>

          <div className="config-summary">
            <div className="config-summary-title">Your Configuration</div>
            {product.options
              .filter((opt) => opt.type !== "quantity" && selections[opt.id])
              .map((opt) => {
                const value = selections[opt.id];
                let displayValue: string = String(value);

                if (opt.choices) {
                  const choice = opt.choices.find((c) => c.value === value);
                  displayValue = choice?.label || String(value);
                }

                return (
                  <div key={opt.id} className="config-summary-item">
                    <span>{opt.name}:</span>
                    <span>{displayValue}</span>
                  </div>
                );
              })}
            <div className="config-summary-item">
              <span>Quantity:</span>
              <span>{quantity}</span>
            </div>
            {selectedAddOns.length > 0 && (
              <div className="config-summary-item">
                <span>Add-ons:</span>
                <span>{selectedAddOns.length} selected</span>
              </div>
            )}
          </div>

          {lastSaved && (
            <div className="draft-section">
              <div className="draft-header">
                <span className="draft-title">Draft saved</span>
                <span className="draft-saved">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {renderDraftModal()}
      {renderShareModal()}
    </div>
  );
};

export default ProductConfigurator;

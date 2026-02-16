// usePriceCalculation Hook
// Marcus: "This hook handles async price fetching. A bit janky but works."

import { useState, useEffect, useCallback, useRef } from "react";
import type {Configuration , Product, PriceBreakdown, PriceResponse } from "../components/ProductConfigurator/types";
import { calculatePrice } from "../services/api";

interface UsePriceCalculationResult {
  price: PriceBreakdown | null;
  formattedTotal: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for managing price calculation
 */
export function usePriceCalculation(
  config: Configuration | null,
  product: Product,
): UsePriceCalculationResult {
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [formattedTotal, setFormattedTotal] = useState<string>("$0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request timestamp
  const latestRequestRef = useRef<number>(0);

  const fetchPrice = useCallback(async () => {
    if (!config) {
      setPrice(null);
      setFormattedTotal("$0.00");
      return;
    }

    setIsLoading(true);
    setError(null);

    const requestTime = Date.now();
    latestRequestRef.current = requestTime;

    try {
      const response: PriceResponse = await calculatePrice(config, product);

      if (response.timestamp >= latestRequestRef.current) {
        setPrice(response.breakdown);
        setFormattedTotal(response.formattedTotal);
      }
    } catch {
      // Only set error if this is still the latest request
      if (requestTime === latestRequestRef.current) {
        setError("ERR_PRICE_CALC_FAILED");
        setPrice(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [config, product]);

  // Fetch price when config changes
  useEffect(() => {
    fetchPrice();
  }, [config?.selections, config?.addOns, config?.quantity]);

  return {
    price,
    formattedTotal,
    isLoading,
    error,
    refetch: fetchPrice,
  };
}

/**
 * Debounced version of price calculation
 */
export function useDebouncedPriceCalculation(
  config: Configuration | null,
  product: Product,
  delay: number = 300,
): UsePriceCalculationResult {
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [formattedTotal, setFormattedTotal] = useState<string>("$0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const configRef = useRef(config);
  const productRef = useRef(product);
  configRef.current = config;
  productRef.current = product;


  const latestRequestRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const configKey = config
    ? JSON.stringify({
        selections: config.selections,
        addOns: config.addOns,
        quantity: config.quantity,
      })
    : null;


  const cancelDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);


  const executeRequest = useCallback(async () => {
    const currentConfig = configRef.current;
    const currentProduct = productRef.current;
    if (!currentConfig) return;

    const requestId = ++latestRequestRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const response = await calculatePrice(currentConfig, currentProduct);

      if (requestId === latestRequestRef.current) {
        setPrice(response.breakdown);
        setFormattedTotal(response.formattedTotal);
      }
    } catch {
      if (requestId === latestRequestRef.current) {
        setError("ERR_PRICE_CALC_FAILED");
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!config) {
      cancelDebounce();
      latestRequestRef.current++;
      setPrice(null);
      setFormattedTotal("$0.00");
      setIsLoading(false);
      setError(null);
      return;
    }

    cancelDebounce();

    // isLoading is set inside executeRequest (when the request actually fires),
    // NOT here during the debounce wait period.
    debounceTimerRef.current = setTimeout(() => {
      executeRequest();
    }, delay);

    return cancelDebounce;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, product.id, delay, cancelDebounce, executeRequest]);

  // Refetch: cancels pending debounce, fires immediately, shares the same
  // request counter so it coordinates with the effect.
  const refetch = useCallback(() => {
    if (!configRef.current) return;
    cancelDebounce();
    executeRequest();
  }, [cancelDebounce, executeRequest]);

  return {
    price,
    formattedTotal,
    isLoading,
    error,
    refetch,
  };
}

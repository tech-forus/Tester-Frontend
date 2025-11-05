/**
 * usePincodeLookup hook
 * Manages async pincode lookup with caching and debouncing
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Geo, validatePincode } from '../utils/validators';
import { getPincode } from '../services/api';
import { getCachedPincode, cachePincode, persistDraft } from '../store/draftStore';
import { emitDebug, emitDebugError } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface UsePincodeLookupReturn {
  geo: Partial<Geo>;
  isLoading: boolean;
  error: string;
  setPincode: (pincode: string) => void;
  setState: (state: string) => void;
  setCity: (city: string) => void;
  validateGeo: () => boolean;
  reset: () => void;
  loadFromDraft: (draft: Partial<Geo>) => void;
  isManual: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for pincode lookup and geo management
 *
 * @param onUpdate - Optional callback when geo data changes
 * @returns Geo state and methods
 */
export const usePincodeLookup = (
  onUpdate?: (geo: Partial<Geo>) => void
): UsePincodeLookupReturn => {
  const [geo, setGeo] = useState<Partial<Geo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isManual, setIsManual] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ geo });
      emitDebug('GEO_DRAFT_SAVED', geo);
    }, 400);

    return () => clearTimeout(timer);
  }, [geo]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(geo);
    }
  }, [geo, onUpdate]);

  /**
   * Lookup pincode from API (with cache)
   */
  const lookupPincode = useCallback(async (pincode: string) => {
    // Validate format first
    const validationError = validatePincode(pincode);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setError('');
    emitDebug('PINCODE_LOOKUP_START', { pincode });

    try {
      // Check cache first
      const cached = getCachedPincode(pincode);
      if (cached) {
        setGeo({
          pincode: cached.pincode,
          state: cached.state,
          city: cached.city,
        });
        setIsLoading(false);
        setIsManual(false);
        emitDebug('PINCODE_LOOKUP_CACHE_HIT', cached);
        return;
      }

      // Fetch from API
      const result = await getPincode(pincode);

      if (result) {
        setGeo({
          pincode: result.pincode,
          state: result.state,
          city: result.city,
        });
        setIsManual(false);

        // Cache the result
        cachePincode(result.pincode, result.state, result.city);

        emitDebug('PINCODE_LOOKUP_SUCCESS', result);
      } else {
        setError('Pincode not found. Please enter manually.');
        setGeo({ pincode });
        setIsManual(true);
        emitDebugError('PINCODE_LOOKUP_NOT_FOUND', { pincode });
      }
    } catch (err) {
      setError('Failed to lookup pincode. Please enter manually.');
      setGeo({ pincode });
      setIsManual(true);
      emitDebugError('PINCODE_LOOKUP_ERROR', {
        pincode,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Set pincode (triggers debounced lookup)
   */
  const setPincode = useCallback(
    (pincode: string) => {
      // Update geo immediately
      setGeo((prev) => ({ ...prev, pincode }));
      setError('');

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only lookup if exactly 6 digits
      if (/^\d{6}$/.test(pincode)) {
        // Debounce the lookup
        debounceTimerRef.current = setTimeout(() => {
          lookupPincode(pincode);
        }, 500);
      } else {
        // Clear state/city if pincode is invalid
        if (pincode.length > 6) {
          setError('Pincode must be exactly 6 digits');
        }
      }
    },
    [lookupPincode]
  );

  /**
   * Manually set state (for fallback)
   */
  const setState = useCallback((state: string) => {
    setGeo((prev) => ({ ...prev, state }));
    setIsManual(true);
    setError('');
    emitDebug('GEO_STATE_MANUAL', { state });
  }, []);

  /**
   * Manually set city (for fallback)
   */
  const setCity = useCallback((city: string) => {
    setGeo((prev) => ({ ...prev, city }));
    setIsManual(true);
    setError('');
    emitDebug('GEO_CITY_MANUAL', { city });
  }, []);

  /**
   * Validate geo data
   */
  const validateGeo = useCallback((): boolean => {
    if (!geo.pincode) {
      setError('Pincode is required');
      return false;
    }

    const pincodeError = validatePincode(geo.pincode);
    if (pincodeError) {
      setError(pincodeError);
      return false;
    }

    if (!geo.state || !geo.city) {
      setError('State and city are required');
      return false;
    }

    setError('');
    emitDebug('GEO_VALIDATION_PASSED', geo);
    return true;
  }, [geo]);

  /**
   * Reset to default state
   */
  const reset = useCallback(() => {
    setGeo({});
    setIsLoading(false);
    setError('');
    setIsManual(false);

    // Clear timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    emitDebug('GEO_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<Geo>) => {
    setGeo(draft);
    if (draft.state || draft.city) {
      setIsManual(true);
    }
    emitDebug('GEO_LOADED_FROM_DRAFT', draft);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    geo,
    isLoading,
    error,
    setPincode,
    setState,
    setCity,
    validateGeo,
    reset,
    loadFromDraft,
    isManual,
  };
};

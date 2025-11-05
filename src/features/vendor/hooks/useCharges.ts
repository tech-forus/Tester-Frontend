/**
 * useCharges hook
 * Manages charge fields with numeric coercion and validation
 */

import { useState, useCallback, useEffect } from 'react';
import { Charges, validateFuel } from '../utils/validators';
import { toNumberOrZero, isNumberInRange } from '../utils/numbers';
import { persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface ChargesErrors {
  docketCharges?: string;
  minWeightKg?: string;
  minCharges?: string;
  hamaliCharges?: string;
  handlingCharges?: string;
  rovCharges?: string;
  codCharges?: string;
  toPayCharges?: string;
  appointmentCharges?: string;
  greenTax?: string;
  miscCharges?: string;
  fuelSurchargePct?: string;
}

export interface UseChargesReturn {
  charges: Charges;
  errors: ChargesErrors;
  setCharge: (field: keyof Charges, value: string | number) => void;
  validateField: (field: keyof Charges) => boolean;
  validateAll: () => boolean;
  reset: () => void;
  loadFromDraft: (draft: Partial<Charges>) => void;
}

// =============================================================================
// FIELD RANGES
// =============================================================================

const CHARGE_RANGES: Record<keyof Charges, { min: number; max: number }> = {
  docketCharges: { min: 0, max: 999999 },
  minWeightKg: { min: 0, max: 999999 },
  minCharges: { min: 0, max: 999999 },
  hamaliCharges: { min: 0, max: 999999 },
  handlingCharges: { min: 0, max: 999999 },
  rovCharges: { min: 0, max: 999999 },
  codCharges: { min: 0, max: 999999 },
  toPayCharges: { min: 0, max: 999999 },
  appointmentCharges: { min: 0, max: 999999 },
  greenTax: { min: 0, max: 999999 },
  miscCharges: { min: 0, max: 999999 },
  fuelSurchargePct: { min: 0, max: 40 },
};

// =============================================================================
// DEFAULT STATE
// =============================================================================

const defaultCharges: Charges = {
  docketCharges: 0,
  minWeightKg: 0,
  minCharges: 0,
  hamaliCharges: 0,
  handlingCharges: 0,
  rovCharges: 0,
  codCharges: 0,
  toPayCharges: 0,
  appointmentCharges: 0,
  greenTax: 0,
  miscCharges: 0,
  fuelSurchargePct: 0,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing charges
 *
 * @param onUpdate - Optional callback when state changes
 * @returns Charges state and methods
 */
export const useCharges = (
  onUpdate?: (charges: Charges) => void
): UseChargesReturn => {
  const [charges, setCharges] = useState<Charges>(defaultCharges);
  const [errors, setErrors] = useState<ChargesErrors>({});

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ charges });
      emitDebug('CHARGES_DRAFT_SAVED', charges);
    }, 400);

    return () => clearTimeout(timer);
  }, [charges]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(charges);
    }
  }, [charges, onUpdate]);

  /**
   * Set a single charge field
   */
  const setCharge = useCallback(
    (field: keyof Charges, value: string | number) => {
      // Coerce to number
      const numValue = toNumberOrZero(value);

      setCharges((prev) => {
        const updated = { ...prev, [field]: numValue };
        emitDebug('CHARGE_FIELD_CHANGED', { field, value: numValue });
        return updated;
      });

      // Clear error for this field
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof ChargesErrors];
        return updated;
      });
    },
    []
  );

  /**
   * Validate a single charge field
   */
  const validateField = useCallback(
    (field: keyof Charges): boolean => {
      const value = charges[field];
      const range = CHARGE_RANGES[field];

      // Special validation for fuel surcharge
      if (field === 'fuelSurchargePct') {
        const fuelError = validateFuel(value);
        if (fuelError) {
          setErrors((prev) => ({
            ...prev,
            fuelSurchargePct: fuelError,
          }));
          emitDebug('CHARGE_VALIDATION_ERROR', { field, error: fuelError });
          return false;
        }
      }

      // Check if in range
      if (!isNumberInRange(value, range.min, range.max)) {
        const error = `Must be between ${range.min} and ${range.max}`;
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
        emitDebug('CHARGE_VALIDATION_ERROR', { field, error });
        return false;
      }

      // Clear error if valid
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof ChargesErrors];
        return updated;
      });

      return true;
    },
    [charges]
  );

  /**
   * Validate all charge fields
   */
  const validateAll = useCallback((): boolean => {
    const fields = Object.keys(CHARGE_RANGES) as (keyof Charges)[];
    let isValid = true;
    const newErrors: ChargesErrors = {};

    fields.forEach((field) => {
      const value = charges[field];
      const range = CHARGE_RANGES[field];

      // Special validation for fuel surcharge
      if (field === 'fuelSurchargePct') {
        const fuelError = validateFuel(value);
        if (fuelError) {
          newErrors.fuelSurchargePct = fuelError;
          isValid = false;
          return;
        }
      }

      // Check if in range
      if (!isNumberInRange(value, range.min, range.max)) {
        newErrors[field as keyof ChargesErrors] = `Must be between ${range.min} and ${range.max}`;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (!isValid) {
      emitDebug('CHARGES_VALIDATION_FAILED', newErrors);
    } else {
      emitDebug('CHARGES_VALIDATION_PASSED');
    }

    return isValid;
  }, [charges]);

  /**
   * Reset to default state
   */
  const reset = useCallback(() => {
    setCharges(defaultCharges);
    setErrors({});
    emitDebug('CHARGES_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<Charges>) => {
    setCharges((prev) => ({
      ...prev,
      ...draft,
    }));
    emitDebug('CHARGES_LOADED_FROM_DRAFT', draft);
  }, []);

  return {
    charges,
    errors,
    setCharge,
    validateField,
    validateAll,
    reset,
    loadFromDraft,
  };
};

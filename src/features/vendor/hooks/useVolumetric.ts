/**
 * useVolumetric hook
 * Manages volumetric configuration state (unit, divisor, CFT factor)
 */

import { useState, useCallback, useEffect } from 'react';
import { VolumetricConfig, VOLUMETRIC_DIVISOR_OPTIONS_CM, CFT_FACTOR_OPTIONS } from '../utils/validators';
import { convertInchToCm, convertCmToInch } from '../utils/numbers';
import { persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface UseVolumetricReturn {
  volumetric: VolumetricConfig;
  setUnit: (unit: 'cm' | 'inch') => void;
  setDivisor: (divisor: number) => void;
  setCftFactor: (cftFactor: number | undefined) => void;
  validateVolumetric: () => boolean;
  reset: () => void;
  loadFromDraft: (draft: Partial<VolumetricConfig>) => void;
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

const defaultVolumetric: VolumetricConfig = {
  unit: 'cm',
  divisor: 5000,
  cftFactor: undefined,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing volumetric configuration
 *
 * @param onUpdate - Optional callback when state changes
 * @returns Volumetric state and methods
 */
export const useVolumetric = (
  onUpdate?: (volumetric: VolumetricConfig) => void
): UseVolumetricReturn => {
  const [volumetric, setVolumetric] = useState<VolumetricConfig>(defaultVolumetric);

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ volumetric });
      emitDebug('VOLUMETRIC_DRAFT_SAVED', volumetric);
    }, 400);

    return () => clearTimeout(timer);
  }, [volumetric]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(volumetric);
    }
  }, [volumetric, onUpdate]);

  /**
   * Set unit (cm or inch)
   * When switching units, convert the divisor
   */
  const setUnit = useCallback((unit: 'cm' | 'inch') => {
    setVolumetric((prev) => {
      // Convert divisor when switching units
      let newDivisor = prev.divisor;

      if (unit === 'inch' && prev.unit === 'cm') {
        // Converting from cm to inch
        newDivisor = convertCmToInch(prev.divisor);
        emitDebug('VOLUMETRIC_UNIT_SWITCH_CM_TO_INCH', {
          oldDivisor: prev.divisor,
          newDivisor,
        });
      } else if (unit === 'cm' && prev.unit === 'inch') {
        // Converting from inch to cm
        newDivisor = convertInchToCm(prev.divisor);
        emitDebug('VOLUMETRIC_UNIT_SWITCH_INCH_TO_CM', {
          oldDivisor: prev.divisor,
          newDivisor,
        });
      }

      return {
        ...prev,
        unit,
        divisor: newDivisor,
      };
    });
  }, []);

  /**
   * Set divisor
   */
  const setDivisor = useCallback((divisor: number) => {
    setVolumetric((prev) => ({
      ...prev,
      divisor,
    }));
    emitDebug('VOLUMETRIC_DIVISOR_CHANGED', { divisor });
  }, []);

  /**
   * Set CFT factor (optional)
   */
  const setCftFactor = useCallback((cftFactor: number | undefined) => {
    setVolumetric((prev) => ({
      ...prev,
      cftFactor,
    }));
    emitDebug('VOLUMETRIC_CFT_FACTOR_CHANGED', { cftFactor });
  }, []);

  /**
   * Validate volumetric config
   */
  const validateVolumetric = useCallback((): boolean => {
    if (!volumetric.unit) {
      emitDebug('VOLUMETRIC_VALIDATION_FAILED', { reason: 'no unit' });
      return false;
    }

    if (!volumetric.divisor || volumetric.divisor <= 0) {
      emitDebug('VOLUMETRIC_VALIDATION_FAILED', { reason: 'invalid divisor' });
      return false;
    }

    // Validate divisor is from allowed options (if unit is cm)
    if (volumetric.unit === 'cm') {
      const isValidDivisor = VOLUMETRIC_DIVISOR_OPTIONS_CM.includes(
        volumetric.divisor as any
      );
      if (!isValidDivisor) {
        emitDebug('VOLUMETRIC_VALIDATION_FAILED', {
          reason: 'divisor not in allowed options',
          divisor: volumetric.divisor,
        });
        return false;
      }
    }

    // Validate CFT factor if present
    if (volumetric.cftFactor !== undefined) {
      const isValidCft = CFT_FACTOR_OPTIONS.includes(volumetric.cftFactor as any);
      if (!isValidCft) {
        emitDebug('VOLUMETRIC_VALIDATION_FAILED', {
          reason: 'CFT factor not in allowed options',
          cftFactor: volumetric.cftFactor,
        });
        return false;
      }
    }

    emitDebug('VOLUMETRIC_VALIDATION_PASSED', volumetric);
    return true;
  }, [volumetric]);

  /**
   * Reset to default state
   */
  const reset = useCallback(() => {
    setVolumetric(defaultVolumetric);
    emitDebug('VOLUMETRIC_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<VolumetricConfig>) => {
    setVolumetric((prev) => ({
      ...prev,
      ...draft,
    }));
    emitDebug('VOLUMETRIC_LOADED_FROM_DRAFT', draft);
  }, []);

  return {
    volumetric,
    setUnit,
    setDivisor,
    setCftFactor,
    validateVolumetric,
    reset,
    loadFromDraft,
  };
};

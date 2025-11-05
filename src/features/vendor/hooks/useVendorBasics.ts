/**
 * useVendorBasics hook
 * Manages vendor basic information state and validation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  validateCompanyName,
  validateContactName,
  validatePhone,
  validateEmail,
  validateGST,
} from '../utils/validators';
import { VendorBasics, persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface VendorBasicsErrors {
  companyName?: string;
  contactPersonName?: string;
  vendorPhoneNumber?: string;
  vendorEmailAddress?: string;
  gstin?: string;
}

export interface UseVendorBasicsReturn {
  basics: VendorBasics;
  errors: VendorBasicsErrors;
  setField: (field: keyof VendorBasics, value: string) => void;
  validateField: (field: keyof VendorBasics) => boolean;
  validateAll: () => boolean;
  reset: () => void;
  loadFromDraft: (draft: Partial<VendorBasics>) => void;
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

const defaultBasics: VendorBasics = {
  companyName: '',
  contactPersonName: '',
  vendorPhoneNumber: '',
  vendorEmailAddress: '',
  gstin: '',
  transportMode: 'road',
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing vendor basics
 *
 * @param onUpdate - Optional callback when state changes
 * @returns Vendor basics state and methods
 */
export const useVendorBasics = (
  onUpdate?: (basics: VendorBasics) => void
): UseVendorBasicsReturn => {
  const [basics, setBasics] = useState<VendorBasics>(defaultBasics);
  const [errors, setErrors] = useState<VendorBasicsErrors>({});

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ basics });
      emitDebug('BASICS_DRAFT_SAVED', basics);
    }, 400);

    return () => clearTimeout(timer);
  }, [basics]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(basics);
    }
  }, [basics, onUpdate]);

  /**
   * Set a single field value
   */
  const setField = useCallback(
    (field: keyof VendorBasics, value: string) => {
      setBasics((prev) => {
        const updated = { ...prev, [field]: value };
        emitDebug('BASICS_FIELD_CHANGED', { field, value });
        return updated;
      });

      // Clear error for this field
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof VendorBasicsErrors];
        return updated;
      });
    },
    []
  );

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (field: keyof VendorBasics): boolean => {
      let error = '';

      switch (field) {
        case 'companyName':
          error = validateCompanyName(basics.companyName);
          break;
        case 'contactPersonName':
          error = validateContactName(basics.contactPersonName);
          break;
        case 'vendorPhoneNumber':
          error = validatePhone(basics.vendorPhoneNumber);
          break;
        case 'vendorEmailAddress':
          error = validateEmail(basics.vendorEmailAddress);
          break;
        case 'gstin':
          error = validateGST(basics.gstin || '');
          break;
      }

      if (error) {
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
        emitDebug('BASICS_VALIDATION_ERROR', { field, error });
        return false;
      }

      // Clear error if valid
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof VendorBasicsErrors];
        return updated;
      });

      return true;
    },
    [basics]
  );

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    const fields: (keyof VendorBasics)[] = [
      'companyName',
      'contactPersonName',
      'vendorPhoneNumber',
      'vendorEmailAddress',
    ];

    // Also validate GSTIN if present
    if (basics.gstin) {
      fields.push('gstin');
    }

    let isValid = true;
    const newErrors: VendorBasicsErrors = {};

    fields.forEach((field) => {
      let error = '';

      switch (field) {
        case 'companyName':
          error = validateCompanyName(basics.companyName);
          break;
        case 'contactPersonName':
          error = validateContactName(basics.contactPersonName);
          break;
        case 'vendorPhoneNumber':
          error = validatePhone(basics.vendorPhoneNumber);
          break;
        case 'vendorEmailAddress':
          error = validateEmail(basics.vendorEmailAddress);
          break;
        case 'gstin':
          error = validateGST(basics.gstin || '');
          break;
      }

      if (error) {
        newErrors[field as keyof VendorBasicsErrors] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (!isValid) {
      emitDebug('BASICS_VALIDATION_FAILED', newErrors);
    } else {
      emitDebug('BASICS_VALIDATION_PASSED');
    }

    return isValid;
  }, [basics]);

  /**
   * Reset to default state
   */
  const reset = useCallback(() => {
    setBasics(defaultBasics);
    setErrors({});
    emitDebug('BASICS_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<VendorBasics>) => {
    setBasics((prev) => ({
      ...prev,
      ...draft,
    }));
    emitDebug('BASICS_LOADED_FROM_DRAFT', draft);
  }, []);

  return {
    basics,
    errors,
    setField,
    validateField,
    validateAll,
    reset,
    loadFromDraft,
  };
};

/**
 * AddVendor v2 - Main Page Orchestrator
 * Clean, modular implementation for vendor onboarding
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Hooks
import { useVendorBasics } from '../hooks/useVendorBasics';
import { usePincodeLookup } from '../hooks/usePincodeLookup';
import { useVolumetric } from '../hooks/useVolumetric';
import { useCharges } from '../hooks/useCharges';
import { useZoneRates } from '../hooks/useZoneRates';

// Components
import { CompanySection } from '../components/CompanySection';
import { TransportSection } from '../components/TransportSection';
import { ChargesSection } from '../components/ChargesSection';
import { ZoneRatesEditor } from '../components/ZoneRatesEditor';
import { PriceChartUpload } from '../components/PriceChartUpload';
import { SavedVendorsTable } from '../components/SavedVendorsTable';

// Services & Utils
import { postVendor } from '../services/api';
import { TemporaryTransporter } from '../utils/validators';
import { readDraft, clearDraft } from '../store/draftStore';
import { emitDebug, emitDebugError } from '../utils/debug';

// Icons
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AddVendor: React.FC = () => {
  // Hooks
  const vendorBasics = useVendorBasics();
  const pincodeLookup = usePincodeLookup();
  const volumetric = useVolumetric();
  const charges = useCharges();
  const zoneRates = useZoneRates();

  // Local state
  const [transportMode, setTransportMode] = useState<'road' | 'air' | 'rail' | 'ship'>('road');
  const [priceChartFile, setPriceChartFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const navigate = useNavigate();

  /**
   * Load draft on mount
   */
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      emitDebug('DRAFT_LOADED_ON_MOUNT', draft);

      if (draft.basics) {
        vendorBasics.loadFromDraft(draft.basics);
        if (draft.basics.transportMode) {
          setTransportMode(draft.basics.transportMode);
        }
      }

      if (draft.geo) {
        pincodeLookup.loadFromDraft(draft.geo);
      }

      if (draft.volumetric) {
        volumetric.loadFromDraft(draft.volumetric);
      }

      if (draft.charges) {
        charges.loadFromDraft(draft.charges);
      }

      if (draft.zoneRates) {
        zoneRates.loadFromDraft(draft.zoneRates);
      }

      toast.success('Draft restored', { duration: 2000 });
    }
  }, []);

  /**
   * Validate all sections
   */
  const validateAll = (): boolean => {
    emitDebug('VALIDATION_START');

    let isValid = true;
    const errors: string[] = [];

    // Validate basics
    if (!vendorBasics.validateAll()) {
      errors.push('Company information is incomplete or invalid');
      isValid = false;
    }

    // Validate geo
    if (!pincodeLookup.validateGeo()) {
      errors.push('Location information is incomplete');
      isValid = false;
    }

    // Validate volumetric
    if (!volumetric.validateVolumetric()) {
      errors.push('Volumetric configuration is invalid');
      isValid = false;
    }

    // Validate charges
    if (!charges.validateAll()) {
      errors.push('Charges configuration is invalid');
      isValid = false;
    }

    // Validate zone rates
    if (!zoneRates.validateZoneRates()) {
      errors.push('Zone rate matrix is incomplete or invalid');
      isValid = false;
    }

    if (!isValid) {
      emitDebugError('VALIDATION_FAILED', { errors });
      errors.forEach((err) => toast.error(err, { duration: 4000 }));
    } else {
      emitDebug('VALIDATION_PASSED');
    }

    return isValid;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all
    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Normalize zone rates before submission
      const normalizedZoneRates = zoneRates.normalizeAndValidate();
      if (!normalizedZoneRates) {
        toast.error('Failed to normalize zone rates');
        setIsSubmitting(false);
        return;
      }

      // Build vendor object
      const vendor: Omit<TemporaryTransporter, 'priceChartFileId'> = {
        companyName: vendorBasics.basics.companyName,
        contactPersonName: vendorBasics.basics.contactPersonName,
        vendorPhoneNumber: vendorBasics.basics.vendorPhoneNumber,
        vendorEmailAddress: vendorBasics.basics.vendorEmailAddress,
        gstin: vendorBasics.basics.gstin || undefined,
        transportMode,
        volumetric: volumetric.volumetric,
        charges: charges.charges,
        geo: {
          pincode: pincodeLookup.geo.pincode!,
          state: pincodeLookup.geo.state!,
          city: pincodeLookup.geo.city!,
        },
        zoneRates: zoneRates.zoneRates,
        sources: {
          createdFrom: 'AddVendor v2',
        },
        status: 'submitted',
      };

      emitDebug('SUBMIT_PAYLOAD', {
        companyName: vendor.companyName,
        transportMode: vendor.transportMode,
        hasPriceChart: !!priceChartFile,
        zoneRateCount: Object.keys(vendor.zoneRates).length,
      });

      // Submit to API
      const response = await postVendor(vendor, priceChartFile || undefined);

      if (response.success) {
        emitDebug('SUBMIT_SUCCESS', {
          vendorId: response.data._id,
          companyName: response.data.companyName,
        });

        toast.success('Vendor created successfully!', { duration: 4000 });

        // Clear draft
        clearDraft();

        // Reset form
        vendorBasics.reset();
        pincodeLookup.reset();
        volumetric.reset();
        charges.reset();
        zoneRates.reset();
        setPriceChartFile(null);

        // Trigger table refresh
        setRefreshTrigger((prev) => prev + 1);
      } else {
        emitDebugError('SUBMIT_ERROR', {
          message: response.message,
          fieldErrors: response.fieldErrors,
        });

        toast.error(response.message || 'Failed to create vendor', {
          duration: 5000,
        });

        // Show field errors if present
        if (response.fieldErrors) {
          Object.entries(response.fieldErrors).forEach(([field, error]) => {
            toast.error(`${field}: ${error}`, { duration: 4000 });
          });
        }
      }
    } catch (error) {
      emitDebugError('SUBMIT_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
      });

      toast.error('An unexpected error occurred. Please try again.', {
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle reset
   */
  const handleReset = () => {
    if (!confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      return;
    }

    vendorBasics.reset();
    pincodeLookup.reset();
    volumetric.reset();
    charges.reset();
    zoneRates.reset();
    setPriceChartFile(null);
    clearDraft();

    toast.success('Form reset', { duration: 2000 });
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Add Vendor (v2)</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create a new temporary transporter with comprehensive pricing configuration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Section */}
          <CompanySection
            vendorBasics={vendorBasics}
            pincodeLookup={pincodeLookup}
          />

          {/* Transport Section */}
          <TransportSection
            volumetric={volumetric}
            transportMode={transportMode}
            onTransportModeChange={setTransportMode}
          />

          {/* Charges Section */}
          <ChargesSection charges={charges} />

          {/* Zone Rates Editor */}
          <ZoneRatesEditor zoneRates={zoneRates} />

          {/* Price Chart Upload */}
          <PriceChartUpload
            file={priceChartFile}
            onFileChange={setPriceChartFile}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-4 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg
                         hover:bg-slate-300 transition-colors flex items-center gap-2"
            >
              <XCircleIcon className="w-5 h-5" />
              Reset Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
                         hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                         transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save Vendor
                </>
              )}
            </button>
          </div>
        </form>

        {/* Saved Vendors Table */}
        <div className="mt-8">
          <SavedVendorsTable refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
};

export default AddVendor;

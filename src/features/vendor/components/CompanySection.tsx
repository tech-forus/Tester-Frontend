/**
 * CompanySection component
 * Handles company and contact information with pincode autofill
 */

import React from 'react';
import { UseVendorBasicsReturn } from '../hooks/useVendorBasics';
import { UsePincodeLookupReturn } from '../hooks/usePincodeLookup';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// =============================================================================
// PROPS
// =============================================================================

interface CompanySectionProps {
  vendorBasics: UseVendorBasicsReturn;
  pincodeLookup: UsePincodeLookupReturn;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CompanySection: React.FC<CompanySectionProps> = ({
  vendorBasics,
  pincodeLookup,
}) => {
  const { basics, errors, setField, validateField } = vendorBasics;
  const {
    geo,
    isLoading,
    error: geoError,
    setPincode,
    setState,
    setCity,
    isManual,
  } = pincodeLookup;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <InformationCircleIcon className="w-5 h-5 text-blue-500" />
        Company & Contact Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Name */}
        <div>
          <label
            htmlFor="companyName"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={basics.companyName}
            onChange={(e) => setField('companyName', e.target.value)}
            onBlur={() => validateField('companyName')}
            maxLength={120}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.companyName
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter company name"
            required
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
          )}
        </div>

        {/* Contact Person Name */}
        <div>
          <label
            htmlFor="contactPersonName"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Contact Person <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="contactPersonName"
            name="contactPersonName"
            value={basics.contactPersonName}
            onChange={(e) => setField('contactPersonName', e.target.value)}
            onBlur={() => validateField('contactPersonName')}
            maxLength={80}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.contactPersonName
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter contact person name"
            required
          />
          {errors.contactPersonName && (
            <p className="mt-1 text-xs text-red-600">
              {errors.contactPersonName}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="vendorPhoneNumber"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="vendorPhoneNumber"
            name="vendorPhoneNumber"
            value={basics.vendorPhoneNumber}
            onChange={(e) => {
              // Only allow digits
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setField('vendorPhoneNumber', value);
            }}
            onBlur={() => validateField('vendorPhoneNumber')}
            maxLength={10}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.vendorPhoneNumber
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="10-digit phone number"
            required
          />
          {errors.vendorPhoneNumber && (
            <p className="mt-1 text-xs text-red-600">
              {errors.vendorPhoneNumber}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="vendorEmailAddress"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="vendorEmailAddress"
            name="vendorEmailAddress"
            value={basics.vendorEmailAddress}
            onChange={(e) => setField('vendorEmailAddress', e.target.value)}
            onBlur={() => validateField('vendorEmailAddress')}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.vendorEmailAddress
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="email@example.com"
            required
          />
          {errors.vendorEmailAddress && (
            <p className="mt-1 text-xs text-red-600">
              {errors.vendorEmailAddress}
            </p>
          )}
        </div>

        {/* GST Number (Optional) */}
        <div>
          <label
            htmlFor="gstin"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            GST Number (Optional)
          </label>
          <input
            type="text"
            id="gstin"
            name="gstin"
            value={basics.gstin || ''}
            onChange={(e) => {
              // Convert to uppercase
              const value = e.target.value.toUpperCase().slice(0, 15);
              setField('gstin', value);
            }}
            onBlur={() => {
              if (basics.gstin) {
                validateField('gstin');
              }
            }}
            maxLength={15}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.gstin
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="15-character GST number"
          />
          {errors.gstin && (
            <p className="mt-1 text-xs text-red-600">{errors.gstin}</p>
          )}
        </div>

        {/* Pincode */}
        <div>
          <label
            htmlFor="pincode"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Pincode <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="pincode"
              name="pincode"
              value={geo.pincode || ''}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPincode(value);
              }}
              maxLength={6}
              className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                         focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                         ${
                           geoError
                             ? 'border-red-500 focus:ring-red-500'
                             : 'border-slate-300 focus:ring-blue-500'
                         }`}
              placeholder="6-digit pincode"
              required
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {geoError && (
            <p className="mt-1 text-xs text-orange-600">{geoError}</p>
          )}
        </div>

        {/* State (auto-filled or manual) */}
        <div>
          <label
            htmlFor="state"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            State <span className="text-red-500">*</span>
            {isManual && (
              <span className="text-xs text-orange-500 ml-2">(Manual)</span>
            )}
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={geo.state || ''}
            onChange={(e) => setState(e.target.value)}
            readOnly={!isManual && !geoError}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition
                       ${
                         !isManual && !geoError
                           ? 'bg-slate-100 cursor-not-allowed'
                           : 'bg-slate-50/70'
                       }
                       border-slate-300 focus:ring-blue-500`}
            placeholder="State (auto-filled)"
            required
          />
        </div>

        {/* City (auto-filled or manual) */}
        <div>
          <label
            htmlFor="city"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            City <span className="text-red-500">*</span>
            {isManual && (
              <span className="text-xs text-orange-500 ml-2">(Manual)</span>
            )}
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={geo.city || ''}
            onChange={(e) => setCity(e.target.value)}
            readOnly={!isManual && !geoError}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition
                       ${
                         !isManual && !geoError
                           ? 'bg-slate-100 cursor-not-allowed'
                           : 'bg-slate-50/70'
                       }
                       border-slate-300 focus:ring-blue-500`}
            placeholder="City (auto-filled)"
            required
          />
        </div>
      </div>
    </div>
  );
};

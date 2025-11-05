/**
 * ChargesSection component
 * Handles all charge fields with numeric validation
 */

import React from 'react';
import { UseChargesReturn } from '../hooks/useCharges';
import { CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { FUEL_SURCHARGE_OPTIONS } from '../utils/validators';

// =============================================================================
// PROPS
// =============================================================================

interface ChargesSectionProps {
  charges: UseChargesReturn;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ChargeFieldProps {
  label: string;
  name: keyof UseChargesReturn['charges'];
  value: number;
  onChange: (value: number) => void;
  error?: string;
  tooltip?: string;
  max?: number;
  suffix?: string;
  isDropdown?: boolean;
  dropdownOptions?: number[];
}

const ChargeField: React.FC<ChargeFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  tooltip,
  max = 999999,
  suffix = '₹',
  isDropdown = false,
  dropdownOptions,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(0);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1"
      >
        {label}
        {tooltip && (
          <div className="group relative">
            <InformationCircleIcon className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-normal">
              {tooltip}
            </div>
          </div>
        )}
      </label>

      <div className="relative mt-1">
        {isDropdown && dropdownOptions ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            className={`block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         error
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
          >
            {dropdownOptions.map((option) => (
              <option key={option} value={option}>
                {option}{suffix}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              type="number"
              id={name}
              name={name}
              value={value}
              onChange={handleChange}
              min={0}
              max={max}
              step="0.01"
              className={`block w-full border rounded-lg shadow-sm pl-3 pr-8 py-2 text-sm text-slate-800 placeholder-slate-400
                         focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                         ${
                           error
                             ? 'border-red-500 focus:ring-red-500'
                             : 'border-slate-300 focus:ring-blue-500'
                         }`}
              placeholder="0.00"
            />
            {suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                {suffix}
              </span>
            )}
          </>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChargesSection: React.FC<ChargesSectionProps> = ({ charges }) => {
  const { charges: chargeValues, errors, setCharge } = charges;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
        Charges Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Docket Charges */}
        <ChargeField
          label="Docket Charges"
          name="docketCharges"
          value={chargeValues.docketCharges}
          onChange={(val) => setCharge('docketCharges', val)}
          error={errors.docketCharges}
          tooltip="Per-shipment docket processing charge"
          suffix="₹"
        />

        {/* Min Weight */}
        <ChargeField
          label="Min Chargeable Weight"
          name="minWeightKg"
          value={chargeValues.minWeightKg}
          onChange={(val) => setCharge('minWeightKg', val)}
          error={errors.minWeightKg}
          tooltip="Minimum weight (in KG) for charge calculation"
          suffix="KG"
        />

        {/* Min Charges */}
        <ChargeField
          label="Minimum Charges"
          name="minCharges"
          value={chargeValues.minCharges}
          onChange={(val) => setCharge('minCharges', val)}
          error={errors.minCharges}
          tooltip="Minimum charge amount per shipment"
          suffix="₹"
        />

        {/* Hamali Charges */}
        <ChargeField
          label="Hamali Charges"
          name="hamaliCharges"
          value={chargeValues.hamaliCharges}
          onChange={(val) => setCharge('hamaliCharges', val)}
          error={errors.hamaliCharges}
          tooltip="Loading/unloading labor charges"
          suffix="₹"
        />

        {/* Handling Charges */}
        <ChargeField
          label="Handling Charges"
          name="handlingCharges"
          value={chargeValues.handlingCharges}
          onChange={(val) => setCharge('handlingCharges', val)}
          error={errors.handlingCharges}
          tooltip="Material handling and processing charges"
          suffix="₹"
        />

        {/* ROV Charges */}
        <ChargeField
          label="ROV Charges"
          name="rovCharges"
          value={chargeValues.rovCharges}
          onChange={(val) => setCharge('rovCharges', val)}
          error={errors.rovCharges}
          tooltip="Risk of Value charges for high-value shipments"
          suffix="₹"
        />

        {/* COD Charges */}
        <ChargeField
          label="COD Charges"
          name="codCharges"
          value={chargeValues.codCharges}
          onChange={(val) => setCharge('codCharges', val)}
          error={errors.codCharges}
          tooltip="Cash on Delivery service charges"
          suffix="₹"
        />

        {/* To-Pay Charges */}
        <ChargeField
          label="To-Pay Charges"
          name="toPayCharges"
          value={chargeValues.toPayCharges}
          onChange={(val) => setCharge('toPayCharges', val)}
          error={errors.toPayCharges}
          tooltip="Charges for to-pay shipments"
          suffix="₹"
        />

        {/* Appointment Charges */}
        <ChargeField
          label="Appointment Charges"
          name="appointmentCharges"
          value={chargeValues.appointmentCharges}
          onChange={(val) => setCharge('appointmentCharges', val)}
          error={errors.appointmentCharges}
          tooltip="Scheduled delivery appointment charges"
          suffix="₹"
        />

        {/* Green Tax */}
        <ChargeField
          label="Green Tax / NGT"
          name="greenTax"
          value={chargeValues.greenTax}
          onChange={(val) => setCharge('greenTax', val)}
          error={errors.greenTax}
          tooltip="Environmental / National Green Tribunal tax"
          suffix="₹"
        />

        {/* Misc Charges */}
        <ChargeField
          label="Misc / AOC Charges"
          name="miscCharges"
          value={chargeValues.miscCharges}
          onChange={(val) => setCharge('miscCharges', val)}
          error={errors.miscCharges}
          tooltip="Miscellaneous or All Other Charges"
          suffix="₹"
        />

        {/* Fuel Surcharge */}
        <ChargeField
          label="Fuel Surcharge"
          name="fuelSurchargePct"
          value={chargeValues.fuelSurchargePct}
          onChange={(val) => setCharge('fuelSurchargePct', val)}
          error={errors.fuelSurchargePct}
          tooltip="Fuel surcharge percentage (0-40%)"
          suffix="%"
          max={40}
          isDropdown
          dropdownOptions={FUEL_SURCHARGE_OPTIONS}
        />
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Charges Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-600">Total Base Charges:</span>
            <span className="block font-semibold text-slate-800">
              ₹
              {(
                chargeValues.docketCharges +
                chargeValues.minCharges +
                chargeValues.hamaliCharges +
                chargeValues.handlingCharges +
                chargeValues.greenTax +
                chargeValues.miscCharges
              ).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Special Charges:</span>
            <span className="block font-semibold text-slate-800">
              ₹
              {(
                chargeValues.rovCharges +
                chargeValues.codCharges +
                chargeValues.toPayCharges +
                chargeValues.appointmentCharges
              ).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Fuel Surcharge:</span>
            <span className="block font-semibold text-slate-800">
              {chargeValues.fuelSurchargePct}%
            </span>
          </div>
          <div>
            <span className="text-slate-600">Min Weight:</span>
            <span className="block font-semibold text-slate-800">
              {chargeValues.minWeightKg} KG
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { InformationCircleIcon, ChevronDownIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
// Replaced missing indianStatesDistricts module with data from public/pincodes.json
import { useAuth } from '../hooks/useAuth';

// Local types
type PincodeEntry = { pincode: string; state: string; city: string; zone?: string };

// Transport Mode Options
const TRANSPORT_MODES = [
  { value: "road", label: "Road" },
  { value: "air", label: "Air - Coming Soon", disabled: true },
  { value: "rail", label: "Rail - Coming Soon", disabled: true },
  { value: "ship", label: "Ship - Coming Soon", disabled: true }
];

// HELPER COMPONENT: StyledInputField with Error Support
const StyledInputField = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  type = "text",
  maxLength,
  min,
  max,
  error,
  required = true,
  readOnly = false
}: {
  name: string;
  label: string;
  value?: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  type?: "text" | "number" | "email";
  maxLength?: number;
  min?: number;
  max?: number;
  error?: string;
  required?: boolean;
  readOnly?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      min={min}
      max={max}
      maxLength={maxLength}
      readOnly={readOnly}
      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                 focus:outline-none focus:ring-1 focus:border-blue-500 transition
                 ${readOnly ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/70'}
                 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
      required={required}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

// HELPER COMPONENT: Dropdown Field
const DropdownField = ({
  name,
  label,
  value,
  onChange,
  options,
  error,
  required = true
}: { 
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  error?: string;
  required?: boolean;
}) => (
  <div>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`mt-1 block w-full bg-slate-50/70 border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800
                 focus:outline-none focus:ring-1 focus:border-blue-500 transition
                 ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
      required={required}
    >
      <option value="">Select {label}</option>


      
      {options.map(option => (
        <option 
          key={option.value} 
          value={option.value}
          disabled={option.disabled}
          className={option.disabled ? 'text-slate-400 bg-slate-100' : ''}
        >
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);



// HELPER COMPONENT: RatingSlider
const RatingSlider = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const displayValue = Number(value).toFixed(1);

  return (
    <div className="sm:col-span-2 lg:col-span-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-4">
        <input
          type="range"
          name="rating" // Crucial for the handleChange function
          min="1"
          max="5"
          step="0.01" // Allows for half-star ratings
          value={value}
          onChange={onChange}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500"
        />
        <div className="flex-shrink-0 w-16 text-right">
          <span className="text-xl font-bold text-blue-600">{displayValue}</span>
          <span className="text-sm text-slate-500"> / 5</span>
        </div>
      </div>
    </div>
  );
};

// Volumetric Divisor Options

// Fuel Surcharge Options
const FUEL_SURCHARGE_OPTIONS = [
  { value: "0", label: "0" },
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "20", label: "20" },
  { value: "25", label: "25" },
  { value: "30", label: "30" },
  { value: "35", label: "35" },
  { value: "40", label: "40" }
];

// Percentage Options (0-5% with decimal values)
const PERCENTAGE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "0.1", label: "0.10%" },
  { value: "0.2", label: "0.20%" },
  { value: "0.3", label: "0.30%" },
  { value: "0.4", label: "0.40%" },
  { value: "0.5", label: "0.50%" },
  { value: "0.6", label: "0.60%" },
  { value: "0.7", label: "0.70%" },
  { value: "0.8", label: "0.80%" },
  { value: "0.9", label: "0.90%" },
  { value: "1.0", label: "1.00%" },
  { value: "1.25", label: "1.25%" },
  { value: "1.50", label: "1.50%" },
  { value: "1.75", label: "1.75%" },
  { value: "2.0", label: "2.00%" },
  { value: "2.25", label: "2.25%" },
  { value: "2.50", label: "2.50%" },
  { value: "3.0", label: "3.00%" },
  { value: "4.0", label: "4.00%" },
  { value: "5.0", label: "5.00%" }
];

// CFT Factor Options (for inches)
const CFT_FACTOR_OPTIONS = [
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10" }
];

// Handling Charge Unit Options
const HANDLING_CHARGE_UNIT_OPTIONS = [
  { value: "per kg", label: "per kg" },
  { value: "per box", label: "per box" },
  { value: "per piece", label: "per piece" }
];

// Volumetric Divisor Options (for centimeters)
const VOLUMETRIC_DIVISOR_OPTIONS_CM = [
  { value: "2800", label: "2800" },
  { value: "3000", label: "3000" },
  { value: "3200", label: "3200" },
  { value: "3500", label: "3500" },
  { value: "3800", label: "3800" },
  { value: "4000", label: "4000" },
  { value: "4200", label: "4200" },
  { value: "4500", label: "4500" },
  { value: "4720", label: "4720" },
  { value: "4750", label: "4750" },
  { value: "5000", label: "5000" },
  { value: "5200", label: "5200" },
  { value: "5500", label: "5500" },
  { value: "5800", label: "5800" },
  { value: "6000", label: "6000" },
  { value: "7000", label: "7000" }
];




// HELPER COMPONENT: PercentageField with Dropdown
const PercentageField = ({
  name,
  label,
  value,
  onChange,
  onSelectChange,
  onKeyDown,
  showDropdown,
  onToggleDropdown,
  error
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  error?: string;
}) => (
  <div className="relative" data-dropdown-container>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="5"
        className={`block w-full bg-slate-50/70 border rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition
                   ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}`}
        required
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleDropdown}
          className="text-slate-800 hover:text-blue-600 transition-colors font-bold"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>
      
      {/* Dropdown Options */}
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {PERCENTAGE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelectChange({ target: { value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
                onToggleDropdown();
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-100 focus:bg-blue-100 focus:outline-none"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

// HELPER COMPONENT: DaccChargesField with Info Tooltip
const DaccChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">DACC Charges</h4>
          <p className="mb-3">
            DACC is a value-added delivery service in which the consignee (receiver of the goods) must present their consignee copy of the Delivery Way Bill (DWB) before the shipment is handed over.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: FuelSurchargeField with Dropdown and Info Tooltip
const FuelSurchargeField = ({
  name,
  label,
  value,
  onChange,
  onSelectChange,
  onKeyDown,
  showDropdown,
  onToggleDropdown,
  showTooltip,
  onToggleTooltip,
  error
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
  error?: string;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        min="1"
        max="40"
        className={`block w-full bg-slate-50/70 border rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition
                   ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}`}
        required
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleDropdown}
          className="text-slate-800 hover:text-blue-600 transition-colors font-bold"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>
      
      {/* Dropdown Options */}
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {FUEL_SURCHARGE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelectChange({ target: { value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
                onToggleDropdown();
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-100 focus:bg-blue-100 focus:outline-none"
            >
              {option.label}%
            </button>
          ))}
        </div>
      )}
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Fuel Surcharge</h4>
          <p className="mb-3">
            It's an extra % added to cover fuel cost changes — when fuel prices go up, this charge helps the transporter cover that extra fuel expense.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
    
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

// HELPER COMPONENT: SavedVendorsTable
const SavedVendorsTable = ({ 
  vendors, 
  onEdit, 
  onDelete 
}: { 
  vendors: any[];
  onEdit: (vendor: any) => void;
  onDelete: (vendorId: number) => void;
}) => {
  if (vendors.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm transition-all">
      <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-4 mb-6">
        Saved Vendors ({vendors.length})
      </h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {vendors.map((vendor, index) => (
            <div key={vendor.id} className="mb-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-slate-700">
                  Vendor #{index + 1} - {vendor.companyName}
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                    Added: {vendor.addedAt}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(vendor)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                      title="Edit vendor"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(vendor.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors duration-200"
                      title="Delete vendor"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Company Details */}
                <div className="space-y-2">
                  <h5 className="font-medium text-slate-600 text-sm">Company Details</h5>
                  <div className="text-xs space-y-1">
                    <p><span className="font-medium">Name:</span> {vendor.companyName}</p>
                    <p><span className="font-medium">Code:</span> {vendor.vendorCode}</p>
                    <p><span className="font-medium">Sub Vendor:</span> {vendor.subVendor || 'N/A'}</p>
                    <p><span className="font-medium">Rating:</span> {vendor.rating}/5</p>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-2">
                  <h5 className="font-medium text-slate-600 text-sm">Contact Details</h5>
                  <div className="text-xs space-y-1">
                    <p><span className="font-medium">Phone:</span> {vendor.vendorPhone}</p>
                    <p><span className="font-medium">Email:</span> {vendor.vendorEmail}</p>
                    <p><span className="font-medium">GST:</span> {vendor.gstNo}</p>
                  </div>
                </div>

                {/* Location Details */}
                <div className="space-y-2">
                  <h5 className="font-medium text-slate-600 text-sm">Location Details</h5>
                  <div className="text-xs space-y-1">
                    <p><span className="font-medium">Address:</span> {vendor.address}</p>
                    <p><span className="font-medium">City:</span> {vendor.city}</p>
                    <p><span className="font-medium">State:</span> {vendor.state}</p>
                    <p><span className="font-medium">Pincode:</span> {vendor.pincode}</p>
                  </div>
                </div>

                {/* Transport & Pricing */}
                <div className="space-y-2">
                  <h5 className="font-medium text-slate-600 text-sm">Transport & Pricing</h5>
                  <div className="text-xs space-y-1">
                    <p><span className="font-medium">Mode:</span> {vendor.mode}</p>
                    <p><span className="font-medium">Min Weight:</span> {vendor.priceRate?.minWeight || 'N/A'} kg</p>
                    <p><span className="font-medium">Fuel Surcharge:</span> {vendor.priceRate?.fuel || 'N/A'}%</p>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// HELPER COMPONENT: MinWeightField with Info Tooltip
const MinWeightField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="numeric"
        min="0"
        max="10000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <div className="mb-6">
            <p className="font-semibold text-slate-800 mb-1">Also Known As:</p>
            <p className="text-slate-600"><strong>Min Freight Weight / Min Billable Weight / Min Consignment Weight</strong></p>
          </div>
          <h4 className="font-semibold text-slate-800 mb-2">Min Chargeable Weight</h4>
          <p className="mb-3">
            It's the lowest weight for which you'll be charged, even if your shipment weighs less.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: DocketChargesField with Info Tooltip
const DocketChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="numeric"
        min="0"
        max="500"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Docket Charges</h4>
          <p className="mb-3">
            A small fixed fee for booking your shipment — it covers the paperwork and system entry. Charged once per shipment, not based on weight or distance.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: MinChargesField with Info Tooltip
const MinChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        min="1"
        max="1000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <div className="mb-6">
            <p className="font-semibold text-slate-800 mb-1">Also Known As:</p>
            <p className="text-slate-600"><strong>Minimum Billing / Minimum Billable Amount / Minimum Freight Charge / Minimum Payable Amount</strong></p>
          </div>
          <h4 className="font-semibold text-slate-800 mb-2">Minimum Charges</h4>
          <p className="mb-3">
            The lowest freight you'll be charged, even if the calculated amount is less.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: GreenTaxField with Info Tooltip
const GreenTaxField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="5000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Green Tax</h4>
          <p className="mb-3">
            A fixed fee added for environmental or city pollution costs. Some cities or carriers charge this Green Tax to support cleaner transport and reduce vehicle emissions. Usually applied per shipment as a flat amount.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: MiscChargesField with Info Tooltip
const MiscChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
      <button
        type="button"
        onClick={onToggleTooltip}
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        min="0"
        max="10000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Miscellaneous Charges</h4>
          <p className="mb-3">
            A extra amount added for special services or situations not covered by other charge types — like extra paperwork, special handling, or local taxes.
          </p>
          <p className="mb-3">
            It's basically a "catch-all" fee for any extra cost during transport.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);


// HELPER COMPONENT: HamaliChargesField with Info Tooltip
const HamaliChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <div className="flex items-center gap-2">
      <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
      </label>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
        <InformationCircleIcon className="h-4 w-4" />
        </button>
      </div>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        min="0"
        max="10000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
      />
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Hamali Charges</h4>
          <p className="mb-3">
            Charges for manual handling of goods — fees paid for loading and unloading shipments at the pickup or delivery point.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: HandlingChargesField with Info Tooltip
const HandlingChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="5000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
      {showTooltip && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
      </div>
      )}
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Handling Charges</h4>
          <p className="mb-3">
            Extra fee for fragile, heavy, or oversize items needing special care. Applied per shipment (sometimes per kg) when special handling is required.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: ROVChargesField with Info Tooltip
const ROVChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="5000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
      {showTooltip && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
      </div>
      )}
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">ROV (Risk on Value) Charges</h4>
          <p className="mb-3">
            Protection premium on the declared invoice value against loss/damage. Charged as a % of value with a minimum amount.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: CODChargesField with Info Tooltip
const CODChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="2000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
      {showTooltip && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
      </div>
      )}
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">COD/DOD Charges</h4>
          <p className="mb-3">
            Fee for collecting cash from the buyer and remitting it to you. Usually a % of COD amount, with a minimum/maximum cap.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: ToPayChargesField with Info Tooltip
const ToPayChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="2000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
      {showTooltip && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
      </div>
      )}
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">To-Pay Charges</h4>
          <p className="mb-3">
            Surcharge when freight is paid by the consignee at destination. Covers destination billing/collection handling; flat or small %.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: AppointmentChargesField with Info Tooltip
const AppointmentChargesField = ({
  name,
  label,
  value,
  onChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
}) => (
  <div className="relative" data-tooltip-container>
    <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="mt-1 relative">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        min="0"
        max="2000"
        className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
        required
      />
      {showTooltip && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
      </div>
      )}
    </div>
    
    {showTooltip && (
      <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <div className="text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800 mb-2">Appointment Charges</h4>
          <p className="mb-3">
            Fee for deliveries that need a fixed time slot or prior booking. Applied per appointment/attempt to cover coordination and waiting.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    )}
  </div>
);

// HELPER COMPONENT: VolumetricDivisorField with Info Tooltip and Unit Switch
const VolumetricDivisorField = ({
  name,
  label,
  value,
  onChange,
  onSelectChange,
  onKeyDown,
  showTooltip,
  onToggleTooltip,
  showDropdown,
  onToggleDropdown,
  currentUnit,
  onUnitChange
}: {
  name: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showTooltip: boolean;
  onToggleTooltip: () => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  currentUnit: "cm" | "inch";
  onUnitChange: (unit: "cm" | "inch") => void;
}) => {
  // Get the appropriate options based on unit
  const getOptions = () => {
    return currentUnit === "cm" ? VOLUMETRIC_DIVISOR_OPTIONS_CM : CFT_FACTOR_OPTIONS;
  };


  // Get the appropriate tooltip content based on unit
  const getTooltipContent = () => {
    if (currentUnit === "cm") {
      return {
        title: "Volumetric Divisor",
        description: "Formula: (L × B × H) / divisor. Used to convert parcel dimensions into weight for fair pricing of large but light packages."
      };
    } else {
      return {
        title: "CFT Factor", 
        description: "Formula: (L × B × H) × CFT Factor / 1728. Converts cubic inches to cubic feet for volumetric weight calculation."
      };
    }
  };

  const tooltipContent = getTooltipContent();

  return (
    <div className="relative" data-tooltip-container>
      <div className="flex items-center gap-2 mb-2">
        <label htmlFor={name} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {label} <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={onToggleTooltip}
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          <InformationCircleIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 relative">
        <input
          type="text"
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          min={currentUnit === "inch" ? "4" : currentUnit === "cm" ? "2800" : undefined}
          max={currentUnit === "cm" ? "7000" : "10"}
          className="block w-full bg-slate-50/70 border border-slate-300 rounded-lg shadow-sm px-3 py-2 pr-20 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition"
          required
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleDropdown}
            className="text-slate-800 hover:text-blue-600 transition-colors font-bold"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <VolumetricUnitSwitch 
            currentUnit={currentUnit} 
            onUnitChange={onUnitChange} 
          />
        </div>
        
        {/* Dropdown Options */}
        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {getOptions().map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelectChange({ target: { value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
                  onToggleDropdown();
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-100 focus:bg-blue-100 focus:outline-none"
              >
                {option.value}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {showTooltip && (
        <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
          <div className="text-sm text-slate-700">
            <h4 className="font-semibold text-slate-800 mb-2">{tooltipContent.title}</h4>
            <p className="mb-3">
              {tooltipContent.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTooltip}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

// HELPER COMPONENT: Rate Type Switch
const RateTypeSwitch = ({
  isFixed,
  onToggle
}: {
  isFixed: boolean;
  onToggle: () => void;
}) => (
  <div className="flex flex-col items-center gap-1 mt-1.5">
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-5 w-28 items-center rounded-full border-2 border-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* Fixed Rate Section - Show symbol always */}
      <div className={`absolute left-0 top-0 h-full w-1/2 flex items-center justify-center rounded-l-full transition-all duration-300 ${
        !isFixed ? 'bg-white opacity-100' : 'bg-blue-600 opacity-100'
      }`}>
        <span className={`text-sm font-bold ${!isFixed ? 'text-blue-600' : 'text-white'}`}>₹</span>
      </div>
      
      {/* Divider Line */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-px h-3 bg-blue-300"></div>
      
      {/* Variable Rate Section - Show symbol always */}
      <div className={`absolute right-0 top-0 h-full w-1/2 flex items-center justify-center rounded-r-full transition-all duration-300 ${
        isFixed ? 'bg-white opacity-100' : 'bg-blue-600 opacity-100'
      }`}>
        <span className={`text-sm font-bold ${isFixed ? 'text-blue-600' : 'text-white'}`}>%</span>
      </div>
      
    </button>
    
    {/* Text Labels Below Switch */}
    <div className="flex w-24 justify-between text-xs font-medium">
      <span className={`transition-colors ${isFixed ? 'text-blue-600' : 'text-slate-400'}`}>
        Fixed
      </span>
      <span className={`transition-colors ${!isFixed ? 'text-blue-600' : 'text-slate-400'}`}>
        Variable
      </span>
    </div>
  </div>
);

// HELPER COMPONENT: Unit Switch for Volumetric Divisor
const VolumetricUnitSwitch = ({
  currentUnit,
  onUnitChange,
}: {
  currentUnit: "cm" | "inch";
  onUnitChange: (unit: "cm" | "inch") => void;
}) => (
  <div className="flex bg-slate-100 rounded-md p-0.5">
    <button
      type="button"
      onClick={() => onUnitChange("cm")}
      className={`px-1.5 py-0.5 text-sm font-semibold rounded-lg transition-all ${
        currentUnit === "cm"
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      cm
    </button>
    <button
      type="button"
      onClick={() => onUnitChange("inch")}
      className={`px-1.5 py-0.5 text-sm font-semibold rounded-lg transition-all ${
        currentUnit === "inch"
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      inch
    </button>
  </div>
);

// --- MAIN COMPONENT ---
const AddTiedUpCompany = () => {
  const { user } = useAuth();
  const customerID = user?._id;
  
  const [form, setForm] = useState({
    customerID: customerID, 
    vendorCode: "", 
    vendorName: "",
    vendorPhone: "", 
    vendorEmail: "", 
    gstNo: "",
    mode: "road", 
    address: "", 
    state: "", 
    city: "",
    pincode: "", 
    rating: "4",
    companyName: "",
    subVendor: ""
  });

  // Error states for validation
  const [errors, setErrors] = useState({
    vendorPhone: "",
    vendorEmail: "",
    gstNo: "",
    pincode: "",
    fuel: ""
  });

  // Loading state for pincode auto-fill
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const pincodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMinWeightTooltip, setShowMinWeightTooltip] = useState(false);
  const [showDocketChargesTooltip, setShowDocketChargesTooltip] = useState(false);
  const [showMinChargesTooltip, setShowMinChargesTooltip] = useState(false);
  const [showGreenTaxTooltip, setShowGreenTaxTooltip] = useState(false);
  const [showMiscChargesTooltip, setShowMiscChargesTooltip] = useState(false);
  const [showHamaliChargesTooltip, setShowHamaliChargesTooltip] = useState(false);
  const [showHandlingChargesTooltip, setShowHandlingChargesTooltip] = useState(false);
  const [showRovChargesTooltip, setShowRovChargesTooltip] = useState(false);
  const [showCodChargesTooltip, setShowCodChargesTooltip] = useState(false);
  const [showTopayChargesTooltip, setShowTopayChargesTooltip] = useState(false);
  const [showAppointmentChargesTooltip, setShowAppointmentChargesTooltip] = useState(false);
  const [showVolumetricTooltip, setShowVolumetricTooltip] = useState(false);
  const [showVolumetricDropdown, setShowVolumetricDropdown] = useState(false);
  const [showDaccTooltip, setShowDaccTooltip] = useState(false);
  const [showFuelTooltip, setShowFuelTooltip] = useState(false);
  const [showFuelDropdown, setShowFuelDropdown] = useState(false);
  const [showHandlingVariableDropdown, setShowHandlingVariableDropdown] = useState(false);
  const [showRovVariableDropdown, setShowRovVariableDropdown] = useState(false);
  const [showCodVariableDropdown, setShowCodVariableDropdown] = useState(false);
  const [showTopayVariableDropdown, setShowTopayVariableDropdown] = useState(false);
  const [showAppointmentVariableDropdown, setShowAppointmentVariableDropdown] = useState(false);
  const [showCftFactorDropdown, setShowCftFactorDropdown] = useState(false);
  const [showHandlingChargeUnitDropdown, setShowHandlingChargeUnitDropdown] = useState(false);

  // Rate type switches (true = Fixed Rate, false = Variable Rate)
  const [handlingRateType, setHandlingRateType] = useState(true); // true = Fixed, false = Variable
  const [rovRateType, setRovRateType] = useState(true);
  const [codRateType, setCodRateType] = useState(true);
  const [topayRateType, setTopayRateType] = useState(true);
  const [appointmentRateType, setAppointmentRateType] = useState(true);

  // Volumetric unit state
  const [volumetricUnit, setVolumetricUnit] = useState<"cm" | "inch">("cm");

  // Handling charge unit state
  const [handlingChargeUnit, setHandlingChargeUnit] = useState<"per kg" | "per box" | "per piece">("per kg");


  // Load pincodes dataset from public and derive state options
  const [pincodeData, setPincodeData] = useState<PincodeEntry[]>([]);

  useEffect(() => {
    // Fetch static JSON from public folder at runtime (respect base URL)
    const url = `${import.meta.env.BASE_URL || '/'}pincodes.json`;
    fetch(url)
      .then(res => res.json())
      .then((data: PincodeEntry[]) => {
        if (Array.isArray(data)) setPincodeData(data);
      })
      .catch(() => {
        // Fail silently; state dropdown will just be empty
      });
  }, []);


  // Fast lookup by pincode
  const pincodeMap = useMemo(() => {
    const map = new Map<string, { state: string; city: string; zone?: string }>();
    for (const entry of pincodeData) {
      map.set(entry.pincode, { state: entry.state, city: entry.city, zone: entry.zone });
    }
    return map;
  }, [pincodeData]);

  // Unique state options for dropdown (for company information)
  const stateOptions = useMemo(() => {
    const states = Array.from(new Set(pincodeData.map(e => (e.state || '').toString()))).filter(Boolean);
    // Filter out Andaman and Nicobar Islands and Dadra and Nagar Haveli and Daman and Diu
    const filteredStates = states.filter(state => 
      !state.includes('ANDAMAN AND NICOBAR ISLANDS') && 
      !state.includes('DADRA AND NAGAR HAVELI AND DAMAN AND DIU')
    );
    filteredStates.sort((a, b) => a.localeCompare(b));
    return filteredStates.map(s => ({ value: s, label: s }));
  }, [pincodeData]);


  // Validation functions
  const validatePhone = (phone: string): string => {
    if (!phone) return "Phone number is required";
    if (!/^\d{10}$/.test(phone)) return "Phone number must be exactly 10 digits";
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address";
    return "";
  };

  const validateGST = (gst: string): string => {
    if (!gst) return "GST number is required";
    if (gst.length !== 15) return "Invalid GST number";
    
    // Convert to uppercase for validation
    const gstUpper = gst.toUpperCase();
    
    // Complete GST validation with all rules
    if (!/^(0[1-9]|[1-2][0-9]|3[0-7])[A-Z]{5}[0-9]{4}[A-Z][1-9]Z[0-9A-Z]$/.test(gstUpper)) {
      return "Invalid GST number";
    }
    
    return "";
  };

  const validatePincode = (pincode: string): string => {
    if (!pincode) return "Pincode is required";
    if (!/^\d{6}$/.test(pincode)) return "Invalid pincode";
    return "";
  };

  const validateFuel = (fuel: string | number): string => {
    if (fuel === "" || fuel === null || fuel === undefined) return "";
    const s = fuel.toString();
    if (!/^\d+$/.test(s)) return "Must be an integer";
    const numValue = parseInt(s, 10);
    if (numValue < 0) return "Minimum value should be 0";
    if (numValue > 100) return "Maximum value should be 100";
    return "";
  };

  // Pincode auto-fill function using local pincodes.json first, with optional API fallback
  const fetchPincodeDetails = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return;

    setIsLoadingPincode(true);
    try {
      const local = pincodeMap.get(pincode);
      if (local) {
        setForm(prev => ({ ...prev, state: local.state, city: local.city }));
        setErrors(prev => ({ ...prev, pincode: "" }));
        return;
      }

      // Fallback to India Post API only if not found locally
      try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = response.data?.[0];
        if (data?.Status === "Success" && Array.isArray(data.PostOffice) && data.PostOffice.length > 0) {
          const po = data.PostOffice[0];
          setForm(prev => ({ ...prev, state: po.State || prev.state, city: po.District || prev.city }));
          setErrors(prev => ({ ...prev, pincode: "" }));
        } else {
          setErrors(prev => ({ ...prev, pincode: "Invalid pincode" }));
        }
      } catch {
        // If API fails, keep prior state and show error
        setErrors(prev => ({ ...prev, pincode: "Invalid pincode" }));
      }
    } finally {
      setIsLoadingPincode(false);
    }
  };

  // Reset city when state changes
  useEffect(() => {
    if (form.state) {
      // Reset city when state changes
      setForm(prev => ({ ...prev, city: "" }));
    }
  }, [form.state]);


  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (pincodeDebounceRef.current) {
        clearTimeout(pincodeDebounceRef.current);
      }
    };
  }, []);





  // Update form when user data is loaded
  useEffect(() => {
    if (customerID) {
      setForm(prev => ({ ...prev, customerID: customerID }));
    }
  }, [customerID]);




  // Fetch zone matrix data when company is selected




  // Close tooltip and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMinWeightTooltip || showDocketChargesTooltip || showMinChargesTooltip || showGreenTaxTooltip || showMiscChargesTooltip || showHamaliChargesTooltip || showHandlingChargesTooltip || showRovChargesTooltip || showCodChargesTooltip || showTopayChargesTooltip || showAppointmentChargesTooltip || showVolumetricTooltip || showVolumetricDropdown || showDaccTooltip || showFuelTooltip || showFuelDropdown || 
          showHandlingVariableDropdown || showRovVariableDropdown || showCodVariableDropdown || 
          showTopayVariableDropdown || showAppointmentVariableDropdown || showCftFactorDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-tooltip-container]') && !target.closest('[data-dropdown-container]') && !target.closest('[data-combobox-container]')) {
          setShowMinWeightTooltip(false);
          setShowDocketChargesTooltip(false);
          setShowMinChargesTooltip(false);
          setShowGreenTaxTooltip(false);
          setShowMiscChargesTooltip(false);
          setShowHamaliChargesTooltip(false);
          setShowHandlingChargesTooltip(false);
          setShowRovChargesTooltip(false);
          setShowCodChargesTooltip(false);
          setShowTopayChargesTooltip(false);
          setShowAppointmentChargesTooltip(false);
          setShowVolumetricTooltip(false);
          setShowVolumetricDropdown(false);
          setShowDaccTooltip(false);
          setShowFuelTooltip(false);
          setShowFuelDropdown(false);
          setShowHandlingVariableDropdown(false);
          setShowRovVariableDropdown(false);
          setShowCodVariableDropdown(false);
          setShowTopayVariableDropdown(false);
          setShowAppointmentVariableDropdown(false);
          setShowCftFactorDropdown(false);
          setShowHandlingChargeUnitDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMinWeightTooltip, showDocketChargesTooltip, showMinChargesTooltip, showGreenTaxTooltip, showMiscChargesTooltip, showHamaliChargesTooltip, showHandlingChargesTooltip, showRovChargesTooltip, showCodChargesTooltip, showTopayChargesTooltip, showAppointmentChargesTooltip, showVolumetricTooltip, showVolumetricDropdown, showDaccTooltip, showFuelTooltip, showFuelDropdown, 
      showHandlingVariableDropdown, showRovVariableDropdown, showCodVariableDropdown, 
      showTopayVariableDropdown, showAppointmentVariableDropdown, showCftFactorDropdown, 
      showHandlingChargeUnitDropdown]);
  
  const [priceRate, setPriceRate] = useState<any>({});
  // const [priceChart, setPriceChart] = useState<{ [pincode: string]: { [zone: string]: number } }>({});
  
  const [savedVendors, setSavedVendors] = useState<any[]>([]);




  // --- HANDLERS WITH VALIDATION ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    
    // Validation: Pincode length and non-negative numbers
    if (name === 'pincode' && value.length > 6) return;
    if (e.target.type === "number" && Number(value) < 0) return;
    
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    if (name === 'vendorPhone') {
      setErrors(prev => ({ ...prev, vendorPhone: validatePhone(value) }));
    } else if (name === 'gstNo') {
      // Convert GST to uppercase automatically
      const upperValue = value.toUpperCase();
      setForm(prev => ({ ...prev, [name]: upperValue }));
      setErrors(prev => ({ ...prev, gstNo: validateGST(upperValue) }));
    } else if (name === 'vendorCode') {
      // Only allow alphanumeric characters (0-9, A-Z) and convert to uppercase - limit to 20 characters
      const alphanumericValue = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().substring(0, 20);
      setForm(prev => ({ ...prev, [name]: alphanumericValue }));
    } else if (name === 'city') {
      // Only allow letters (a-z, A-Z) and spaces
      const lettersOnlyValue = value.replace(/[^a-zA-Z\s]/g, '');
      setForm(prev => ({ ...prev, [name]: lettersOnlyValue }));
    } else if (name === 'subVendor') {
      // Allow any text for sub vendor - limit to 20 characters
      const truncatedValue = value.substring(0, 20);
      setForm(prev => ({ ...prev, [name]: truncatedValue }));
    } else if (name === 'vendorName') {
      // Only allow letters (a-z, A-Z) and spaces for vendor name - limit to 25 characters
      const lettersOnlyValue = value.replace(/[^a-zA-Z\s]/g, '').substring(0, 25);
      setForm(prev => ({ ...prev, [name]: lettersOnlyValue }));
    } else if (name === 'companyName') {
      // Company name is now handled by dropdown onChange, so this is just a fallback
      setForm(prev => ({ ...prev, [name]: value }));
    } else if (name === 'vendorPhone') {
      // Since onKeyDown prevents non-digits, we just need to limit length
      const truncatedValue = value.substring(0, 10);
      setForm(prev => ({ ...prev, [name]: truncatedValue }));
      setErrors(prev => ({ ...prev, vendorPhone: validatePhone(truncatedValue) }));
    } else if (name === 'pincode') {
      // Clear previous timeout
      if (pincodeDebounceRef.current) {
        clearTimeout(pincodeDebounceRef.current);
      }
      
      // Auto-fill when exactly 6 digits are entered (with debounce)
      if (value.length === 6 && /^\d{6}$/.test(value)) {
        pincodeDebounceRef.current = setTimeout(() => {
          fetchPincodeDetails(value);
        }, 500); // 500ms delay to prevent rapid API calls
      }
    }
  };




  const handlePincodeBlur = () => {
    setErrors(prev => ({ ...prev, pincode: validatePincode(form.pincode) }));
    if (form.pincode && form.pincode.length === 6) {
      fetchPincodeDetails(form.pincode);
    }
  };
  const handleEmailBlur = () => {
    setErrors(prev => ({ ...prev, vendorEmail: validateEmail(form.vendorEmail) }));
  };

  // KeyDown handler for vendor phone - only allow digits and control keys
  const handleVendorPhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow only digits (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // KeyDown handler for pincode - only allow digits and control keys

// Helper functions for decimal field validation
// Allow empty string while typing; otherwise digits with optional . and up to 2 decimals
const isTwoDecimal = (s: string) => /^(\d+(\.\d{0,2})?)?$/.test(s);

const DECIMAL_FIELDS = new Set([
  "handlingCharges.fixed",
  "handlingCharges.variable",
  "handlingCharges.minimum",
  "rovCharges.fixed",
  "rovCharges.variable",
  "rovCharges.minimum",
  "codCharges.fixed",
  "codCharges.variable",
  "codCharges.minimum",
  "topayCharges.fixed",
  "topayCharges.variable",
  "topayCharges.minimum",
  "appointmentCharges.fixed",
  "appointmentCharges.variable",
  "appointmentCharges.minimum",
]);

const rangeFor = (name: string): [number, number] => {
  switch (name) {
    case "handlingCharges.fixed": return [0, 5000];
    case "handlingCharges.variable": return [0, 50];
    case "handlingCharges.minimum": return [0, 5000];

    case "rovCharges.fixed":
    case "codCharges.fixed":
    case "topayCharges.fixed":
    case "appointmentCharges.fixed":
      return [0, 2000];

    case "rovCharges.variable":
    case "codCharges.variable":
    case "topayCharges.variable":
    case "appointmentCharges.variable":
      return [0, 5];

    case "rovCharges.minimum":
    case "codCharges.minimum":
    case "topayCharges.minimum":
    case "appointmentCharges.minimum":
      return [0, 2000];

    default: return [0, 1000000]; // fallback, shouldn't hit for the listed fields
  }
};

// Helper function to coerce values to numbers with 2 decimal places
const toNumberOrZero = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

// ✅ Zone Matrix Helper Functions

// ✅ detect a Zone→Zone field path like "zoneRates.N1.N2"
const isZoneRateField = (name: string) => name.startsWith("zoneRates.");

// ✅ immutable dot-path setter (no lodash needed)
const setByPath = <T extends Record<string, any>>(obj: T, path: string, val: any): T => {
  const parts = path.split(".");
  const root: any = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] || {}) };
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = val;
  return root;
};

// ✅ 2dp normalizer for payload
const to2dp = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

// ✅ normalize whole matrix to numbers with 2dp
const normalizeZoneRates = (zoneRates: Record<string, Record<string, any>>) => {
  const out: Record<string, Record<string, number>> = {};
  for (const from in zoneRates || {}) {
    out[from] = {};
    for (const to in (zoneRates[from] || {})) {
      out[from][to] = to2dp(zoneRates[from][to]);
    }
  }
  return out;
};


 // KeyDown handler - only allow positive integers (including zero)
const handleMinWeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-10000 range
  if (numValue > 10000) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 4 consecutive zeros at the beginning
  if (e.key === '0' && currentValue.startsWith('0000')) {
    e.preventDefault();
  }
};

// KeyDown handler for pincode - only allow digits and control keys
const handlePincodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9)
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

  // KeyDown handler - only allow positive integers (including zero)
const handleDocketChargesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-500 range
  if (numValue > 500) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 3 consecutive zeros at the beginning (but allow first zero)
  if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('000')) {
    e.preventDefault();
  }
};


 // KeyDown handler - only allow positive integers (including zero)
const handleFuelSurchargeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-40 range
  if (numValue > 40) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 2 consecutive zeros at the beginning (but allow first zero)
  if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('00')) {
    e.preventDefault();
  }
};

 
// KeyDown handler - only allow positive integers (excluding zero)
const handleVolumetricDivisorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Prevent typing "0" as first digit
  if (e.key === '0' && (e.target as HTMLInputElement).value.length === 0) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Different validation ranges for different units
  if (volumetricUnit === "cm") {
    // For cm unit: allow 2800-7000
    if (numValue > 7000) {
      e.preventDefault();
      return;
    }
    // Prevent entering values less than 2800
    if (numValue < 2800 && numValue > 0) {
      e.preventDefault();
      return;
    }
  } else {
    // For inch unit: allow 4-10 only
    if (numValue > 10) {
      e.preventDefault();
      return;
    }
    // Prevent entering values less than 4
    if (numValue < 4 && numValue > 0) {
      e.preventDefault();
      return;
    }
  }
};


  // KeyDown handler - only allow positive integers (including zero)
const handleMinChargesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-10000 range
  if (numValue > 10000) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 4 consecutive zeros at the beginning (but allow first zero)
  if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('0000')) {
    e.preventDefault();
  }
};

// Input change handler

  // KeyDown handler - only allow positive integers (including zero)
const handleGreenTaxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-10000 range
  if (numValue > 10000) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 4 consecutive zeros at the beginning (but allow first zero)
  if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('0000')) {
    e.preventDefault();
  }
};


 // KeyDown handler - only allow positive integers (including zero)
const handleDaccChargesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-1000 range
  if (numValue > 1000) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 3 consecutive zeros at the beginning (but allow first zero)
  if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('000')) {
    e.preventDefault();
  }
};

  /// KeyDown handler - only allow positive integers (including zero)
const handleMiscChargesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow control keys
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
      e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
    return;
  }
  
  // Allow only digits (0-9) - no decimal points
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Get current value and the new value that would be created
  const currentValue = (e.target as HTMLInputElement).value;
  const newValue = currentValue + e.key;
  const numValue = parseInt(newValue, 10);
  
  // Prevent typing if the new value would be outside 0-10000 range
  if (numValue > 10000) {
    e.preventDefault();
    return;
  }
  
  // Prevent more than 4 consecutive zeros at the beginning (but allow first zero)
  if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('0000')) {
    e.preventDefault();
  }
};

  const handleHamaliChargesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow only digits (0-9) - no decimal points
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Get current value and the new value that would be created
    const currentValue = (e.target as HTMLInputElement).value;
    const newValue = currentValue + e.key;
    const numValue = parseInt(newValue, 10);
    
    // Prevent typing if the new value would be outside 0-10000 range
    if (numValue > 10000) {
      e.preventDefault();
      return;
    }
    
    // Prevent more than 4 consecutive zeros at the beginning (but allow first zero)
    if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('0000')) {
      e.preventDefault();
    }
  };

  // KeyDown handler for handlingCharges.threshholdweight - only allow digits 1-20000 range
  const handleHandlingWeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow only digits (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Get current value and the new value that would be created
    const currentValue = (e.target as HTMLInputElement).value;
    const newValue = currentValue + e.key;
    const numValue = parseFloat(newValue);
    
    // Prevent typing if the new value would be outside 1-20000 range
    if (numValue > 20000) {
      e.preventDefault();
      return;
    }
    
    // Prevent more than 3 consecutive zeros at the beginning
    if (e.key === '0' && currentValue.startsWith('000')) {
      e.preventDefault();
    }
  };

  // KeyDown handler for ROV/COD/Topay/Appointment fixed charges - only allow digits 0-5000/2000 range
  const handleChargeFixedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, maxValue: number) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow digits (0-9) and decimal point
    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Get current value and the new value that would be created
    const currentValue = (e.target as HTMLInputElement).value;
    const newValue = currentValue + e.key;
    
    // Prevent multiple decimal points
    if (e.key === '.' && currentValue.includes('.')) {
      e.preventDefault();
      return;
    }
    
    // Check if the new value would be a valid decimal format
    if (!isTwoDecimal(newValue)) {
      e.preventDefault();
      return;
    }
    
    const numValue = parseFloat(newValue);
    
    // Prevent typing if the new value would be outside 0-maxValue range
    if (!isNaN(numValue) && numValue > maxValue) {
      e.preventDefault();
      return;
    }
    
    // Prevent more than 2 consecutive zeros at the beginning (but allow first zero)
    if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('00')) {
      e.preventDefault();
    }
  };

  // KeyDown handler for percentage fields - allow decimals 0-5 range
  const handlePercentageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow digits (0-9) and decimal point
    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Get current value and the new value that would be created
    const currentValue = (e.target as HTMLInputElement).value;
    const newValue = currentValue + e.key;
    
    // Prevent multiple decimal points
    if (e.key === '.' && currentValue.includes('.')) {
      e.preventDefault();
      return;
    }
    
    // Check if the new value would be a valid decimal format
    if (!isTwoDecimal(newValue)) {
      e.preventDefault();
      return;
    }
    
    const numValue = parseFloat(newValue);
    
    // Prevent typing if the new value would be outside 0-5 range
    if (!isNaN(numValue) && numValue > 5) {
      e.preventDefault();
      return;
    }
    
    // Prevent more than 1 consecutive zero at the beginning (but allow first zero)
    if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('0')) {
      e.preventDefault();
    }
  };

  // KeyDown handler for handling variable percentage - allow decimals 0-50 range
  const handleHandlingVariableKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow digits (0-9) and decimal point
    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Get current value and the new value that would be created
    const currentValue = (e.target as HTMLInputElement).value;
    const newValue = currentValue + e.key;
    
    // Prevent multiple decimal points
    if (e.key === '.' && currentValue.includes('.')) {
      e.preventDefault();
      return;
    }
    
    // Check if the new value would be a valid decimal format
    if (!isTwoDecimal(newValue)) {
      e.preventDefault();
      return;
    }
    
    const numValue = parseFloat(newValue);
    
    // Prevent typing if the new value would be outside 0-50 range
    if (!isNaN(numValue) && numValue > 50) {
      e.preventDefault();
      return;
    }
    
    // Prevent more than 1 consecutive zero at the beginning (but allow first zero)
    if (e.key === '0' && currentValue.length > 0 && currentValue.startsWith('0')) {
      e.preventDefault();
    }
  };

  // KeyDown handler for vendor name field - only allow letters (a-z, A-Z) and spaces
  const handleVendorNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow only letters (a-z, A-Z) and spaces
    if (!/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };


  // KeyDown handler for city field - only allow letters (a-z, A-Z) and spaces
  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, tab, escape, enter, arrow keys, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Allow only letters (a-z, A-Z) and spaces
    if (!/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNestedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // ---------- ZONE-TO-ZONE (accept decimals up to 2dp) ----------
    if (isZoneRateField(name)) {
      // allow clearing mid-typing
      if (value === "") {
        setPriceRate((prev: any) => setByPath(prev, name, "")); // keep empty string while typing
        return;
      }
      // format: digits with optional "." and up to 2 decimals
      if (!isTwoDecimal(value)) return;

      const num = parseFloat(value);
      if (!Number.isFinite(num) || num < 0 || num > 100000) return; // tweak max if needed

      // keep raw string so "12." is allowed while typing
      setPriceRate((prev: any) => setByPath(prev, name, value));
      return;
    }

    // ---------- DECIMAL FIELDS (2dp) ----------
    if (DECIMAL_FIELDS.has(name)) {
      // allow user to clear field
      if (value === "") {
        const keys = name.split(".");
        setPriceRate((prev: any) => {
          const updated = JSON.parse(JSON.stringify(prev));
          let nested = updated;
          for (let i = 0; i < keys.length - 1; i++) {
            nested[keys[i]] = nested[keys[i]] || {};
            nested = nested[keys[i]];
          }
          nested[keys[keys.length - 1]] = "";
          return updated;
        });
        return;
      }

      // block bad formats (more than 2 decimals, multiple dots, etc.)
      if (!isTwoDecimal(value)) return;

      const num = parseFloat(value);
      if (Number.isNaN(num) || num < 0) return;

      const [min, max] = rangeFor(name);
      if (num < min || num > max) return;

      // Update state with the raw string to preserve typing
      const keys = name.split(".");
      setPriceRate((prev: any) => {
        const updated = JSON.parse(JSON.stringify(prev));
        let nested = updated;
        for (let i = 0; i < keys.length - 1; i++) {
          nested[keys[i]] = nested[keys[i]] || {};
          nested = nested[keys[i]];
        }
        nested[keys[keys.length - 1]] = value;
        return updated;
      });
      return;
    }

    // ---------- EXISTING INTEGER FIELDS ----------
    // Keep your current logic for other fields, but prefer parseFloat-safe checks
    if (value && parseFloat(value) < 0) return;

    if (name === "divisor" && value && (parseFloat(value) < 1 || parseFloat(value) > 10000)) return;

    // Min Weight should allow 0 (changed from <1 to <0)
    if (name === "minWeight" && value && (parseFloat(value) < 0 || parseFloat(value) > 10000)) return;

    if (name === "docketCharges" && value && (parseFloat(value) < 0 || parseFloat(value) > 10000)) return;

    if (name === "fuel" && value && (parseFloat(value) < 0 || parseFloat(value) > 100)) return;

    if (name === "minCharges" && value && (parseFloat(value) < 0 || parseFloat(value) > 10000)) return;

    if (name === "greenTax" && value && (parseFloat(value) < 0 || parseFloat(value) > 10000)) return;

    if (name === "daccCharges" && value && (parseFloat(value) < 0 || parseFloat(value) > 1000)) return;

    if (name === "miscellanousCharges" && value && (parseFloat(value) < 0 || parseFloat(value) > 10000)) return;

    if (name === "hamaliCharges" && value && (parseFloat(value) < 0 || parseFloat(value) > 10000)) return;

    if (name === "cftFactor" && value && (parseFloat(value) < 4 || parseFloat(value) > 10)) return;

    if (name === "handlingCharges.threshholdweight" && value && (parseFloat(value) < 0 || parseFloat(value) > 20000)) return;

    // Handle volumetric divisor conversion
    if (name === "divisor") {
      if (value === "") {
        // Set minimum values based on unit when field is empty
        if (volumetricUnit === "inch") {
          setPriceRate((prev: any) => ({ ...prev, divisor: 4 }));
        } else {
          // For cm, set minimum value to 2800 when field is empty
          setPriceRate((prev: any) => ({ ...prev, divisor: 2800 }));
        }
        return;
      }
      
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) return;
      
      // Different validation ranges for different units
      if (volumetricUnit === "cm" && num > 7000) return;
      if (volumetricUnit === "inch" && (num < 4 || num > 10)) return;
      
      // For cm: store the divisor value directly
      // For inch: store the CFT factor value directly (no conversion needed)
      setPriceRate((prev: any) => ({ ...prev, divisor: num }));
      return;
    }

    const keys = name.split(".");
    setPriceRate((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      let nested = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        nested[keys[i]] = nested[keys[i]] || {};
        nested = nested[keys[i]];
      }
      nested[keys[keys.length - 1]] = value ? parseInt(value) : undefined;
      return updated;
    });

    // Validate fuel field and set error
    if (name === "fuel") {
      setErrors(prev => ({ ...prev, fuel: validateFuel(value) }));
    }
  };



  // Function to add vendor to local list (removed - zones moved to separate page)



  // Function to delete a vendor from the list
  const handleDeleteVendor = (vendorId: number) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      setSavedVendors(prev => prev.filter(vendor => vendor.id !== vendorId));
      toast.success("Vendor deleted successfully!");
    }
  };

  // Function to validate current form data
  const validateCurrentForm = () => {
    // Check if all required fields are filled
    const requiredFields = {
      companyName: form.companyName,
      vendorCode: form.vendorCode,
      vendorName: form.vendorName,
      vendorPhone: form.vendorPhone,
      vendorEmail: form.vendorEmail,
      gstNo: form.gstNo,
      mode: form.mode,
      address: form.address,
      state: form.state,
      city: form.city,
      pincode: form.pincode,
      rating: form.rating
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value || value.toString().trim() === '');

    if (missingFields.length > 0) {
      return false;
    }

    // Validate field formats
    const phoneError = validatePhone(form.vendorPhone);
    const emailError = validateEmail(form.vendorEmail);
    const gstError = validateGST(form.gstNo);
    const pincodeError = validatePincode(form.pincode);
    const fuelError = validateFuel(priceRate.fuel);

    if (phoneError || emailError || gstError || pincodeError || fuelError) {
      return false;
    }

    // Validate volumetric divisor/CFT factor based on unit
    if (!priceRate.divisor || priceRate.divisor === "" || priceRate.divisor === 0) {
      const fieldName = volumetricUnit === "cm" ? "Volumetric Divisor" : "CFT Factor";
      toast.error(`${fieldName} is required`);
      return false;
    }
    
    const divisorValue = parseFloat(priceRate.divisor.toString());
    if (volumetricUnit === "cm") {
      if (isNaN(divisorValue) || divisorValue < 2800 || divisorValue > 7000) {
        toast.error("Volumetric Divisor must be between 2800 and 7000");
        return false;
      }
    } else {
      if (isNaN(divisorValue) || divisorValue < 4 || divisorValue > 10) {
        toast.error("CFT Factor must be between 4 and 10");
        return false;
      }
    }


    // Validate charge fields - prevent filling both fixed and variable rates
    const chargeValidations = [
      {
        name: 'Handling Charges',
        fixed: priceRate.handlingCharges?.fixed,
        variable: priceRate.handlingCharges?.variable,
        isFixed: handlingRateType
      },
      {
        name: 'ROV/FOV Charges',
        fixed: priceRate.rovCharges?.fixed,
        variable: priceRate.rovCharges?.variable,
        isFixed: rovRateType
      },
      {
        name: 'COD/DOD Charges',
        fixed: priceRate.codCharges?.fixed,
        variable: priceRate.codCharges?.variable,
        isFixed: codRateType
      },
      {
        name: 'To-Pay Charges',
        fixed: priceRate.topayCharges?.fixed,
        variable: priceRate.topayCharges?.variable,
        isFixed: topayRateType
      },
      {
        name: 'Appointment Charges',
        fixed: priceRate.appointmentCharges?.fixed,
        variable: priceRate.appointmentCharges?.variable,
        isFixed: appointmentRateType
      }
    ];

    for (const charge of chargeValidations) {
      const hasFixedValue = charge.fixed && charge.fixed !== '' && charge.fixed !== '0' && charge.fixed !== 0;
      const hasVariableValue = charge.variable && charge.variable !== '' && charge.variable !== '0' && charge.variable !== 0;
      
      if (hasFixedValue && hasVariableValue) {
        toast.error(`You cannot fill both Fixed and Variable rates for ${charge.name}. Please choose one rate type.`);
        return false;
      }
    }

    return true;
  };

  // Function to edit a vendor (populate form with vendor data)
  const handleEditVendor = (vendor: any) => {
    // Populate form with vendor data
    setForm({
      customerID: vendor.customerID,
      vendorCode: vendor.vendorCode,
      vendorName: vendor.vendorName || "",
      vendorPhone: vendor.vendorPhone.toString(),
      vendorEmail: vendor.vendorEmail,
      gstNo: vendor.gstNo,
      mode: vendor.mode,
      address: vendor.address,
      state: vendor.state,
      city: vendor.city,
      pincode: vendor.pincode.toString(),
      rating: vendor.rating.toString(),
      companyName: vendor.companyName,
      subVendor: vendor.subVendor || ""
    });

    // Company name will be set directly in the form

    // Populate price rate
    setPriceRate(vendor.priceRate || {});


    // Clear any existing errors
    setErrors({ vendorPhone: "", vendorEmail: "", gstNo: "", pincode: "", fuel: "" });

    // Remove the vendor from the list (since we're editing it)
    setSavedVendors(prev => prev.filter(v => v.id !== vendor.id));

    toast.success("Vendor data loaded for editing!");
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const token = Cookies.get("authToken");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have vendors in the list OR if the current form is valid
    const hasSavedVendors = savedVendors.length > 0;
    const isCurrentFormValid = validateCurrentForm();
    
    if (!hasSavedVendors && !isCurrentFormValid) {
      toast.error("Please add at least one vendor or fill in all required fields");
      return;
    }
    
    // setIsSubmitting(true); // Removed - not needed
    
    // Prepare vendors to save (saved vendors + current form if valid)
    const vendorsToSave = [...savedVendors];
    
    // If current form is valid and not already in saved vendors, add it
    if (isCurrentFormValid && !hasSavedVendors) {
      const currentVendorData = {
        id: Date.now(),
        ...form,
        vendorPhone: Number(form.vendorPhone),
        pincode: Number(form.pincode),
        rating: Number(form.rating),
        priceRate,
        addedAt: new Date().toLocaleString()
      };
      vendorsToSave.push(currentVendorData);
    }
    
    const toastId = toast.loading(`Saving ${vendorsToSave.length} vendor(s) to backend...`);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Save each vendor to the backend
      for (const vendor of vendorsToSave) {
        try {
        const payload = { 
          ...vendor,
          // Remove local fields that shouldn't be sent to backend
          id: undefined,
          addedAt: undefined,
          // Coerce decimal fields to numbers with 2 decimal places
          priceRate: {
            ...vendor.priceRate,
            handlingCharges: {
              fixed: toNumberOrZero(vendor.priceRate?.handlingCharges?.fixed),
              variable: toNumberOrZero(vendor.priceRate?.handlingCharges?.variable),
              threshholdweight: toNumberOrZero(vendor.priceRate?.handlingCharges?.threshholdweight),
              unit: vendor.priceRate?.handlingCharges?.unit || handlingChargeUnit
            },
            rovCharges: {
              fixed: toNumberOrZero(vendor.priceRate?.rovCharges?.fixed),
              variable: toNumberOrZero(vendor.priceRate?.rovCharges?.variable)
            },
            codCharges: {
              fixed: toNumberOrZero(vendor.priceRate?.codCharges?.fixed),
              variable: toNumberOrZero(vendor.priceRate?.codCharges?.variable)
            },
            topayCharges: {
              fixed: toNumberOrZero(vendor.priceRate?.topayCharges?.fixed),
              variable: toNumberOrZero(vendor.priceRate?.topayCharges?.variable)
            },
            appointmentCharges: {
              fixed: toNumberOrZero(vendor.priceRate?.appointmentCharges?.fixed),
              variable: toNumberOrZero(vendor.priceRate?.appointmentCharges?.variable)
            },
            // Normalize zone rates to numbers with 2 decimal places
            zoneRates: normalizeZoneRates(vendor.priceRate?.zoneRates || {})
          }
        };

          // Try multiple approaches: proxy, then legacy, then new endpoint
          let res;
          try {
            // First try using the Vite proxy (which should route to the correct backend)
            res = await axios.post("/api/transporter/add-tied-up", payload, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (proxyError: any) {
            console.warn("Proxy route failed, trying legacy route:", proxyError.message);
            try {
              // Try the legacy route that should exist on deployed backend
              res = await axios.post("https://tester-backend-4nxc.onrender.com/api/transporter/add-tied-up", payload, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (legacyError: any) {
              console.warn("Legacy route failed, trying direct new route:", legacyError.message);
              try {
                // Try the new route directly
                res = await axios.post("https://tester-backend-4nxc.onrender.com/api/transporter/add-tied-up", payload, {
                  headers: { Authorization: `Bearer ${token}` }
                });
              } catch (directError: any) {
                console.error("All routes failed for vendor:", vendor.companyName);
                throw proxyError; // Throw the original proxy error
              }
            }
          }

          if (res.data.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to save vendor ${vendor.companyName}:`, res.data.message);
          }
        } catch (err: any) {
          errorCount++;
          console.error(`Error saving vendor ${vendor.companyName}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Save ${successCount} Vendor(s) Successfully`, { id: toastId, duration: 4000 });
        
        // Clear saved vendors list after successful backend save
        setSavedVendors([]);
        
        // Reset form
        setForm({ 
          customerID: customerID, 
          vendorCode: "", 
          vendorName: "",
          vendorPhone: "", 
          vendorEmail: "", 
          gstNo: "", 
          mode: "road", 
          address: "", 
          state: "", 
          city: "",
          pincode: "", 
          rating: "4", 
          companyName: "",
          subVendor: ""
        });
        setPriceRate({});
        setErrors({ vendorPhone: "", vendorEmail: "", gstNo: "", pincode: "", fuel: "" });
        
        if (errorCount > 0) {
          toast.error(`${errorCount} vendor(s) failed to save. Check console for details.`);
        }
      } else {
        toast.error("Failed to save any vendors to backend. Please try again.", { id: toastId });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Failed to save vendors to backend. Please try again.", { id: toastId });
    } finally {
      // setIsSubmitting(false); // Removed - not needed
    }
  };


  const toggleMinWeightTooltip = () => {
    setShowMinWeightTooltip(prev => !prev);
  };

  const toggleDocketChargesTooltip = () => {
    setShowDocketChargesTooltip(prev => !prev);
  };

  const toggleMinChargesTooltip = () => {
    setShowMinChargesTooltip(prev => !prev);
  };

  const toggleGreenTaxTooltip = () => {
    setShowGreenTaxTooltip(prev => !prev);
  };

  const toggleMiscChargesTooltip = () => {
    setShowMiscChargesTooltip(prev => !prev);
  };

  const toggleHamaliChargesTooltip = () => {
    setShowHamaliChargesTooltip(prev => !prev);
  };

  const toggleHandlingChargesTooltip = () => {
    setShowHandlingChargesTooltip(prev => !prev);
  };

  const toggleRovChargesTooltip = () => {
    setShowRovChargesTooltip(prev => !prev);
  };

  const toggleCodChargesTooltip = () => {
    setShowCodChargesTooltip(prev => !prev);
  };

  const toggleTopayChargesTooltip = () => {
    setShowTopayChargesTooltip(prev => !prev);
  };

  const toggleAppointmentChargesTooltip = () => {
    setShowAppointmentChargesTooltip(prev => !prev);
  };

  const toggleVolumetricTooltip = () => {
    setShowVolumetricTooltip(prev => !prev);
  };

  const toggleVolumetricDropdown = () => {
    setShowVolumetricDropdown(prev => !prev);
  };

  const toggleDaccTooltip = () => {
    setShowDaccTooltip(prev => !prev);
  };

  const toggleFuelTooltip = () => {
    setShowFuelTooltip(prev => !prev);
  };

  const toggleFuelDropdown = () => {
    setShowFuelDropdown(prev => !prev);
  };

  const toggleHandlingVariableDropdown = () => {
    setShowHandlingVariableDropdown(prev => !prev);
  };

  const toggleHandlingChargeUnitDropdown = () => {
    setShowHandlingChargeUnitDropdown(prev => !prev);
  };

  const handleHandlingChargeUnitChange = (unit: "per kg" | "per box" | "per piece") => {
    setHandlingChargeUnit(unit);
    // Update the priceRate with the new unit
    setPriceRate((prev: any) => ({
      ...prev,
      handlingCharges: {
        ...prev.handlingCharges,
        unit: unit
      }
    }));
  };

  const toggleRovVariableDropdown = () => {
    setShowRovVariableDropdown(prev => !prev);
  };

  const toggleCodVariableDropdown = () => {
    setShowCodVariableDropdown(prev => !prev);
  };

  const toggleTopayVariableDropdown = () => {
    setShowTopayVariableDropdown(prev => !prev);
  };

  const toggleAppointmentVariableDropdown = () => {
    setShowAppointmentVariableDropdown(prev => !prev);
  };




  const handleVolumetricDivisorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      const num = parseFloat(value);
      // Store the value directly - no conversion needed
      setPriceRate((prev: any) => ({
        ...prev,
        divisor: num
      }));
    }
  };

  // Handle volumetric unit change
  const handleVolumetricUnitChange = (newUnit: "cm" | "inch") => {
    setVolumetricUnit(newUnit);
    
    // Convert existing value when switching units
    if (priceRate.divisor && priceRate.divisor !== "") {
      const currentValue = parseFloat(priceRate.divisor.toString());
      
      if (volumetricUnit === "cm" && newUnit === "inch") {
        // Converting from cm divisor to inch CFT factor
        // If current value is outside CFT range (4-10), set to default 4
        if (currentValue < 4 || currentValue > 10) {
          setPriceRate((prev: any) => ({ ...prev, divisor: 4 }));
        }
        // If current value is within CFT range, keep it
      } else if (volumetricUnit === "inch" && newUnit === "cm") {
        // Converting from inch CFT factor to cm divisor
        // If current value is outside cm range (2800-7000), set to default 5000
        if (currentValue < 2800 || currentValue > 7000) {
          setPriceRate((prev: any) => ({ ...prev, divisor: 5000 }));
        }
        // If current value is within cm range, keep it
      }
    } else {
      // Set default values for empty fields
      if (newUnit === "inch") {
        setPriceRate((prev: any) => ({ ...prev, divisor: 4 }));
      } else {
        setPriceRate((prev: any) => ({ ...prev, divisor: 5000 }));
      }
    }
  };

  // Initialize handling charge unit in priceRate
  useEffect(() => {
    if (!priceRate.handlingCharges?.unit) {
      setPriceRate((prev: any) => ({
        ...prev,
        handlingCharges: {
          ...prev.handlingCharges,
          unit: handlingChargeUnit
        }
      }));
    }
  }, [handlingChargeUnit]);

  // Get display value for volumetric divisor
  const getVolumetricDisplayValue = (value: number | undefined): string => {
    if (value === undefined || value === null) {
      // Show default minimum values based on unit
      if (volumetricUnit === "inch") return "4";
      if (volumetricUnit === "cm") return "2800";
      return "";
    }
    return Math.round(value).toString();
  };

  const handleFuelSurchargeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setPriceRate((prev: any) => ({
        ...prev,
        fuel: parseFloat(value)
      }));
      // Clear error when valid option is selected
      setErrors(prev => ({ ...prev, fuel: "" }));
    }
  };



  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Add Tied-Up Company</h1>
          <p className="mt-2 text-md text-slate-500">Create a new partner profile with detailed pricing information.</p>
        </header>
        
        {/* Section 1: Company Details */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-4 mb-6">Company Information</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Company Name - Simple Input Field */}
            <StyledInputField
              name="companyName"
              label="Company Name"
              value={form.companyName}
              onChange={(e) => {
                const inputValue = e.target.value;
                setForm(prev => ({ ...prev, companyName: inputValue }));
                
              }}
              placeholder="Enter company name"
            />
            
            {/* Sub Vendor - Optional Field */}
            <StyledInputField 
              name="subVendor" 
              label="Sub Vendor" 
              value={form.subVendor} 
              onChange={handleChange} 
              placeholder="Enter sub vendor name (optional)"
              required={false}
              maxLength={20}
            />
            
            <StyledInputField 
              name="vendorCode" 
              label="Vendor Code" 
              value={form.vendorCode} 
              onChange={handleChange} 
              maxLength={20}
            />
            
            <StyledInputField 
              name="vendorName" 
              label="CONTACT PERSON NAME" 
              value={form.vendorName} 
              onChange={handleChange} 
              onKeyDown={handleVendorNameKeyDown}
              maxLength={25}
            />
            
            {/* Phone with validation */}
            <StyledInputField 
              name="vendorPhone" 
              label="Vendor Phone Number" 
              type="text" 
              value={form.vendorPhone} 
              onChange={handleChange} 
              onKeyDown={handleVendorPhoneKeyDown}
              maxLength={10}
              error={errors.vendorPhone}
            />
            
            {/* Email with validation */}
            <StyledInputField 
              name="vendorEmail" 
              label="Vendor Email Address" 
              type="email" 
              value={form.vendorEmail} 
              onChange={handleChange} 
              onBlur={handleEmailBlur}
              error={errors.vendorEmail}
            />
            
            {/* GST with validation */}
            <StyledInputField 
              name="gstNo" 
              label="GST No." 
              value={form.gstNo} 
              onChange={handleChange} 
              maxLength={15}
              error={errors.gstNo}
            />
            
            {/* Pincode with auto-fill */}
            <div className="relative">
              <StyledInputField 
                name="pincode" 
                label="Pincode (6 digits)" 
                type="text" 
                value={form.pincode} 
                onChange={handleChange} 
                onBlur={handlePincodeBlur}
                onKeyDown={handlePincodeKeyDown}
                maxLength={6} 
                error={errors.pincode}
              />
              {isLoadingPincode && (
                <div className="absolute right-3 top-8">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            
            {/* State Dropdown */}
            <DropdownField
              name="state"
              label="State"
              value={form.state}
              onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
              options={stateOptions}
            />
            
            {/* City Input Field */}
            <StyledInputField 
              name="city" 
              label="City" 
              value={form.city} 
              onChange={handleChange} 
              onKeyDown={handleCityKeyDown}
              placeholder="Enter city name"
            />
            
            <div className="sm:col-span-2">
              <StyledInputField 
                name="address" 
                label="Address" 
                value={form.address} 
                onChange={handleChange} 
                required={true}
              />
            </div>
            
            {/* Transport Mode Dropdown */}
            <DropdownField
              name="mode"
              label="Transport Mode"
              value={form.mode}
              onChange={(e) => setForm(prev => ({ ...prev, mode: e.target.value }))}
              options={TRANSPORT_MODES}
            />
            
            <RatingSlider
                label="Company Rating"
                value={form.rating}
                onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 2: Price Rate */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-4 mb-6">Price Rate Configuration</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            <MinWeightField 
              name="minWeight" 
              label="Min Chargeable Weight (KG)" 
              value={priceRate.minWeight ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleMinWeightKeyDown}
              showTooltip={showMinWeightTooltip}
              onToggleTooltip={toggleMinWeightTooltip}
            />
            <DocketChargesField 
              name="docketCharges" 
              label="Docket Charges (₹)" 
              value={priceRate.docketCharges ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleDocketChargesKeyDown}
              showTooltip={showDocketChargesTooltip}
              onToggleTooltip={toggleDocketChargesTooltip}
            />
            <FuelSurchargeField 
              name="fuel" 
              label="Fuel Surcharge (%)" 
              value={priceRate.fuel ?? ""} 
              onChange={handleNestedInputChange}
              onSelectChange={handleFuelSurchargeSelect}
              onKeyDown={handleFuelSurchargeKeyDown}
              showDropdown={showFuelDropdown}
              onToggleDropdown={toggleFuelDropdown}
              showTooltip={showFuelTooltip}
              onToggleTooltip={toggleFuelTooltip}
              error={errors.fuel}
            />
            <VolumetricDivisorField 
              name="divisor" 
              label={volumetricUnit === "cm" ? "Volumetric weight(LxBxH)/" : "CFT Factor"}
              value={getVolumetricDisplayValue(priceRate.divisor)} 
              onChange={handleNestedInputChange}
              onSelectChange={handleVolumetricDivisorSelect}
              onKeyDown={handleVolumetricDivisorKeyDown}
              showTooltip={showVolumetricTooltip}
              onToggleTooltip={toggleVolumetricTooltip}
              showDropdown={showVolumetricDropdown}
              onToggleDropdown={toggleVolumetricDropdown}
              currentUnit={volumetricUnit}
              onUnitChange={handleVolumetricUnitChange}
            />
            <MinChargesField 
              name="minCharges" 
              label="Minimum Charges (₹)" 
              value={priceRate.minCharges ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleMinChargesKeyDown}
              showTooltip={showMinChargesTooltip}
              onToggleTooltip={toggleMinChargesTooltip}
            />
            <GreenTaxField 
              name="greenTax" 
              label="Green Tax (₹)/NGT Charge" 
              value={priceRate.greenTax ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleGreenTaxKeyDown}
              showTooltip={showGreenTaxTooltip}
              onToggleTooltip={toggleGreenTaxTooltip}
            />
            <DaccChargesField 
              name="daccCharges" 
              label="DACC Charges (₹)" 
              value={priceRate.daccCharges ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleDaccChargesKeyDown}
              showTooltip={showDaccTooltip}
              onToggleTooltip={toggleDaccTooltip}
            />
            <MiscChargesField 
              name="miscellanousCharges" 
              label="miscellaneous/AOC Charges (₹)" 
              value={priceRate.miscellanousCharges ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleMiscChargesKeyDown}
              showTooltip={showMiscChargesTooltip}
              onToggleTooltip={toggleMiscChargesTooltip}
            />
            <HamaliChargesField 
              name="hamaliCharges" 
              label="Hamali Charges (₹)" 
              value={priceRate.hamaliCharges ?? ""} 
              onChange={handleNestedInputChange}
              onKeyDown={handleHamaliChargesKeyDown}
              showTooltip={showHamaliChargesTooltip}
              onToggleTooltip={toggleHamaliChargesTooltip}
            />
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-50/70 p-4 rounded-lg space-y-4 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-700 mt-1">Handling Charges</h4>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={toggleHandlingChargeUnitDropdown}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                          {handlingChargeUnit}
                          <ChevronDownIcon className="h-3 w-3" />
                        </button>
                        {showHandlingChargeUnitDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg">
                            {HANDLING_CHARGE_UNIT_OPTIONS.map(option => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  handleHandlingChargeUnitChange(option.value as "per kg" | "per box" | "per piece");
                                  setShowHandlingChargeUnitDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-slate-800 hover:bg-blue-100 focus:bg-blue-100 focus:outline-none"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleHandlingChargesTooltip}
                      className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
                      data-tooltip-container
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <RateTypeSwitch
                    isFixed={handlingRateType}
                    onToggle={() => {
                      setHandlingRateType(!handlingRateType);
                      // Clear the opposite field when switching
                      if (handlingRateType) {
                        // Switching from Fixed to Variable, clear fixed value
                        setPriceRate((prev: any) => ({
                          ...prev,
                          handlingCharges: { ...prev.handlingCharges, fixed: '' }
                        }));
                      } else {
                        // Switching from Variable to Fixed, clear variable value and minimum charge
                        setPriceRate((prev: any) => ({
                          ...prev,
                          handlingCharges: { ...prev.handlingCharges, variable: '', minimum: '' }
                        }));
                      }
                    }}
                  />
                </div>
                {showHandlingChargesTooltip && (
                  <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <div className="text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-800 mb-2">Handling Charges</h4>
                      <p className="mb-3">
                        Extra fees for special handling requirements like fragile items, hazardous materials, or oversized packages that need special care during transport.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleHandlingChargesTooltip}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {handlingRateType ? (
                  <HandlingChargesField 
                    name="handlingCharges.fixed" 
                    label="Fixed Rate (₹)" 
                    value={priceRate.handlingCharges?.fixed ?? ""} 
                    onChange={handleNestedInputChange} 
                    onKeyDown={(e) => handleChargeFixedKeyDown(e, 5000)} 
                    showTooltip={false}
                    onToggleTooltip={() => {}}
                  />
                ) : (
                  <>
                  <PercentageField 
                    name="handlingCharges.variable" 
                    label="Variable Rate (%)" 
                    value={priceRate.handlingCharges?.variable ?? ""} 
                    onChange={handleNestedInputChange} 
                    onSelectChange={(e) => {
                      setPriceRate((prev: any) => ({
                        ...prev,
                        handlingCharges: { ...prev.handlingCharges, variable: e.target.value }
                      }));
                    }}
                    onKeyDown={handleHandlingVariableKeyDown}
                    showDropdown={showHandlingVariableDropdown}
                    onToggleDropdown={toggleHandlingVariableDropdown}
                  />
                    <StyledInputField 
                      name="handlingCharges.minimum" 
                      label="Minimum Charge (₹)" 
                      type="text" 
                      value={priceRate.handlingCharges?.minimum ?? ""} 
                      onChange={handleNestedInputChange} 
                      onKeyDown={(e) => handleChargeFixedKeyDown(e, 5000)} 
                    />
                  </>
                )}
                  <StyledInputField name="handlingCharges.threshholdweight" label="Weight Threshold (Kg)" type="text" onChange={handleNestedInputChange} onKeyDown={handleHandlingWeightKeyDown} min={1} max={20000} />
              </div>
              <div className="bg-slate-50/70 p-4 rounded-lg space-y-4 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700 mt-1">ROV/FOV Charges</h4>
                    <button
                      type="button"
                      onClick={toggleRovChargesTooltip}
                      className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
                      data-tooltip-container
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <RateTypeSwitch
                    isFixed={rovRateType}
                    onToggle={() => {
                      setRovRateType(!rovRateType);
                      // Clear the opposite field when switching
                      if (rovRateType) {
                        // Switching from Fixed to Variable, clear fixed value
                        setPriceRate((prev: any) => ({
                          ...prev,
                          rovCharges: { ...prev.rovCharges, fixed: '' }
                        }));
                      } else {
                        // Switching from Variable to Fixed, clear variable value and minimum charge
                        setPriceRate((prev: any) => ({
                          ...prev,
                          rovCharges: { ...prev.rovCharges, variable: '', minimum: '' }
                        }));
                      }
                    }}
                  />
                </div>
                {showRovChargesTooltip && (
                  <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <div className="text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-800 mb-2">ROV/FOV Charges</h4>
                      <p className="mb-3">
                        Return on Value charges for items that need to be returned to the sender due to delivery failures, wrong addresses, or customer rejection.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleRovChargesTooltip}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {rovRateType ? (
                <ROVChargesField 
                  name="rovCharges.fixed" 
                  label="Fixed Rate (₹)" 
                  value={priceRate.rovCharges?.fixed ?? ""} 
                  onChange={handleNestedInputChange} 
                  onKeyDown={(e) => handleChargeFixedKeyDown(e, 5000)} 
                  showTooltip={false}
                  onToggleTooltip={() => {}}
                />
                ) : (
                <>
                <PercentageField 
                  name="rovCharges.variable" 
                  label="Variable Rate (%)" 
                  value={priceRate.rovCharges?.variable ?? ""} 
                  onChange={handleNestedInputChange} 
                  onSelectChange={(e) => {
                    setPriceRate((prev: any) => ({
                      ...prev,
                      rovCharges: { ...prev.rovCharges, variable: e.target.value }
                    }));
                  }}
                  onKeyDown={handlePercentageKeyDown}
                  showDropdown={showRovVariableDropdown}
                  onToggleDropdown={toggleRovVariableDropdown}
                />
                  <StyledInputField 
                    name="rovCharges.minimum" 
                    label="Minimum Charge (₹)" 
                    type="text" 
                    value={priceRate.rovCharges?.minimum ?? ""} 
                    onChange={handleNestedInputChange} 
                    onKeyDown={(e) => handleChargeFixedKeyDown(e, 5000)} 
                  />
                </>
                )}
                </div>
              <div className="bg-slate-50/70 p-4 rounded-lg space-y-4 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700 mt-1">COD/DOD Charges</h4>
                    <button
                      type="button"
                      onClick={toggleCodChargesTooltip}
                      className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
                      data-tooltip-container
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <RateTypeSwitch
                    isFixed={codRateType}
                    onToggle={() => {
                      setCodRateType(!codRateType);
                      // Clear the opposite field when switching
                      if (codRateType) {
                        // Switching from Fixed to Variable, clear fixed value
                        setPriceRate((prev: any) => ({
                          ...prev,
                          codCharges: { ...prev.codCharges, fixed: '' }
                        }));
                      } else {
                        // Switching from Variable to Fixed, clear variable value and minimum charge
                        setPriceRate((prev: any) => ({
                          ...prev,
                          codCharges: { ...prev.codCharges, variable: '', minimum: '' }
                        }));
                      }
                    }}
                  />
                </div>
                {showCodChargesTooltip && (
                  <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <div className="text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-800 mb-2">COD/DOD Charges</h4>
                      <p className="mb-3">
                        Cash on Delivery charges for collecting payment from the recipient at the time of delivery, including cash handling and payment processing fees.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleCodChargesTooltip}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {codRateType ? (
                <CODChargesField 
                  name="codCharges.fixed" 
                  label="Fixed Rate (₹)" 
                  value={priceRate.codCharges?.fixed ?? ""} 
                  onChange={handleNestedInputChange} 
                  onKeyDown={(e) => handleChargeFixedKeyDown(e, 2000)} 
                  showTooltip={false}
                  onToggleTooltip={() => {}}
                />
                ) : (
                <>
                <PercentageField 
                  name="codCharges.variable" 
                  label="Variable Rate (%)" 
                  value={priceRate.codCharges?.variable ?? ""} 
                  onChange={handleNestedInputChange} 
                  onSelectChange={(e) => {
                    setPriceRate((prev: any) => ({
                      ...prev,
                      codCharges: { ...prev.codCharges, variable: e.target.value }
                    }));
                  }}
                  onKeyDown={handlePercentageKeyDown}
                  showDropdown={showCodVariableDropdown}
                  onToggleDropdown={toggleCodVariableDropdown}
                />
                  <StyledInputField 
                    name="codCharges.minimum" 
                    label="Minimum Charge (₹)" 
                    type="text" 
                    value={priceRate.codCharges?.minimum ?? ""} 
                    onChange={handleNestedInputChange} 
                    onKeyDown={(e) => handleChargeFixedKeyDown(e, 2000)} 
                  />
                </>
                )}
              </div>
              <div className="bg-slate-50/70 p-4 rounded-lg space-y-4 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700 mt-1">To-Pay Charges</h4>
                    <button
                      type="button"
                      onClick={toggleTopayChargesTooltip}
                      className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
                      data-tooltip-container
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <RateTypeSwitch
                    isFixed={topayRateType}
                    onToggle={() => {
                      setTopayRateType(!topayRateType);
                      // Clear the opposite field when switching
                      if (topayRateType) {
                        // Switching from Fixed to Variable, clear fixed value
                        setPriceRate((prev: any) => ({
                          ...prev,
                          topayCharges: { ...prev.topayCharges, fixed: '' }
                        }));
                      } else {
                        // Switching from Variable to Fixed, clear variable value and minimum charge
                        setPriceRate((prev: any) => ({
                          ...prev,
                          topayCharges: { ...prev.topayCharges, variable: '', minimum: '' }
                        }));
                      }
                    }}
                  />
                </div>
                {showTopayChargesTooltip && (
                  <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <div className="text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-800 mb-2">To-Pay Charges</h4>
                      <p className="mb-3">
                        Charges for shipments where the recipient is responsible for paying the freight charges upon delivery, including payment collection and processing fees.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTopayChargesTooltip}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {topayRateType ? (
                <ToPayChargesField 
                  name="topayCharges.fixed" 
                  label="Fixed Rate (₹)" 
                  value={priceRate.topayCharges?.fixed ?? ""} 
                  onChange={handleNestedInputChange} 
                  onKeyDown={(e) => handleChargeFixedKeyDown(e, 2000)} 
                  showTooltip={false}
                  onToggleTooltip={() => {}}
                />
                ) : (
                <>
                <PercentageField 
                  name="topayCharges.variable" 
                  label="Variable Rate (%)" 
                  value={priceRate.topayCharges?.variable ?? ""} 
                  onChange={handleNestedInputChange} 
                  onSelectChange={(e) => {
                    setPriceRate((prev: any) => ({
                      ...prev,
                      topayCharges: { ...prev.topayCharges, variable: e.target.value }
                    }));
                  }}
                  onKeyDown={handlePercentageKeyDown}
                  showDropdown={showTopayVariableDropdown}
                  onToggleDropdown={toggleTopayVariableDropdown}
                />
                  <StyledInputField 
                    name="topayCharges.minimum" 
                    label="Minimum Charge (₹)" 
                    type="text" 
                    value={priceRate.topayCharges?.minimum ?? ""} 
                    onChange={handleNestedInputChange} 
                    onKeyDown={(e) => handleChargeFixedKeyDown(e, 2000)} 
                  />
                </>
                )}
              </div>
              <div className="bg-slate-50/70 p-4 rounded-lg space-y-4 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700 mt-1">Appointment Charges</h4>
                    <button
                      type="button"
                      onClick={toggleAppointmentChargesTooltip}
                      className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
                      data-tooltip-container
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <RateTypeSwitch
                    isFixed={appointmentRateType}
                    onToggle={() => {
                      setAppointmentRateType(!appointmentRateType);
                      // Clear the opposite field when switching
                      if (appointmentRateType) {
                        // Switching from Fixed to Variable, clear fixed value
                        setPriceRate((prev: any) => ({
                          ...prev,
                          appointmentCharges: { ...prev.appointmentCharges, fixed: '' }
                        }));
                      } else {
                        // Switching from Variable to Fixed, clear variable value and minimum charge
                        setPriceRate((prev: any) => ({
                          ...prev,
                          appointmentCharges: { ...prev.appointmentCharges, variable: '', minimum: '' }
                        }));
                      }
                    }}
                  />
                </div>
                {showAppointmentChargesTooltip && (
                  <div className="absolute z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <div className="text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-800 mb-2">Appointment Charges</h4>
                      <p className="mb-3">
                        Charges for scheduling specific delivery appointments with recipients, including time slot booking and delivery coordination fees.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleAppointmentChargesTooltip}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {appointmentRateType ? (
                <AppointmentChargesField 
                  name="appointmentCharges.fixed" 
                  label="Fixed Rate (₹)" 
                  value={priceRate.appointmentCharges?.fixed ?? ""} 
                  onChange={handleNestedInputChange} 
                  onKeyDown={(e) => handleChargeFixedKeyDown(e, 2000)} 
                  showTooltip={false}
                  onToggleTooltip={() => {}}
                />
                ) : (
                <>
                <PercentageField 
                  name="appointmentCharges.variable" 
                  label="Variable Rate (%)" 
                  value={priceRate.appointmentCharges?.variable ?? ""} 
                  onChange={handleNestedInputChange} 
                  onSelectChange={(e) => {
                    setPriceRate((prev: any) => ({
                      ...prev,
                      appointmentCharges: { ...prev.appointmentCharges, variable: e.target.value }
                    }));
                  }}
                  onKeyDown={handlePercentageKeyDown}
                  showDropdown={showAppointmentVariableDropdown}
                  onToggleDropdown={toggleAppointmentVariableDropdown}
                />
                  <StyledInputField 
                    name="appointmentCharges.minimum" 
                    label="Minimum Charge (₹)" 
                    type="text" 
                    value={priceRate.appointmentCharges?.minimum ?? ""} 
                    onChange={handleNestedInputChange} 
                    onKeyDown={(e) => handleChargeFixedKeyDown(e, 2000)} 
                  />
                </>
                )}
              </div>
          </div>
        </div>
        

        {/* Section 3: Saved Vendors Table */}
        <SavedVendorsTable 
          vendors={savedVendors} 
          onEdit={handleEditVendor}
          onDelete={handleDeleteVendor}
        />

        {/* Zone selection moved to /zone-price-matrix page */}

        {/* Next Button */}
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={() => {
              // Navigate to zone price matrix page
              window.location.href = '/zone-price-matrix';
            }}
            className="group inline-flex items-center justify-center gap-2 py-3 px-8 text-sm font-semibold tracking-wide rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-blue-500 transition-all ease-in-out duration-300"
          >
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Next: Configure Zones & Price Matrix
          </button>
        </div>
      </form> 
    </div>
  );
};

export default AddTiedUpCompany;

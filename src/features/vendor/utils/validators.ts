/**
 * Validation utilities and Zod schema for AddVendor v2
 * Centralizes all validation logic per the data contract
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVE VALIDATORS (can be used standalone)
// =============================================================================

/**
 * Validate phone number (India format)
 * Must be exactly 10 digits
 *
 * @param phone - Phone number string
 * @returns Error message or empty string if valid
 */
export const validatePhone = (phone: string): string => {
  if (!phone) return 'Phone number is required';
  if (!/^\d{10}$/.test(phone)) return 'Phone must be exactly 10 digits';
  return '';
};

/**
 * Validate email address
 * Basic RFC-ish pattern
 *
 * @param email - Email address string
 * @returns Error message or empty string if valid
 */
export const validateEmail = (email: string): string => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
  return '';
};

/**
 * Validate GST number
 * Must be exactly 15 characters with valid pattern
 *
 * @param gst - GST number string
 * @returns Error message or empty string if valid
 */
export const validateGST = (gst: string): string => {
  if (!gst) return ''; // GST is optional

  if (gst.length !== 15) {
    return 'GST must be exactly 15 characters';
  }

  const pattern = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!pattern.test(gst)) {
    return 'Invalid GST format';
  }

  return '';
};

/**
 * Validate pincode (India format)
 * Must be exactly 6 digits
 *
 * @param pincode - Pincode string
 * @returns Error message or empty string if valid
 */
export const validatePincode = (pincode: string): string => {
  if (!pincode) return 'Pincode is required';
  if (!/^\d{6}$/.test(pincode)) return 'Pincode must be exactly 6 digits';
  return '';
};

/**
 * Validate fuel surcharge percentage
 * Must be 0-40
 *
 * @param fuel - Fuel percentage (string or number)
 * @returns Error message or empty string if valid
 */
export const validateFuel = (fuel: string | number): string => {
  const n = Number(fuel);
  if (isNaN(n)) return 'Fuel surcharge must be a number';
  if (n < 0 || n > 40) return 'Fuel surcharge must be between 0 and 40';
  return '';
};

/**
 * Validate company name
 * 2-120 characters, letters, digits, space, . & - _
 *
 * @param name - Company name
 * @returns Error message or empty string if valid
 */
export const validateCompanyName = (name: string): string => {
  if (!name) return 'Company name is required';
  if (name.length < 2 || name.length > 120) {
    return 'Company name must be 2-120 characters';
  }
  if (!/^[a-zA-Z0-9\s.,&\-_]+$/.test(name)) {
    return 'Company name can only contain letters, numbers, space, . & - _';
  }
  return '';
};

/**
 * Validate contact person name
 * 2-80 characters
 *
 * @param name - Contact person name
 * @returns Error message or empty string if valid
 */
export const validateContactName = (name: string): string => {
  if (!name) return 'Contact person name is required';
  if (name.length < 2 || name.length > 80) {
    return 'Contact name must be 2-80 characters';
  }
  return '';
};

// =============================================================================
// ZOD SCHEMA (for comprehensive validation)
// =============================================================================

// Charges schema (all numbers >= 0)
const ChargesSchema = z.object({
  docketCharges: z.number().min(0, 'Docket charges must be >= 0'),
  minWeightKg: z.number().min(0, 'Min weight must be >= 0'),
  minCharges: z.number().min(0, 'Min charges must be >= 0'),
  hamaliCharges: z.number().min(0, 'Hamali charges must be >= 0'),
  handlingCharges: z.number().min(0, 'Handling charges must be >= 0'),
  rovCharges: z.number().min(0, 'ROV charges must be >= 0'),
  codCharges: z.number().min(0, 'COD charges must be >= 0'),
  toPayCharges: z.number().min(0, 'ToPay charges must be >= 0'),
  appointmentCharges: z.number().min(0, 'Appointment charges must be >= 0'),
  greenTax: z.number().min(0, 'Green tax must be >= 0'),
  miscCharges: z.number().min(0, 'Misc charges must be >= 0'),
  fuelSurchargePct: z
    .number()
    .min(0, 'Fuel surcharge must be >= 0')
    .max(40, 'Fuel surcharge must be <= 40'),
});

// Volumetric configuration schema
const VolumetricConfigSchema = z.object({
  unit: z.enum(['cm', 'inch'], {
    errorMap: () => ({ message: 'Unit must be cm or inch' }),
  }),
  divisor: z.number().positive('Divisor must be positive'),
  cftFactor: z.number().positive('CFT factor must be positive').optional(),
});

// Geo schema (pincode lookup result)
const GeoSchema = z.object({
  pincode: z
    .string()
    .length(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must be numeric'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
});

// Zone rates matrix schema
const ZoneRateMatrixSchema = z.record(
  z.string(),
  z.record(z.string(), z.number().min(0, 'Zone rate must be >= 0'))
);

// Main TemporaryTransporter schema
export const TemporaryTransporterSchema = z.object({
  ownerUserId: z.string().optional(), // Backend resolves from token
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(120, 'Company name must be at most 120 characters')
    .regex(
      /^[a-zA-Z0-9\s.,&\-_]+$/,
      'Company name can only contain letters, numbers, space, . & - _'
    ),
  contactPersonName: z
    .string()
    .min(2, 'Contact name must be at least 2 characters')
    .max(80, 'Contact name must be at most 80 characters'),
  vendorPhoneNumber: z
    .string()
    .length(10, 'Phone must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Phone must be numeric'),
  vendorEmailAddress: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  gstin: z
    .string()
    .length(15, 'GST must be exactly 15 characters')
    .regex(
      /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
      'Invalid GST format'
    )
    .optional()
    .or(z.literal('')),
  transportMode: z.enum(['road', 'air', 'rail', 'ship'], {
    errorMap: () => ({ message: 'Invalid transport mode' }),
  }),
  volumetric: VolumetricConfigSchema,
  charges: ChargesSchema,
  geo: GeoSchema,
  zoneRates: ZoneRateMatrixSchema,
  priceChartFileId: z.string().optional(),
  sources: z.object({
    createdFrom: z.literal('AddVendor v2'),
  }),
  status: z.enum(['draft', 'submitted']),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Export types derived from schema
export type TemporaryTransporter = z.infer<typeof TemporaryTransporterSchema>;
export type Charges = z.infer<typeof ChargesSchema>;
export type VolumetricConfig = z.infer<typeof VolumetricConfigSchema>;
export type Geo = z.infer<typeof GeoSchema>;
export type ZoneRateMatrix = z.infer<typeof ZoneRateMatrixSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate entire vendor object
 *
 * @param data - Vendor data to validate
 * @returns { success: boolean, errors?: Record<string, string> }
 */
export const validateVendor = (
  data: unknown
): { success: boolean; errors?: Record<string, string[]> } => {
  const result = TemporaryTransporterSchema.safeParse(data);

  if (result.success) {
    return { success: true };
  }

  // Flatten Zod errors to field-level messages
  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return { success: false, errors };
};

/**
 * Check if zone rates matrix is complete (no empty cells)
 *
 * @param zoneRates - Zone rates matrix
 * @returns Error message or empty string if valid
 */
export const validateZoneRatesCompleteness = (
  zoneRates: Record<string, Record<string, number>>
): string => {
  for (const [fromZone, toZones] of Object.entries(zoneRates)) {
    for (const [toZone, price] of Object.entries(toZones)) {
      if (price === undefined || price === null || isNaN(price)) {
        return `Missing rate for ${fromZone} → ${toZone}`;
      }
      if (price < 0) {
        return `Invalid rate for ${fromZone} → ${toZone} (must be >= 0)`;
      }
    }
  }
  return '';
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const TRANSPORT_MODES = [
  { value: 'road', label: 'Road', disabled: false },
  { value: 'air', label: 'Air - Coming Soon', disabled: true },
  { value: 'rail', label: 'Rail - Coming Soon', disabled: true },
  { value: 'ship', label: 'Ship - Coming Soon', disabled: true },
] as const;

export const VOLUMETRIC_DIVISOR_OPTIONS_CM = [
  2800, 3000, 3200, 3500, 3800, 4000, 4200, 4500, 4720, 4750, 5000, 5200, 5500,
  5800, 6000, 7000,
] as const;

export const CFT_FACTOR_OPTIONS = [4, 5, 6, 7, 8, 9, 10] as const;

export const FUEL_SURCHARGE_OPTIONS = [
  0, 5, 10, 15, 20, 25, 30, 35, 40,
] as const;

# AddVendor v2 — Production Implementation

## Overview

This is a complete rewrite of the AddVendor/AddTiedUpCompany page following modern React patterns with clean architecture, modular components, and comprehensive type safety.

## Architecture

```
src/features/vendor/
├── pages/
│   └── AddVendor.tsx                 # Main page orchestrator
├── components/
│   ├── CompanySection.tsx            # Company & contact info
│   ├── TransportSection.tsx          # Transport mode & volumetric config
│   ├── ChargesSection.tsx            # All charge fields
│   ├── ZoneRatesEditor.tsx           # Zone rate matrix editor
│   ├── PriceChartUpload.tsx          # File upload with drag-and-drop
│   └── SavedVendorsTable.tsx         # List of created vendors
├── hooks/
│   ├── useVendorBasics.ts            # Company/contact state & validation
│   ├── usePincodeLookup.ts           # Async pincode lookup with caching
│   ├── useVolumetric.ts              # Volumetric config (unit, divisor, CFT)
│   ├── useCharges.ts                 # Charge fields with numeric coercion
│   └── useZoneRates.ts               # Zone rate matrix management
├── services/
│   └── api.ts                        # HTTP client with typed responses
├── utils/
│   ├── validators.ts                 # Zod schema & validation functions
│   ├── numbers.ts                    # Numeric utilities (to2dp, normalize)
│   └── debug.ts                      # Gated debug logging
├── store/
│   └── draftStore.ts                 # localStorage draft persistence
└── index.ts                          # Module exports
```

## Data Contract

### TemporaryTransporter Schema

```typescript
interface TemporaryTransporter {
  ownerUserId?: string;
  companyName: string;                // 2-120 chars
  contactPersonName: string;          // 2-80 chars
  vendorPhoneNumber: string;          // 10 digits
  vendorEmailAddress: string;         // Valid email
  gstin?: string;                     // 15 chars (optional)

  transportMode: 'road' | 'air' | 'rail' | 'ship';

  volumetric: {
    unit: 'cm' | 'inch';
    divisor: number;                  // From VOLUMETRIC_DIVISOR_OPTIONS_CM
    cftFactor?: number;               // Optional, from CFT_FACTOR_OPTIONS
  };

  charges: {
    docketCharges: number;            // >= 0
    minWeightKg: number;              // >= 0
    minCharges: number;               // >= 0
    hamaliCharges: number;            // >= 0
    handlingCharges: number;          // >= 0
    rovCharges: number;               // >= 0
    codCharges: number;               // >= 0
    toPayCharges: number;             // >= 0
    appointmentCharges: number;       // >= 0
    greenTax: number;                 // >= 0
    miscCharges: number;              // >= 0
    fuelSurchargePct: number;         // 0-40
  };

  geo: {
    pincode: string;                  // 6 digits
    state: string;
    city: string;
  };

  zoneRates: Record<string, Record<string, number>>;  // FROM x TO matrix

  priceChartFileId?: string;          // Set by backend
  sources: { createdFrom: 'AddVendor v2' };
  status: 'draft' | 'submitted';
  createdAt?: string;
  updatedAt?: string;
}
```

## API Integration

### Endpoint

```
POST /api/transporter/addtiedupcompanies
```

### Request Format

```
Content-Type: multipart/form-data

Parts:
  - vendorJson: string (JSON.stringify of TemporaryTransporter)
  - priceChart: File (optional)
```

### Headers

```
Authorization: Bearer <token>
```

### Success Response

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "companyName": "...",
    // ... all fields
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "fieldErrors": {
    "fieldName": "Field-specific error"
  }
}
```

## Features

### 1. Pincode Autofill

- User enters 6-digit pincode
- Debounced API call (500ms)
- Caches results in localStorage (7 days)
- Falls back to manual entry on error
- Shows loading spinner during lookup

### 2. Form Validation

- **Live validation**: Errors show on blur
- **Submit validation**: All fields validated before submit
- **Zod schema**: Type-safe validation with detailed error messages
- **Field-level errors**: Displayed directly under each field

### 3. Draft Persistence

- Auto-saves to localStorage every 400ms
- Loads draft on page reload
- Clears on successful submit
- Separate keys for draft (`addVendorV2_draft`) and cache (`addVendorV2_cache`)

### 4. Zone Rate Matrix

- Interactive zone selection (FROM and TO zones)
- Grouped by regions (North, South, East, West, NE, Central)
- Live editing in table format
- Validation for completeness (no empty cells)
- Normalization to 2 decimal places

### 5. Price Chart Upload

- Drag-and-drop interface
- Accepts: PDF, Excel (.xls, .xlsx), CSV, images
- Max size: 10 MB
- Inline validation with clear error messages

### 6. Debug Logging

- Gated by `import.meta.env.DEV` or `localStorage.debug='1'`
- Logs at key steps:
  - Pincode lookup
  - Validation
  - Submit payload
  - API responses
- Format: `[AddVendor v2] [timestamp] [STEP] details`

## Usage

### Import and Use

```typescript
import { AddVendor } from '@/features/vendor';

// In your router
<Route path="/add-vendor" element={<AddVendor />} />
```

### Enable Debug Mode

```javascript
// In browser console
localStorage.setItem('debug', '1');
```

### Clear Draft

```javascript
// In browser console
localStorage.removeItem('addVendorV2_draft');
```

## Validation Rules

### Company Info

- **Company Name**: 2-120 chars, alphanumeric + space . & - _
- **Contact Name**: 2-80 chars
- **Phone**: Exactly 10 digits
- **Email**: Valid email format
- **GST**: 15 chars, pattern `[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]` (optional)

### Geo

- **Pincode**: Exactly 6 digits
- **State**: Required (auto-filled or manual)
- **City**: Required (auto-filled or manual)

### Charges

- All charges: >= 0, max 999999
- **Fuel Surcharge**: 0-40%
- All values stored with 2 decimal precision

### Zone Rates

- Matrix must be complete (no empty cells)
- All rates >= 0
- Values normalized to 2 decimal places

## Testing Checklist

- [x] Pincode `560001` → Bengaluru, Karnataka
- [x] Invalid pincode → Manual entry enabled
- [x] Paste `" 12.50 "` into charges → Stored as `12.5`
- [x] Fuel surcharge `45` → Error, `35` → OK
- [x] Empty zone rate cell → Save disabled
- [x] Submit with file → `vendorJson` + `priceChart` in FormData
- [x] Refresh mid-fill → Data restored from draft
- [x] No token → 401 → Toast + error message

## Performance

- **Draft writes**: Throttled to 400ms
- **Pincode lookup**: Debounced to 500ms
- **Cache**: In-memory + localStorage, expires after 7 days
- **Bundle size**: ~50KB (gzipped) for the feature

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Dependencies

- react 18.3+
- typescript 5.9+
- zod (for validation)
- react-hot-toast (for notifications)
- @heroicons/react (for icons)
- tailwindcss (for styling)

## Migration from v1

The old `AddVendor.tsx` (3,944 lines) has been replaced with this modular implementation. Key changes:

1. **Hooks**: State management extracted to custom hooks
2. **Components**: UI split into focused, reusable components
3. **Validation**: Centralized in Zod schema
4. **API**: Clean service layer with typed responses
5. **No keyboard traps**: Removed duplicate `onKeyDown` handlers
6. **Simplified charges**: No `{value, type, mode}` shapes, just numbers

## Troubleshooting

### "Session expired" error

- Token missing or invalid
- Check `localStorage.token` or cookies
- Re-login required

### Pincode not autofilling

- API endpoint may be down
- Manual entry is always available
- Check browser console for errors
- Enable debug mode to see API responses

### Zone rates not saving

- Ensure all cells are filled (no empty/NaN values)
- Click "Validate Matrix" to check
- Check browser console for validation errors

### Draft not restoring

- Check `localStorage.addVendorV2_draft`
- May be corrupted - clear and start fresh
- Enable debug mode to see draft load logs

## Future Enhancements

- [ ] CSV import/export for zone matrix
- [ ] Bulk upload multiple vendors
- [ ] Vendor templates (copy from existing)
- [ ] Advanced zone grouping (custom regions)
- [ ] Rate calculation preview
- [ ] Integration with approval workflow

## Support

For issues or questions, check:
- TypeScript errors: Run `npx tsc --noEmit`
- Runtime errors: Enable debug mode
- API errors: Check network tab in browser dev tools

---

**Built with ❤️ following production-grade React patterns**

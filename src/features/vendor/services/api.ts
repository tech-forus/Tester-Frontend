/**
 * API service layer for AddVendor v2
 * Handles all HTTP communication with typed contracts
 */

import { TemporaryTransporter } from '../utils/validators';
import { emitDebug, emitDebugError } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Success response from backend
 */
export interface ApiSuccessResponse {
  success: true;
  data: TemporaryTransporter & { _id: string };
}

/**
 * Error response from backend
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Pincode lookup response
 */
export interface PincodeLookupResponse {
  pincode: string;
  state: string;
  city: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// API base URL - use environment variable or fallback
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://tester-backend-4nxc.onrender.com';

/**
 * Get auth token from localStorage or cookies
 */
const getAuthToken = (): string | null => {
  // Try localStorage first
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (token) return token;

  // Try cookies as fallback
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token' || name === 'authToken') {
      return value;
    }
  }

  return null;
};

/**
 * Build headers with authorization
 */
const buildHeaders = (includeContentType: boolean = true): HeadersInit => {
  const headers: HeadersInit = {};

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Submit new vendor (Temporary Transporter)
 * POST /api/transporter/addtiedupcompanies
 *
 * @param vendor - Vendor data (without priceChartFileId)
 * @param priceChartFile - Optional price chart file
 * @returns Success or error response
 */
export const postVendor = async (
  vendor: Omit<TemporaryTransporter, 'priceChartFileId'>,
  priceChartFile?: File
): Promise<ApiSuccessResponse | ApiErrorResponse> => {
  try {
    emitDebug('API_POST_VENDOR_START', {
      companyName: vendor.companyName,
      hasPriceChart: !!priceChartFile,
    });

    // Build FormData
    const formData = new FormData();
    formData.append('vendorJson', JSON.stringify(vendor));

    if (priceChartFile) {
      formData.append('priceChart', priceChartFile);
      emitDebug('API_POST_VENDOR_FILE_ATTACHED', {
        fileName: priceChartFile.name,
        fileSize: priceChartFile.size,
        fileType: priceChartFile.type,
      });
    }

    // Make request (note: don't include Content-Type for multipart/form-data)
    const token = getAuthToken();
    if (!token) {
      emitDebugError('API_POST_VENDOR_NO_TOKEN');
      return {
        success: false,
        message: 'Authentication required. Please sign in.',
      };
    }

    const url = `${API_BASE}/api/transporter/addtiedupcompanies`;
    emitDebug('API_POST_VENDOR_REQUEST', { url });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    emitDebug('API_POST_VENDOR_RESPONSE', {
      status: response.status,
      statusText: response.statusText,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      if (response.status === 401) {
        emitDebugError('API_POST_VENDOR_UNAUTHORIZED');
        return {
          success: false,
          message: 'Session expired. Please sign in again.',
        };
      }

      let errorData: ApiErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          success: false,
          message: `Server error: ${response.status} ${response.statusText}`,
        };
      }

      emitDebugError('API_POST_VENDOR_ERROR', errorData);
      return errorData;
    }

    // Parse success response
    const data: ApiSuccessResponse = await response.json();
    emitDebug('API_POST_VENDOR_SUCCESS', {
      vendorId: data.data._id,
      companyName: data.data.companyName,
    });

    return data;
  } catch (error) {
    emitDebugError('API_POST_VENDOR_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Network error. Please try again.',
    };
  }
};

/**
 * Lookup pincode to get state and city
 * GET /api/geo/pincode/:pincode
 *
 * @param pincode - 6-digit pincode
 * @returns Pincode lookup result or null if not found
 */
export const getPincode = async (
  pincode: string
): Promise<PincodeLookupResponse | null> => {
  try {
    emitDebug('API_GET_PINCODE_START', { pincode });

    // Validate pincode format first
    if (!/^\d{6}$/.test(pincode)) {
      emitDebugError('API_GET_PINCODE_INVALID_FORMAT', { pincode });
      return null;
    }

    const url = `${API_BASE}/api/geo/pincode/${pincode}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    emitDebug('API_GET_PINCODE_RESPONSE', {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      emitDebugError('API_GET_PINCODE_NOT_FOUND', { pincode });
      return null;
    }

    const data: PincodeLookupResponse = await response.json();
    emitDebug('API_GET_PINCODE_SUCCESS', data);

    return data;
  } catch (error) {
    emitDebugError('API_GET_PINCODE_EXCEPTION', {
      pincode,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Fetch list of temporary transporters (for SavedVendorsTable)
 * GET /api/transporter/temporary
 *
 * @returns Array of temporary transporters
 */
export const getTemporaryTransporters = async (): Promise<
  Array<TemporaryTransporter & { _id: string }>
> => {
  try {
    emitDebug('API_GET_TEMP_TRANSPORTERS_START');

    const url = `${API_BASE}/api/transporter/temporary`;
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    emitDebug('API_GET_TEMP_TRANSPORTERS_RESPONSE', {
      status: response.status,
    });

    if (!response.ok) {
      emitDebugError('API_GET_TEMP_TRANSPORTERS_ERROR', {
        status: response.status,
      });
      return [];
    }

    const data = await response.json();
    emitDebug('API_GET_TEMP_TRANSPORTERS_SUCCESS', {
      count: data.length || 0,
    });

    return data;
  } catch (error) {
    emitDebugError('API_GET_TEMP_TRANSPORTERS_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

/**
 * Delete temporary transporter
 * DELETE /api/transporter/temporary/:id
 *
 * @param id - Transporter ID
 * @returns Success status
 */
export const deleteTemporaryTransporter = async (
  id: string
): Promise<boolean> => {
  try {
    emitDebug('API_DELETE_TEMP_TRANSPORTER_START', { id });

    const url = `${API_BASE}/api/transporter/temporary/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(),
    });

    emitDebug('API_DELETE_TEMP_TRANSPORTER_RESPONSE', {
      status: response.status,
    });

    if (!response.ok) {
      emitDebugError('API_DELETE_TEMP_TRANSPORTER_ERROR', {
        status: response.status,
      });
      return false;
    }

    emitDebug('API_DELETE_TEMP_TRANSPORTER_SUCCESS', { id });
    return true;
  } catch (error) {
    emitDebugError('API_DELETE_TEMP_TRANSPORTER_EXCEPTION', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

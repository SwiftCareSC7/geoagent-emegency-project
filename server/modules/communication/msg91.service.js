/**
 * MSG91 Flow API Provider Service
 * 
 * Implements transactional SMS dispatch using MSG91 Flow API (v5).
 * Endpoint: POST https://control.msg91.com/api/v5/flow (configurable via MSG91_API_URL)
 * 
 * Supports both production telecom dispatch and mock webhook testing.
 * Strictly avoids logging or exposing credentials.
 */

export class Msg91Service {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || process.env.MSG91_API_URL || 'https://control.msg91.com/api/v5/flow';
    this.authKey = options.authKey || process.env.MSG91_AUTH_KEY || '';
    this.flowId = options.flowId || process.env.MSG91_FLOW_ID || '';
    this.senderId = options.senderId || process.env.MSG91_SENDER_ID || '';
    this.providerMode = options.providerMode || process.env.MSG91_PROVIDER || 'real';
    this.timeoutMs = options.timeoutMs || 8000;
  }

  /**
   * Check if MSG91 service is configured with credentials
   * @returns {boolean}
   */
  isConfigured() {
    if (this.providerMode === 'mock') {
      return Boolean(this.apiUrl && (this.authKey || process.env.MSG91_MOCK_AUTH_KEY || 'mock-test-authkey'));
    }
    return Boolean(
      this.authKey &&
      this.authKey !== 'your_msg91_auth_key' &&
      this.flowId &&
      this.flowId !== 'your_msg91_flow_id'
    );
  }

  /**
   * Sanitize and format phone number for MSG91
   * E.164 format without '+'. Defaults to India (91) country code for 10-digit numbers.
   * 
   * @param {string} rawPhone 
   * @returns {string} Clean digits with country code
   */
  sanitizeMobileNumber(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') {
      const error = new Error('Invalid mobile number: Phone number must be a non-empty string');
      error.status = 400;
      error.isOperational = true;
      throw error;
    }

    // Strip all non-digit characters
    let digits = rawPhone.replace(/\D/g, '');

    // If starts with leading 0, strip it (common domestic prefix)
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }

    // Standard 10-digit Indian mobile number: prepend 91
    if (digits.length === 10) {
      digits = `91${digits}`;
    }

    // Must be at least 10 digits and not exceed 15 digits
    if (digits.length < 10 || digits.length > 15) {
      const error = new Error(`Invalid mobile number format: "${rawPhone}". Expected 10 to 15 digits with country code.`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }

    return digits;
  }

  /**
   * Dispatches transactional status SMS through MSG91 Flow API
   * 
   * @param {Object} params
   * @param {string} params.mobile Recipient mobile number
   * @param {string} params.vehicle Vehicle callsign (e.g. 'AMB-001')
   * @param {string} params.eta Estimated arrival time (e.g. '8 min')
   * @param {string} params.hospital Destination hospital name
   * @param {string} params.emergency Emergency identifier (e.g. 'EMG-0001')
   * @param {Object} [params.extraVariables] Additional template variables
   * @returns {Promise<Object>} Provider response result
   */
  async sendFlowSms({ mobile, vehicle, eta, hospital, emergency, extraVariables = {} }) {
    // 1. Validate inputs
    const cleanMobile = this.sanitizeMobileNumber(mobile);

    if (!vehicle || typeof vehicle !== 'string') {
      const error = new Error('Vehicle callsign is required for status SMS');
      error.status = 400;
      error.isOperational = true;
      throw error;
    }

    const effectiveProviderMode = process.env.MSG91_PROVIDER || this.providerMode || 'real';
    const effectiveEndpoint = process.env.MSG91_API_URL || this.apiUrl || 'https://control.msg91.com/api/v5/flow';
    const effectiveFlowId = process.env.MSG91_FLOW_ID || this.flowId || 'swiftcare_emergency_flow';
    const effectiveSender = process.env.MSG91_SENDER_ID || this.senderId || 'SWFCARE';
    const effectiveAuthKey = process.env.MSG91_AUTH_KEY || this.authKey || (effectiveProviderMode === 'mock' || effectiveEndpoint.includes('webhook.site') ? 'mock-test-authkey' : '');

    if (!effectiveAuthKey) {
      const error = new Error('MSG91_AUTH_KEY is not configured on the server');
      error.status = 503;
      error.code = 'PROVIDER_NOT_CONFIGURED';
      error.isOperational = true;
      throw error;
    }

    // 2. Build flow variables
    const variables = {
      vehicle: vehicle.trim(),
      eta: (eta || 'N/A').toString().trim(),
      hospital: (hospital || 'Tertiary Trauma Center').trim(),
      emergency: (emergency || 'Active Emergency').trim(),
      ...extraVariables
    };

    // 3. Construct MSG91 Flow API request payload
    // MSG91 v5 Flow API supports variables both as top-level properties and inside variables object
    const requestBody = {
      flow_id: effectiveFlowId,
      sender: effectiveSender,
      mobiles: cleanMobile,
      ...variables,
      variables
    };

    const endpoint = effectiveEndpoint;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': effectiveAuthKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      let responseData = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = { text: 'Invalid JSON response from SMS provider' };
        }
      } else {
        const textResponse = await response.text();
        responseData = { text: textResponse.slice(0, 200) };
      }

      // Check HTTP status code
      if (!response.ok) {
        let safeErrorMessage = responseData.message || responseData.msg || responseData.text || `HTTP ${response.status} ${response.statusText}`;
        
        // Ensure no credentials appear in error message
        if (typeof safeErrorMessage === 'string' && safeErrorMessage.includes(effectiveAuthKey)) {
          safeErrorMessage = safeErrorMessage.replace(effectiveAuthKey, '[REDACTED]');
        }

        const error = new Error(`MSG91 dispatch failed (${response.status}): ${safeErrorMessage}`);
        error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
        error.providerStatus = 'FAILED';
        error.providerResponse = responseData;
        error.isOperational = true;
        throw error;
      }

      // MSG91 returns type: 'error' or status: 'error' on business logic failure (e.g. invalid authkey/flow_id with HTTP 200)
      if (responseData.type === 'error' || responseData.status === 'error') {
        const safeErrorMessage = responseData.message || responseData.msg || 'MSG91 rejected flow request';
        const error = new Error(`MSG91 rejected request: ${safeErrorMessage}`);
        error.status = 422;
        error.providerStatus = 'FAILED';
        error.providerResponse = responseData;
        error.isOperational = true;
        throw error;
      }

      // Successful dispatch
      // Note: Flow API returns acknowledgment of submission to telecom network.
      // Delivery confirmation only happens if delivery webhook is received later.
      const isMock = this.providerMode === 'mock' || endpoint.includes('webhook.site');
      const messageId = responseData.message_id || responseData.request_id || responseData.id || `msg_${Date.now()}`;

      return {
        success: true,
        status: 'SUBMITTED',
        provider: isMock ? 'MOCK_WEBHOOK' : 'MSG91',
        message: isMock ? 'Mock SMS request accepted by webhook server' : 'SMS submitted to MSG91 flow successfully',
        messageId,
        recipient: cleanMobile.slice(0, 4) + '****' + cleanMobile.slice(-2), // Masked for security & privacy
        latencyMs,
        data: {
          flowId: effectiveFlowId,
          vehicle,
          eta,
          hospital,
          providerResponse: responseData
        }
      };
    } catch (err) {
      clearTimeout(timeout);

      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`MSG91 request timed out after ${this.timeoutMs}ms`);
        timeoutErr.status = 504;
        timeoutErr.providerStatus = 'FAILED';
        timeoutErr.isOperational = true;
        throw timeoutErr;
      }

      // Sanitize any accidental credential leaks from network error messages
      if (err.message && err.message.includes(effectiveAuthKey)) {
        err.message = err.message.replace(effectiveAuthKey, '[REDACTED]');
      }

      throw err;
    }
  }
}

// Export singleton default instance
const msg91Service = new Msg91Service();
export default msg91Service;

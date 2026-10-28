/**
 * Backend Service Module
 *
 * Provides high-level client functions for backend operations.
 */

import {
  backendService,
  checkBackendHealth,
  verifyDevPassword,
  fetchEngineParams,
  commitEngineParams,
  updateDevPassword,
} from './apiClient';

export {
  backendService,
  checkBackendHealth,
  verifyDevPassword,
  fetchEngineParams,
  commitEngineParams,
  updateDevPassword,
};
export default backendService;

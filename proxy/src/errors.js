function errorPayload(error, message, extra = {}) {
  return {
    error,
    message,
    ...extra
  };
}

function missingKey(key) {
  return errorPayload(
    "upstream_not_configured",
    `${key} is not configured on the proxy server.`
  );
}

function statusForProviderError(code) {
  return {
    upstream_not_configured: 503,
    bad_request: 400,
    upstream_forbidden: 502,
    upstream_timeout: 504,
    upstream_invalid_response: 502,
    invalid_upstream_response: 502,
    upstream_error: 502
  }[code] || 502;
}

module.exports = {
  errorPayload,
  missingKey,
  statusForProviderError
};

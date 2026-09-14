/** Convert provider failures to fixed, actionable copy; never echo provider details. */
export function googleOAuthErrorMessage(params: URLSearchParams) {
  const error = params.get("error")?.toLowerCase();
  const details = [
    error,
    params.get("error_code"),
    params.get("error_description"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/test user|access blocked|not approved/.test(details)) {
    return "This Google account is not approved for the current beta. Ask to be added as a test user, or use email sign-in.";
  }
  if (/invalid_client|client secret|redirect_uri_mismatch/.test(details)) {
    return "Google sign-in is temporarily unavailable. Use email sign-in while we check the connection.";
  }
  if (error === "access_denied") {
    return "Google sign-in was canceled. Try again when you’re ready, or use email sign-in.";
  }
  if (/duplicate key|users_email_unique/.test(details)) {
    return "We could not connect Google to this account. Use email sign-in or reset your password.";
  }
  return "Google sign-in could not finish. Try again or use email sign-in. New accounts may be unavailable while registration is paused or full.";
}

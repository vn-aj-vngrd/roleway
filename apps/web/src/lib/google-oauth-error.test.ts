import { expect, it } from "vitest";
import { googleOAuthErrorMessage } from "./google-oauth-error";

it.each([
  ["error=access_denied", "canceled"],
  ["error=access_denied&error_description=not+approved+test+user", "test user"],
  ["error=invalid_client", "temporarily unavailable"],
  ["error_description=redirect_uri_mismatch", "temporarily unavailable"],
  ["error_description=duplicate+key+users_email_unique", "reset your password"],
  ["error=unexpected&error_description=private-value", "could not finish"],
])("maps %s to safe recovery copy", (query, expected) => {
  const message = googleOAuthErrorMessage(new URLSearchParams(query));
  expect(message).toContain(expected);
  expect(message).not.toContain("private-value");
});

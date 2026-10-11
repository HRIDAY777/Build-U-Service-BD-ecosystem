# Bangla and English UI

The language preference controls page headings, navigation, form labels, placeholders, package descriptions, location options, district captions, dashboard status labels and shared-wishlist controls. It persists across navigation and reload. Product and category names use their existing paired Bangla/English fields. Known demo addresses have display translations; saved addresses are not rewritten.

Customer-entered names, addresses, notes, uploaded document content and original photo-author credits remain original. Backend/generated content needs paired content or an explicit translation entry; this is not automatic machine translation.

Verification: 26 public route families were checked in English and switched to Bangla with reload. The same route audit runs with a customer session. Additional checks cover product details, service booking, district photo captions, provider/rider workspace status options (mocked profiles), event package selections in operations, and existing language, event-package, location cascade and wishlist-share workflows. Role mocks validate display language, not role authorization.

Regression tests: frontend/tests/site-language.spec.ts, language-workspaces.spec.ts, language.spec.ts.

This coverage does not imply production deployment, translation of arbitrary customer content, or verification of every possible live notification and validation response.

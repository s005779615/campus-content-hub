source visual truth path: D:\Users\86139\Documents\校园获客\qa-mobile-login-final.png
implementation screenshot path: D:\Users\86139\Documents\校园获客\.qa\implementation-login-mobile.png
viewport: 390 x 844
state: unauthenticated mobile login; protected application screens require an authenticated session

full-view comparison evidence:
- The saved mobile target keeps a single-column login form, large touch controls, strong black/white hierarchy, and three compact capability summaries.
- The production login remains the available visual reference.
- The local implementation cannot render the login screen because local Supabase values are intentionally blank placeholders. It shows the configuration guard instead.

focused region comparison evidence:
- Login form spacing and controls could not be compared against the local implementation because the configuration guard blocks rendering.
- Authenticated dashboard, assignment, task, and feedback screens could not be captured without transmitting stored login credentials or creating a test account.

findings:
- [P1] Protected UI visual QA is blocked by missing local Supabase configuration and no authorized application login session.
- [P2] The mobile login implementation cannot be screenshot-compared locally until valid non-production Supabase test values are available.
- Build-time responsive structure was checked in code: cards collapse to one column, forms use full-width controls, and primary task actions retain at least 40px touch height.

patches made since the previous QA pass:
- Replaced desktop task table with responsive workflow cards.
- Added mobile-first quick actions to the member dashboard.
- Simplified roles to administrator and campus owner.
- Kept the existing monochrome tokens, typography, radii, icon library, and form controls.

final result: blocked

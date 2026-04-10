import type { GettingStartedSection } from './types';

export const dashboardGuide: GettingStartedSection = {
  id: 'dashboard-guide',
  title: 'Dashboard Guide',
  icon: 'LayoutDashboard',
  steps: [
    {
      heading: 'Account & Authentication',
      content:
        'Account registration, login, password management, and email verification are all handled through the TranscodeFlow dashboard. These are internal operations for the web dashboard and are not part of the developer-facing API.\n\nAs an API developer, you only need your API key \u2014 no JWT tokens or login flows are required to use the API.',
      codeExample: null,
    },
    {
      heading: 'Managing API Keys',
      content:
        'API keys are created and managed through the dashboard Settings page:\n\n- **Create a key:** Navigate to Settings and click "Create Key". Give it a descriptive name and copy it immediately \u2014 the full key is only shown once.\n- **Key format:** All keys start with the prefix `vf_` followed by a random string.\n- **View keys:** The Settings page lists all active keys with their names, creation dates, and last-used timestamps.\n- **Revoke a key:** Click delete on any key to revoke it immediately. Any requests using that key will be rejected.\n\nKeep your keys secure \u2014 treat them like passwords. Avoid committing them to source control.',
      codeExample: null,
    },
    {
      heading: 'Webhook Settings',
      content:
        'Configure your default webhook URL and signing secret from the dashboard Settings page:\n\n- **Default webhook URL:** This URL receives notifications for all jobs unless you override it with the `webhook_url` parameter on a per-job basis.\n- **Signing secret:** Used to verify that webhook payloads came from TranscodeFlow. Compute an HMAC-SHA256 of the raw request body using this secret and compare it to the signature header.\n- **Regenerate secret:** If your secret is compromised, regenerate it from Settings. The new secret takes effect immediately.\n\nFor details on implementing a webhook receiver, see the Webhooks Guide section.',
      codeExample: null,
    },
    {
      heading: 'Usage & Billing',
      content:
        'Monitor your usage from the dashboard:\n\n- Total jobs submitted and their status breakdown (completed, failed, pending)\n- Storage used by uploaded and transcoded files\n- Processing time consumed\n\nUsage statistics are also available programmatically via the Usage & Stats API endpoint below.',
      codeExample: null,
    },
  ],
};

import type { DocsConfig } from './types';
import { meta } from './meta';
import { gettingStarted } from './getting-started';
import { workflowOverview } from './workflow-overview';
import { dashboardGuide } from './dashboard-guide';
import { webhooksGuide } from './webhooks-guide';
import { jobs } from './jobs';
import { uploads } from './uploads';
import { usage } from './usage';

export type { DocsConfig, DocSection, EndpointEntry, ParamEntry, CodeExample, GettingStartedSection, GettingStartedStep, HttpMethod, AuthType, ParamLocation, CodeLanguage } from './types';
export { meta } from './meta';
export { gettingStarted } from './getting-started';
export { workflowOverview } from './workflow-overview';
export { dashboardGuide } from './dashboard-guide';
export { webhooksGuide } from './webhooks-guide';
export { jobs } from './jobs';
export { uploads } from './uploads';
export { usage } from './usage';

const docsConfig: DocsConfig = {
  meta,
  gettingStarted,
  guideSections: [
    workflowOverview,
    dashboardGuide,
    webhooksGuide,
  ],
  sections: [
    uploads,
    jobs,
    usage,
  ],
};

export default docsConfig;

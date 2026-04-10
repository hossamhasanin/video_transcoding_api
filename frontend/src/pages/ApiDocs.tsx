import React from 'react';
import { BookOpen } from 'lucide-react';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useActiveSection } from '../hooks/useActiveSection';
import SectionHeading from '../components/docs/SectionHeading';
import EndpointCard from '../components/docs/EndpointCard';
import CodeBlock from '../components/docs/CodeBlock';
import DocsSidebar from '../components/docs/DocsSidebar';
import docsConfig from '../data/docs';
import type { GettingStartedStep } from '../data/docs';

/** Convert **bold** markdown in static curated content to <strong> elements. */
function renderContent(text: string): React.ReactNode {
  // Split on **...** boundaries, wrap every odd index in <strong>
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return React.createElement(
    React.Fragment,
    null,
    ...parts.map((part, i) => (i % 2 === 1 ? React.createElement('strong', { key: i }, part) : part)),
  );
}

function StepCard({ step }: { step: GettingStartedStep }): React.ReactElement {
  return (
    <div className="bg-surface-raised rounded-xl border border-border shadow-card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-2">{step.heading}</h3>
      <p className="text-text-secondary mb-4 whitespace-pre-line">{renderContent(step.content)}</p>
      {step.codeExample && (
        <CodeBlock
          code={step.codeExample.code}
          language={step.codeExample.language}
          label={step.codeExample.label}
        />
      )}
    </div>
  );
}

export default function ApiDocs(): React.ReactElement {
  useDocumentHead(docsConfig.meta.title);

  const { gettingStarted, guideSections } = docsConfig;

  // Build section IDs: getting-started + guide sections + all API section IDs
  const allSectionIds = [
    gettingStarted.id,
    ...guideSections.map((s) => s.id),
    ...docsConfig.sections.map((s) => s.id),
  ];

  // Build sidebar items: getting-started + guide sections + API sections
  const sidebarSections = [
    { id: gettingStarted.id, title: gettingStarted.title, icon: gettingStarted.icon ?? 'Rocket' },
    ...guideSections.map((s) => ({ id: s.id, title: s.title, icon: s.icon ?? 'FileText' })),
    ...docsConfig.sections.map((s) => ({ id: s.id, title: s.title, icon: s.icon })),
  ];

  const { activeSection, scrollToSection } = useActiveSection({
    sectionIds: allSectionIds,
  });

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface-raised p-4 sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto">
        <DocsSidebar
          sections={sidebarSections}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
        />
      </aside>

      {/* Mobile horizontal nav — fixed below the top bar */}
      <div className="md:hidden fixed top-[57px] left-0 right-0 z-10 bg-surface-raised border-b border-border px-4 py-2">
        <DocsSidebar
          sections={sidebarSections}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
          variant="horizontal"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 md:p-10 pt-20 md:pt-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen size={28} className="text-accent" />
              <h1 className="text-3xl font-bold text-text-primary">API Documentation</h1>
            </div>
            <p className="text-text-secondary text-lg">
              Complete reference for the TranscodeFlow video transcoding API. Authenticate, submit jobs, and integrate with your application.
            </p>
          </div>

          {/* Getting Started */}
          <section className="mb-12">
            <SectionHeading
              id={gettingStarted.id}
              title={gettingStarted.title}
              description="Follow these steps to start using the TranscodeFlow API in minutes."
              icon={gettingStarted.icon ?? 'Rocket'}
            />
            <div className="space-y-8">
              {gettingStarted.steps.map((step, idx) => (
                <StepCard key={idx} step={step} />
              ))}
            </div>
          </section>

          {/* Guide Sections (Workflow Overview, Dashboard Guide, Webhooks Guide) */}
          {guideSections.map((guide) => (
            <section key={guide.id} className="mb-12">
              <SectionHeading
                id={guide.id}
                title={guide.title}
                description=""
                icon={guide.icon ?? 'FileText'}
              />
              <div className="space-y-8">
                {guide.steps.map((step, idx) => (
                  <StepCard key={idx} step={step} />
                ))}
              </div>
            </section>
          ))}

          {/* API Reference Sections */}
          <div className="space-y-12">
            {docsConfig.sections.map((section) => (
              <section key={section.id}>
                <SectionHeading
                  id={section.id}
                  title={section.title}
                  description={section.description}
                  icon={section.icon}
                />
                <div className="space-y-6">
                  {section.endpoints.map((endpoint, idx) => (
                    <EndpointCard key={`${endpoint.method}-${endpoint.path}-${idx}`} endpoint={endpoint} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

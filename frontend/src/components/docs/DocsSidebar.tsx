import React from 'react';
import * as lucideIcons from 'lucide-react';

interface DocsSidebarSection {
  id: string;
  title: string;
  icon: string;
}

interface DocsSidebarProps {
  sections: DocsSidebarSection[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  /** 'vertical' for desktop sidebar, 'horizontal' for mobile top nav */
  variant?: 'vertical' | 'horizontal';
}

function getIcon(name: string, size: number = 16): React.ReactElement | null {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return null;
  return <Icon size={size} className="shrink-0" />;
}

export default function DocsSidebar({
  sections,
  activeSection,
  onSectionClick,
  variant = 'vertical',
}: DocsSidebarProps): React.ReactElement {
  const isHorizontal = variant === 'horizontal';

  return (
    <nav
      className={isHorizontal
        ? 'overflow-x-auto -mx-4 px-4'
        : 'overflow-y-auto'
      }
      aria-label="Documentation sections"
    >
      <ul className={isHorizontal
        ? 'flex gap-2 list-none p-0 m-0 pb-2'
        : 'space-y-1 list-none p-0 m-0'
      }>
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <li key={section.id} className={isHorizontal ? 'shrink-0' : ''}>
              <button
                type="button"
                onClick={() => onSectionClick(section.id)}
                className={isHorizontal
                  ? `flex items-center gap-1.5 whitespace-nowrap text-sm font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary border border-border'
                  }`
                  : `w-full flex items-center gap-2 text-left text-sm font-medium rounded-lg px-3 py-2 transition-colors border-none cursor-pointer ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  }`
                }
              >
                {getIcon(section.icon, isHorizontal ? 14 : 16)}
                {section.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

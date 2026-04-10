import React from 'react';
import { Link as LinkIcon } from 'lucide-react';
import * as lucideIcons from 'lucide-react';

interface SectionHeadingProps {
  id: string;
  title: string;
  description: string;
  icon: string;
}

function getIcon(name: string): React.ReactElement | null {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return null;
  return <Icon size={22} className="text-accent shrink-0" />;
}

export default function SectionHeading({ id, title, description, icon }: SectionHeadingProps): React.ReactElement {
  return (
    <div id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 group mb-2">
        {getIcon(icon)}
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <a
          href={`#${id}`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-text-tertiary hover:text-accent"
          aria-label={`Link to ${title} section`}
        >
          <LinkIcon size={18} />
        </a>
      </div>
      <p className="text-text-secondary mb-6">{description}</p>
    </div>
  );
}

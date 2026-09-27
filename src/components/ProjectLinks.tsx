import type { Project } from '../data/content'

// External links for a project, in the order a visitor would want them.
export default function ProjectLinks({ project, className = '' }: { project: Project; className?: string }) {
  const links = [
    project.live && { href: project.live, label: 'Live site', accent: true },
    project.video && { href: project.video, label: 'Watch demo', accent: true },
    project.code && { href: project.code, label: 'Code', accent: false },
  ].filter(Boolean) as { href: string; label: string; accent: boolean }[]

  return (
    <p className={`flex flex-wrap gap-x-5 gap-y-2 type-label ${className}`}>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className={`link-underline ${l.accent ? 'text-green' : ''}`}
        >
          {l.label} ↗
        </a>
      ))}
    </p>
  )
}

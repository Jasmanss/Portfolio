import type { Project } from '../data/content'

// External links for a project, in the order a visitor would want them.
export default function ProjectLinks({ project, className = '' }: { project: Project; className?: string }) {
  const links = [
    project.live && { href: project.live, label: 'Live site', accent: true },
    project.video && { href: project.video, label: 'Watch demo', accent: true },
    project.code && { href: project.code, label: 'Code', accent: false },
  ].filter(Boolean) as { href: string; label: string; accent: boolean }[]

  return (
    <p className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className={`underline underline-offset-4 hover:text-flame ${l.accent ? 'text-flame' : ''}`}
        >
          {l.label} ↗
        </a>
      ))}
    </p>
  )
}

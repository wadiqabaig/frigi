import { useId, useState } from 'react'
import { cx } from '../lib/format'

const O = '#31170E'

/** Shown when a recipe has no image or it fails to load: an empty plate on Frigi's gingham mat. */
export function RecipePlaceholder({ title, className }: { title: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 240 200" className={cx('block', className)} role="img" aria-label={`No photo available for ${title}`}>
      <defs>
        <pattern id={`g${id}`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="24" height="24" fill="#F2E5D3" />
          <rect width="12" height="24" fill="#E8D5BC" opacity=".55" />
          <rect width="24" height="12" fill="#E8D5BC" opacity=".55" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="240" height="200" fill={`url(#g${id})`} />
      <ellipse cx="124" cy="110" rx="74" ry="68" fill={O} opacity=".1" />
      <circle cx="120" cy="100" r="70" fill="#FFFFFF" stroke={O} strokeWidth="2" />
      <circle cx="120" cy="100" r="54" fill="#FFFFFF" stroke="#F2E5D3" strokeWidth="3" />
      <path d="M34 54v26a8 8 0 0 0 8 8v62M28 54v22M40 54v22" stroke={O} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M206 54c-10 8-14 22-10 40h10v56" stroke={O} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="#FFFFFF" />
    </svg>
  )
}

/** A recipe photo from the API with a loading shimmer and a consistent placeholder. */
export function RecipeImage({ src, title, className, imgClassName }: { src: string | null; title: string; className?: string; imgClassName?: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>(src ? 'loading' : 'failed')
  const [shown, setShown] = useState(src)
  if (shown !== src) { setShown(src); setState(src ? 'loading' : 'failed') }

  return (
    <div className={cx('relative overflow-hidden bg-cream-50', className)}>
      {state === 'failed' || !src ? (
        <RecipePlaceholder title={title} className="h-full w-full" />
      ) : (
        <>
          {state === 'loading' && <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-br from-cream-50 via-cream to-cream-50" />}
          <img
            src={src}
            alt={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setState('ok')}
            onError={() => setState('failed')}
            className={cx('h-full w-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0', imgClassName)}
          />
        </>
      )}
    </div>
  )
}

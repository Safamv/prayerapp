import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { BackAction } from '../../components/NavyHeader'
import { strings } from '../../strings'

/**
 * The back chevron on a pushed screen: one step back, whatever that step was.
 *
 * Design-tokens 5.1 puts a back chevron on both compact header variants and
 * scope 6.1 describes Discover as a drill-in, so going back has to mean "the
 * screen I came from" rather than a fixed parent. A reader who reaches a passage
 * from a category expects the category back; when browse by author and search
 * arrive (scope 6.1, 6.3, both `[v1.0]`) they will expect those back instead,
 * and a hard-coded parent would send all three to the same place.
 *
 * ## The one case history cannot answer
 *
 * A passage opened from a cold start - a shared link, a reload on that URL, the
 * app restored onto that screen - has nothing behind it, and stepping back would
 * leave the app entirely. React Router marks that first entry with the key
 * `default`, so the fallback path is used instead and back means "up one level".
 */
export function useBack(fallback: string): BackAction {
  const navigate = useNavigate()
  const location = useLocation()
  const isFirstEntry = location.key === 'default'

  const onClick = useCallback(() => {
    if (isFirstEntry) {
      void navigate(fallback, { replace: true })
      return
    }
    void navigate(-1)
  }, [navigate, fallback, isFirstEntry])

  return { label: strings.accessibility.back, onClick }
}

import {
  IconBookmarks,
  IconBrandWikipedia,
  IconMapCheck,
  IconMessages,
  IconStarHalfFilled,
  IconTag,
} from "@tabler/icons-react"
import type { LinkType } from "@/types"

const linkTypeIconMap = {
  guide: IconMapCheck,
  wiki: IconBrandWikipedia,
  review: IconStarHalfFilled,
  forum: IconMessages,
  store: IconTag,
  other: IconBookmarks,
} satisfies Record<LinkType, typeof IconBookmarks>

interface LinkTypeIconProps {
  linkType: LinkType | string | null | undefined
  className?: string
}

function normalizeLinkType(linkType: LinkType | string | null | undefined): LinkType {
  if (typeof linkType !== "string") return "other"

  const normalized = linkType.trim().toLowerCase()
  if (normalized in linkTypeIconMap) {
    return normalized as LinkType
  }

  return "other"
}

export function LinkTypeIcon({ linkType, className }: LinkTypeIconProps) {
  const Icon = linkTypeIconMap[normalizeLinkType(linkType)] ?? IconBookmarks
  return <Icon className={className} stroke={1.75} />
}

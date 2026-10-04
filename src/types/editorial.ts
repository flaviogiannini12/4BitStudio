export type EditorialAccount = 'casaro' | 'autoscuola_susa'
export type EditorialPlatform = 'fb_ig' | 'tiktok' | 'youtube' | 'whatsapp'
export type EditorialStatus = 'idea' | 'to_produce' | 'in_progress' | 'review' | 'ready' | 'scheduled' | 'published' | 'archived'

export interface EditorialItem {
  id: string
  workspaceId: string
  account: EditorialAccount
  platform: EditorialPlatform
  contentType: string
  title: string
  description: string
  hook: string
  script: string
  caption: string
  hashtags: string
  cta: string
  objective: string
  status: EditorialStatus
  assigneeId: string | null
  supportMemberIds: string[]
  publishDate: string | null
  publishTime: string | null
  publishedAt: string | null
  archivedAt: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface EditorialStep {
  id: string
  workspaceId: string
  editorialItemId: string
  label: string
  ownerMemberId: string | null
  done: boolean
  sortOrder: number
  createdAt: string
}

export interface EditorialAsset {
  id: string
  workspaceId: string
  editorialItemId: string
  fileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  assetRole: string
  uploadedBy: string
  createdAt: string
}

export interface EditorialData {
  items: EditorialItem[]
  steps: EditorialStep[]
  assets: EditorialAsset[]
}

export interface EditorialItemInput {
  account: EditorialAccount
  platform: EditorialPlatform
  contentType: string
  title: string
  description?: string
  hook?: string
  script?: string
  caption?: string
  hashtags?: string
  cta?: string
  objective?: string
  status?: EditorialStatus
  assigneeId?: string | null
  supportMemberIds?: string[]
  publishDate?: string | null
  publishTime?: string | null
  sortOrder?: number
}

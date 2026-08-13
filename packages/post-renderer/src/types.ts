export type Layout = 'band' | 'specimen' | 'sequence'

export type Template = {
  id: string
  name: string
  layout: Layout
  accent: string
  onColor: string
  tint: string
  tint2: string
}

export type FigureData = {
  h: string
  w: string
  margin: string
  caption: string
  label: string
  note: string
  imageUrl?: string | null
}

export type SectionData = {
  h: string
  p: string
  fig?: FigureData
}

export type PostRenderData = {
  title: string
  lead?: string
  heroImageUrl?: string | null
  heroCaption?: string
  sections: SectionData[]
}

export interface Vehicle {
  id: string
  categoryId?: string | null
  brand?: string
  model?: string
  series?: string
  seats: number
  price?: number
  image: string
  colorLabel?: string
  modelChoiceLabel?: string
  imageClass?: string
  doubleImage?: boolean
  selectable?: boolean
  modelChoice?: boolean
}

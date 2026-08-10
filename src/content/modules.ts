import { garden } from '../design/tokens'

export type ModuleLayout = 'band' | 'specimen' | 'sequence'
export type EntryKind = 'note' | 'essay' | 'ref' | 'log'

export type Entry = {
  n: string
  /** English title — the one that gets set in Playfair */
  en: string
  /** Vietnamese description underneath */
  vi: string
  kind: EntryKind
  date: string
}

export type Module = {
  id: string
  title: string
  /** the module's colour block */
  accent: string
  /** text colour that sits on `accent` */
  on: string
  tint: string
  tint2: string
  layout: ModuleLayout
  concept: string
  blurb: string
  long: string
  treatment: string
  layoutNote: string
  shot1: string
  shot2: string
  shot3: string
  entries: Entry[]
}

export const modules: Module[] = [
  {
    id: 'sensory',
    title: 'sensory',
    accent: garden.blush,
    on: '#3B2A2B',
    tint: garden.petalTint,
    tint2: garden.petalTint2,
    layout: 'band',
    concept: 'flavor',
    blurb: 'Cách con người cảm nhận hương vị, và cách gọi tên nó.',
    long: 'Từ sinh lý học của vị giác, khứu giác đến bộ từ vựng dùng để mô tả một tách cà phê. Theme hình ảnh: hương vị ở cự ly gần — lát trái cây, cánh hoa, tinh thể đường, bề mặt ướt.',
    treatment:
      'Hồng cánh hoa làm nền khối lớn, ảnh đặt trên nền kem để bật ra. Vật thể đơn, ánh sáng ban ngày.',
    layoutNote:
      'Band — khối màu phủ đầu trang, một ảnh ngang lớn, danh mục hai cột kèm thumbnail.',
    shot1: 'macro hương vị — lát cam cắt ngang',
    shot2: 'cánh hoa khô, nền kem',
    shot3: 'bề mặt ướt — giọt trên vỏ quả',
    entries: [
      { n: '01', en: 'Senses of Flavors', vi: 'Năm giác quan cùng tham gia vào một ngụm cà phê', kind: 'note', date: '2026.05' },
      { n: '02', en: 'Taste Perception', vi: 'Ngưỡng cảm nhận, và cách vị giác đánh lừa ta', kind: 'essay', date: '2026.04' },
      { n: '03', en: 'Sensory Lexicon', vi: 'Bộ từ vựng mô tả hương vị và giới hạn của nó', kind: 'ref', date: '2026.03' },
      { n: '04', en: 'Cupping Form', vi: 'Đọc bảng điểm cupping như đọc một biểu đồ', kind: 'note', date: '2026.02' },
      { n: '05', en: 'Flavor as Human Sense', vi: 'Hương vị là ký ức hay là hoá học', kind: 'essay', date: '2026.01' },
      { n: '06', en: 'sens.ercise', vi: 'Bài tập rèn khứu giác hằng tuần', kind: 'log', date: '2025.12' },
    ],
  },
  {
    id: 'biochem',
    title: 'biochemistry 101',
    accent: garden.leaf,
    on: '#1F3323',
    tint: garden.leafTint,
    tint2: garden.leafTint2,
    layout: 'specimen',
    concept: 'structure',
    blurb: 'Hạt cà phê nhìn từ bên trong: cấu trúc, hợp chất, phản ứng.',
    long: 'Sáu bài ngắn về thành phần hoá học của hạt nhân xanh và những gì xảy ra khi chúng gặp nhiệt. Theme hình ảnh: mặt cắt — quả chín bổ đôi, nhân trong lớp nhầy, thớ tế bào phóng đại.',
    treatment:
      'Xanh lá non cạnh xanh rêu đậm. Chụp thẳng góc, ánh sáng phẳng, vật thể đặt giữa khung.',
    layoutNote:
      'Specimen — khối màu chiếm nửa trái, nửa phải là lưới ảnh vuông; bài viết xếp thành khay ba cột.',
    shot1: 'mặt cắt — quả chín bổ đôi',
    shot2: 'nhân xanh chụp từ trên, nền rêu',
    shot3: 'thớ tế bào phóng đại',
    entries: [
      { n: '01', en: 'Bean Composition', vi: 'Thành phần hoá học của một hạt nhân xanh', kind: 'note', date: '2026.04' },
      { n: '02', en: 'Cell Wall: Lignin', vi: 'Cấu trúc gỗ hoá quyết định độ giòn khi rang', kind: 'note', date: '2026.03' },
      { n: '03', en: 'Chlorogenic Acids (CGA)', vi: 'Nguồn gốc của vị chát và phần lớn vị chua', kind: 'essay', date: '2026.02' },
      { n: '04', en: 'Carbohydrates', vi: 'Đường, polysaccharide và cái ngọt ở hậu vị', kind: 'note', date: '2026.01' },
      { n: '05', en: 'Lipids in Beans', vi: 'Chất béo, thể chất của nước, và sự ôi hoá', kind: 'note', date: '2025.12' },
      { n: '06', en: 'Melanoidins', vi: 'Sản phẩm cuối của Maillard và màu nâu của nước', kind: 'ref', date: '2025.11' },
    ],
  },
  {
    id: 'roasting',
    title: 'roasting',
    accent: garden.apricot,
    on: '#3B2E19',
    tint: garden.honeyTint,
    tint2: garden.honeyTint2,
    layout: 'sequence',
    concept: 'process',
    blurb: 'Nhiệt, thời gian, và những gì đọc được từ một đường cong.',
    long: 'Nhiệt đi vào hạt bằng cách nào, mỗi giai đoạn làm gì, và cách ghi lại một mẻ rang để lần sau lặp được. Theme hình ảnh: quá trình và biến đổi — dải màu hạt chuyển dần, khói mảnh, mặt đồng hồ nhiệt.',
    treatment: 'Mơ chín chuyển dần sang nâu quế theo trình tự rang — màu tự nó kể quá trình.',
    layoutNote:
      'Sequence — tiêu đề cực lớn trên khối mơ, dải bốn ảnh chuyển màu, danh mục là hàng đánh số lớn.',
    shot1: 'dải hạt chuyển màu theo mức rang',
    shot2: 'trang log rang viết tay',
    shot3: 'khói mảnh trên nền sáng',
    entries: [
      { n: '01', en: 'Heat Transfer', vi: 'Ba đường nhiệt đi vào hạt: dẫn, đối lưu, bức xạ', kind: 'note', date: '2026.05' },
      { n: '02', en: 'Drying Phase', vi: 'Giai đoạn thoát ẩm, và vì sao đừng vội', kind: 'note', date: '2026.04' },
      { n: '03', en: 'Maillard Stage', vi: 'Nơi phần lớn hương thơm được sinh ra', kind: 'essay', date: '2026.03' },
      { n: '04', en: 'First Crack & Development', vi: 'Đo thời gian phát triển bằng gì cho đúng', kind: 'note', date: '2026.02' },
      { n: '05', en: 'Roast Defects', vi: 'Baked, scorched, tipping — nhận diện qua ly', kind: 'ref', date: '2026.01' },
      { n: '06', en: 'Profile Logging', vi: 'Ghi log rang như ghi nhật ký thí nghiệm', kind: 'log', date: '2025.12' },
    ],
  },
]

/** Every entry across every module, newest first — backs the Archive screen. */
export const allPosts = modules
  .flatMap((m) =>
    m.entries.map((e) => ({
      date: e.date,
      mod: m.title,
      accent: m.accent,
      on: m.on,
      en: e.en,
      vi: e.vi,
      kind: e.kind,
    })),
  )
  .sort((a, b) => (a.date < b.date ? 1 : -1))

/** Alternate the two tints down a list so consecutive thumbnails differ. */
export const withTints = (m: Module) =>
  m.entries.map((e, i) => ({ ...e, tint: i % 2 === 0 ? m.tint : m.tint2 }))

import { garden } from '../design/tokens'

export type ModuleLayout = 'band' | 'specimen' | 'sequence'

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
    },
]

/**
 * Ba danh sách khu quản trị hỏi đi hỏi lại, giữ lại sau lần hỏi đầu.
 *
 * `listModules()` được gọi từ bốn màn — `Cms`, `Editor`, `Preview`,
 * `MetadataStep` — và mỗi màn hỏi lại từ đầu mỗi lần nó dựng. Đi từ Content
 * management sang "bài mới" sang màn soạn là ba lượt hỏi cùng một danh sách
 * trong mươi giây, mà module thì gần như không bao giờ đổi. Tag và template
 * cũng vậy.
 *
 * Cache này cố ý làm mỏng:
 *
 * - Nó nằm trong bộ nhớ, không phải `localStorage`. Tải lại trang là sạch, nên
 *   không có chuyện một danh sách cũ sống dai hơn phiên làm việc.
 * - Nó giữ **lời hứa**, không giữ kết quả. Hai màn dựng cùng lúc thì cùng chờ
 *   một lượt gọi chứ không gọi hai lần.
 * - Lượt gọi hỏng thì lời hứa bị bỏ đi, để lần sau còn hỏi lại được. Cache một
 *   lỗi mạng lại là cách biến một lần chập mạng thành một màn hỏng vĩnh viễn.
 * - Chỗ nào **ghi** vào ba danh sách ấy thì gọi `forget…` để lần đọc sau lấy
 *   bản mới.
 */
import { modulesChanged } from '../../data/modulesChanged'
import {
  listModules,
  listTags,
  listTemplates,
  type Module,
  type Tag,
  type TemplateSummary,
} from './apiClient'

function once<T>(fetch: () => Promise<T>) {
  let inFlight: Promise<T> | null = null
  return {
    get(): Promise<T> {
      if (!inFlight) {
        inFlight = fetch().catch((e) => {
          inFlight = null
          throw e
        })
      }
      return inFlight
    },
    forget(): void {
      inFlight = null
    },
  }
}

const modules = once<Module[]>(listModules)
const tags = once<Tag[]>(listTags)
const templates = once<TemplateSummary[]>(listTemplates)

export const listModulesCached = (): Promise<Module[]> => modules.get()
export const listTagsCached = (): Promise<Tag[]> => tags.get()
export const listTemplatesCached = (): Promise<TemplateSummary[]> => templates.get()

/**
 * Gọi sau khi ghi vào `modules`, để lần đọc sau lấy bản mới.
 *
 * Quên cache ở đây mới chỉ sửa được nửa khu quản trị. Nửa kia là thanh bên và
 * Trang chủ: chúng đọc `modules` thẳng từ Supabase qua `data/useModules`, nên
 * phải được báo, không thì vẫn vẽ thứ tự cũ cho tới khi tải lại cả trang.
 */
export const forgetModules = (): void => {
  modules.forget()
  modulesChanged()
}
/** Gọi sau khi ghi vào `tags`. */
export const forgetTags = (): void => tags.forget()
/** Gọi sau khi ghi vào `templates`. */
export const forgetTemplates = (): void => templates.forget()

/** Quên sạch — dùng khi đăng xuất, và trong test. */
export function forgetAllLists(): void {
  modules.forget()
  tags.forget()
  templates.forget()
}

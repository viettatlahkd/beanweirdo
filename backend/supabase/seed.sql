-- beanweirdo — seed data
--
-- Loads the current prototype content (3 modules, 18 posts, 1 full article)
-- so the database starts populated instead of empty. Personal-journal tables
-- (activity_kinds, hour_logs, notes) are NOT seeded here — they belong to a
-- signed-in user, so they start empty per account.
--
-- Run schema.sql first.

insert into modules (id, title, accent, on_color, tint, tint2, layout, concept, blurb, long_desc, treatment, layout_note, shot1, shot2, shot3, sort_order)
values
  (
    'sensory', 'sensory', '#F2A0A5', '#3B2A2B', '#FBE7E5', '#F6D2D4', 'band', 'flavor',
    'Cách con người cảm nhận hương vị, và cách gọi tên nó.',
    'Từ sinh lý học của vị giác, khứu giác đến bộ từ vựng dùng để mô tả một tách cà phê. Theme hình ảnh: hương vị ở cự ly gần — lát trái cây, cánh hoa, tinh thể đường, bề mặt ướt.',
    'Hồng cánh hoa làm nền khối lớn, ảnh đặt trên nền kem để bật ra. Vật thể đơn, ánh sáng ban ngày.',
    'Band — khối màu phủ đầu trang, một ảnh ngang lớn, danh mục hai cột kèm thumbnail.',
    'macro hương vị — lát cam cắt ngang', 'cánh hoa khô, nền kem', 'bề mặt ướt — giọt trên vỏ quả', 1
  ),
  (
    'biochem', 'biochemistry 101', '#7FB87E', '#1F3323', '#E4F0DF', '#CFE6C8', 'specimen', 'structure',
    'Hạt cà phê nhìn từ bên trong: cấu trúc, hợp chất, phản ứng.',
    'Sáu bài ngắn về thành phần hoá học của hạt nhân xanh và những gì xảy ra khi chúng gặp nhiệt. Theme hình ảnh: mặt cắt — quả chín bổ đôi, nhân trong lớp nhầy, thớ tế bào phóng đại.',
    'Xanh lá non cạnh xanh rêu đậm. Chụp thẳng góc, ánh sáng phẳng, vật thể đặt giữa khung.',
    'Specimen — khối màu chiếm nửa trái, nửa phải là lưới ảnh vuông; bài viết xếp thành khay ba cột.',
    'mặt cắt — quả chín bổ đôi', 'nhân xanh chụp từ trên, nền rêu', 'thớ tế bào phóng đại', 2
  ),
  (
    'roasting', 'roasting', '#F0B45C', '#3B2E19', '#F9EBD2', '#F3DCAE', 'sequence', 'process',
    'Nhiệt, thời gian, và những gì đọc được từ một đường cong.',
    'Nhiệt đi vào hạt bằng cách nào, mỗi giai đoạn làm gì, và cách ghi lại một mẻ rang để lần sau lặp được. Theme hình ảnh: quá trình và biến đổi — dải màu hạt chuyển dần, khói mảnh, mặt đồng hồ nhiệt.',
    'Mơ chín chuyển dần sang nâu quế theo trình tự rang — màu tự nó kể quá trình.',
    'Sequence — tiêu đề cực lớn trên khối mơ, dải bốn ảnh chuyển màu, danh mục là hàng đánh số lớn.',
    'dải hạt chuyển màu theo mức rang', 'trang log rang viết tay', 'khói mảnh trên nền sáng', 3
  )
on conflict (id) do nothing;

insert into templates (name, layout, accent, on_color, tint, tint2)
values
  ('Band · Blush', 'band', '#F2A0A5', '#3B2A2B', '#FBE7E5', '#F6D2D4'),
  ('Specimen · Leaf', 'specimen', '#7FB87E', '#1F3323', '#E4F0DF', '#CFE6C8'),
  ('Sequence · Apricot', 'sequence', '#F0B45C', '#3B2E19', '#F9EBD2', '#F3DCAE')
on conflict do nothing;

insert into posts (module_id, n, en, vi, kind, date_label, sort_order)
values
  ('sensory', '01', 'Senses of Flavors', 'Năm giác quan cùng tham gia vào một ngụm cà phê', 'note', '2026.05', 1),
  ('sensory', '02', 'Taste Perception', 'Ngưỡng cảm nhận, và cách vị giác đánh lừa ta', 'essay', '2026.04', 2),
  ('sensory', '03', 'Sensory Lexicon', 'Bộ từ vựng mô tả hương vị và giới hạn của nó', 'ref', '2026.03', 3),
  ('sensory', '04', 'Cupping Form', 'Đọc bảng điểm cupping như đọc một biểu đồ', 'note', '2026.02', 4),
  ('sensory', '05', 'Flavor as Human Sense', 'Hương vị là ký ức hay là hoá học', 'essay', '2026.01', 5),
  ('sensory', '06', 'sens.ercise', 'Bài tập rèn khứu giác hằng tuần', 'log', '2025.12', 6),

  ('biochem', '01', 'Bean Composition', 'Thành phần hoá học của một hạt nhân xanh', 'note', '2026.04', 1),
  ('biochem', '02', 'Cell Wall: Lignin', 'Cấu trúc gỗ hoá quyết định độ giòn khi rang', 'note', '2026.03', 2),
  ('biochem', '04', 'Carbohydrates', 'Đường, polysaccharide và cái ngọt ở hậu vị', 'note', '2026.01', 4),
  ('biochem', '05', 'Lipids in Beans', 'Chất béo, thể chất của nước, và sự ôi hoá', 'note', '2025.12', 5),
  ('biochem', '06', 'Melanoidins', 'Sản phẩm cuối của Maillard và màu nâu của nước', 'ref', '2025.11', 6),

  ('roasting', '01', 'Heat Transfer', 'Ba đường nhiệt đi vào hạt: dẫn, đối lưu, bức xạ', 'note', '2026.05', 1),
  ('roasting', '02', 'Drying Phase', 'Giai đoạn thoát ẩm, và vì sao đừng vội', 'note', '2026.04', 2),
  ('roasting', '03', 'Maillard Stage', 'Nơi phần lớn hương thơm được sinh ra', 'essay', '2026.03', 3),
  ('roasting', '04', 'First Crack & Development', 'Đo thời gian phát triển bằng gì cho đúng', 'note', '2026.02', 4),
  ('roasting', '05', 'Roast Defects', 'Baked, scorched, tipping — nhận diện qua ly', 'ref', '2026.01', 5),
  ('roasting', '06', 'Profile Logging', 'Ghi log rang như ghi nhật ký thí nghiệm', 'log', '2025.12', 6);

-- The one post with a full essay written — everyone else is still a title/blurb stub.
insert into posts (
  module_id, n, en, vi, kind, date_label, sort_order,
  hero_caption, lead, pull_quote, further_reading, body
)
values (
  'biochem', '03', 'Chlorogenic Acids (CGA)', 'Nguồn gốc của vị chát và phần lớn vị chua', 'essay', '2026.02', 3,
  'quả chín, chụp thẳng',
  'Nguồn gốc của vị chát và phần lớn vị chua trong tách cà phê.',
  'Rang càng sâu, CGA càng ít — nhưng vị đắng lại càng nhiều. Cái đắng đó đến từ sản phẩm phân huỷ của chính nó.',
  array['Farah & Donangelo 2006', 'Illy & Viani, Espresso Coffee'],
  $body$
  [
    {
      "h": "Nó là gì",
      "p": "Chlorogenic acid không phải một chất, mà là một họ khoảng hơn hai mươi hợp chất phenolic. Trong hạt arabica nhân xanh, chúng chiếm khoảng 6–8% khối lượng khô; ở robusta con số này cao hơn, thường 8–11%. Đây là nhóm hợp chất phong phú thứ hai trong hạt, chỉ sau carbohydrate."
    },
    {
      "h": "Vì sao ta quan tâm",
      "p": "CGA là lý do một tách cà phê có vị chát ở cuối lưỡi và cảm giác khô nhẹ ở vòm miệng. Chúng cũng là tiền chất của nhiều hợp chất đắng sinh ra trong lúc rang, nên phần lớn những gì ta gọi là “vị đắng cà phê” thực ra bắt đầu từ đây chứ không phải từ caffeine.",
      "fig": {
        "h": "190px", "w": "300px", "margin": "26px 0 36px", "tint": "#FBE7E5",
        "caption": "chi tiết — bề mặt nhân xanh", "label": "ghi chú bên lề",
        "note": "Vị chát của CGA không nằm ở lưỡi mà ở cảm giác se của niêm mạc — cùng cơ chế với tannin trong trà hay vang đỏ. Vì vậy nó không tăng giảm theo nồng độ pha như vị chua."
      }
    },
    {
      "h": "Chuyện gì xảy ra khi rang",
      "p": "Nhiệt phá vỡ CGA khá nhanh. Từ nhân xanh đến mức rang vừa, khoảng một nửa lượng CGA biến mất; đến rang đậm có thể mất tới 90%. Nhưng chúng không biến đi đâu cả — chúng tách thành acid quinic và acid caffeic, rồi tiếp tục chuyển thành các lactone và phenylindane. Nhóm đầu cho vị đắng dịu, dễ chịu; nhóm sau cho vị đắng dai và khô, thứ vị đặc trưng của rang đậm."
    },
    {
      "h": "Đọc điều này trong ly",
      "p": "Một mẻ rang nhạt giữ nhiều CGA hơn, nên chua và chát rõ hơn, nhưng cũng dễ bị coi là “xanh” nếu giai đoạn phát triển quá ngắn. Kéo dài thời gian sau first crack thêm ba mươi giây thường đủ để chuyển vị chát ấy thành vị ngọt hậu, mà chưa kịp sinh phenylindane.",
      "fig": {
        "h": "230px", "w": "50%", "margin": "30px 0 38px 0", "tint": "#F9EBD2",
        "caption": "biểu đồ — CGA giảm dần theo mức rang", "label": "số liệu",
        "note": "Trục ngang là thời gian rang, trục dọc là phần trăm CGA còn lại. Điểm gãy nằm quanh first crack — sau mốc đó tốc độ phân huỷ tăng gần gấp đôi."
      }
    },
    {
      "h": "Robusta và arabica",
      "p": "Robusta chứa nhiều CGA hơn arabica ở mọi mức rang, và đó là một phần lý do vì sao robusta bị cho là thô. Nhưng cùng lượng CGA ấy cũng cho robusta lớp bọt dày hơn khi pha espresso, vì các hợp chất phenolic góp phần giữ ổn định bề mặt bọt. Cái bị coi là khuyết ở tách filter lại thành ưu ở tách espresso."
    },
    {
      "h": "Ảnh hưởng tới cách pha",
      "p": "CGA tan tương đối nhanh, nên chúng ra sớm trong quá trình chiết. Một mẻ pour over rút quá nhanh sẽ giữ tỉ lệ CGA cao so với đường và các chất tạo ngọt ra muộn hơn, và tách nước nghiêng về chua chát. Kéo dài thời gian tiếp xúc hoặc xay mịn hơn một bậc thường xử lý được, mà không cần đổi mức rang."
    },
    {
      "h": "Ghi chú thí nghiệm",
      "p": "Rang cùng một lô Sơn La ở ba mức phát triển 15%, 20% và 25%, cupping mù ba mẫu. Mẫu 15% chua sắc và khô ở hậu vị; mẫu 20% cân bằng nhất; mẫu 25% ngọt hơn nhưng mất hết nét trái cây. Ranh giới hẹp hơn tôi tưởng — chỉ ba mươi giây phát triển đã đổi hẳn kết luận."
    },
    {
      "h": "Còn chưa rõ",
      "p": "Con số 6–8% là tổng lượng CGA, nhưng tỉ lệ giữa các đồng phân trong đó thay đổi theo giống, độ cao và cách sơ chế — và chính tỉ lệ ấy mới quyết định vị chát nặng hay nhẹ. Chưa có cách nào đo được ở quy mô quán. Ghi lại đây để lần sau đọc tiếp."
    }
  ]
  $body$::jsonb
);

update posts set
  status = 'published',
  published_at = created_at,
  template_id = (select id from templates where name = 'Sequence · Apricot')
where template_id is null;

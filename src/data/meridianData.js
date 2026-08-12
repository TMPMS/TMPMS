// Dữ liệu Quy Kinh & Huyệt Vị 3D cho các Vị thuốc / Bài thuốc Đông Y
// Định nghĩa các đường kinh lạc chính (Meridians) và tọa độ 3D các huyệt vị giải phẫu

export const MERIDIANS_CATALOG = {
  PHE: {
    id: 'PHE',
    name: 'Thủ Thái Âm Phế Kinh',
    element: 'Kim ⚪',
    color: '#38bdf8', // Neon Cyan
    description: 'Chi phối hệ hô hấp, phế quản, da lông, khả năng kháng bệnh của cơ thể.',
    colorRgb: [0.22, 0.74, 0.97]
  },
  THAN: {
    id: 'THAN',
    name: 'Túc Thiếu Âm Thận Kinh',
    element: 'Thủy 🔵',
    color: '#3b82f6', // Neon Royal Blue
    description: 'Chủ về tiên thiên, tàng tinh, sinh tủy, chủ xương răng, thính giác và nạp khí.',
    colorRgb: [0.23, 0.51, 0.96]
  },
  TY: {
    id: 'TY',
    name: 'Túc Thái Âm Tỳ Kinh',
    element: 'Thổ 🟡',
    color: '#eab308', // Neon Amber/Gold
    description: 'Chủ về hậu thiên, vận hóa thủy cốc, sinh huyết, chủ cơ bắp và tiêu hóa.',
    colorRgb: [0.92, 0.70, 0.03]
  },
  CAN: {
    id: 'CAN',
    name: 'Túc Quyết Âm Can Kinh',
    element: 'Mộc 🟢',
    color: '#10b981', // Neon Emerald Green
    description: 'Chủ về tàng huyết, sơ tiết khí cơ, cân cơ, thị giác và cảm xúc.',
    colorRgb: [0.06, 0.72, 0.51]
  },
  TAM: {
    id: 'TAM',
    name: 'Thủ Thiếu Âm Tâm Kinh',
    element: 'Hỏa 🔴',
    color: '#ef4444', // Neon Ruby Red
    description: 'Chủ về huyết mạch, tàng thần, chi phối nhịp tim, trí óc và giấc ngủ.',
    colorRgb: [0.93, 0.27, 0.27]
  },
  VI: {
    id: 'VI',
    name: 'Túc Dương Minh Vị Kinh',
    element: 'Thổ 🟠',
    color: '#f97316', // Neon Orange
    description: 'Chủ thu nhận và làm nhừ nát thức ăn, nguồn sinh hóa năng lượng.',
    colorRgb: [0.97, 0.45, 0.08]
  }
};

// Dữ liệu Quy Kinh & Huyệt Vị mặc định theo tên sản phẩm / từ khóa
export const HERBAL_MERIDIAN_MAPPING = [
  {
    keywords: ['đông trùng', 'hạ thảo', 'militaris', 'mới bổ phế'],
    nature: 'Vị ngọt (cam), tính bình/ấm, không độc',
    meridians: ['PHE', 'THAN'],
    functions: 'Bổ phế ích thận, cầm máu hóa đờm, tăng cường hệ miễn dịch, bổ tinh tủy.',
    acupoints: [
      {
        name: 'Phế Du (BL13)',
        code: 'BL13',
        location: 'Dưới gai đốt sống lưng 3 (T3) đo ngang ra 1.5 thốn',
        benefit: 'Bổ phế khí, giảm ho hắt hơi, thanh nhiệt định suyễn.',
        position: [0.28, 1.05, -0.22]
      },
      {
        name: 'Thận Du (BL23)',
        code: 'BL23',
        location: 'Dưới gai đốt sống thắt lưng 2 (L2) đo ngang ra 1.5 thốn',
        benefit: 'Bổ thận tráng dương, dưỡng tinh tủy, tăng sức chịu đựng.',
        position: [0.28, 0.52, -0.22]
      },
      {
        name: 'Túc Tam Lý (ST36)',
        code: 'ST36',
        location: 'Dưới lõm ngoài xương bánh chè 3 thốn',
        benefit: 'Đại bổ nguyên khí, tăng cường tiêu hóa & hệ miễn dịch toàn thân.',
        position: [0.32, -0.65, 0.15]
      }
    ]
  },
  {
    keywords: ['nhân sâm', 'đảng sâm', 'sâm', 'bổ khí'],
    nature: 'Vị ngọt hơi đắng, tính ôn (ấm)',
    meridians: ['PHE', 'TY', 'TAM'],
    functions: 'Đại bổ nguyên khí, sinh tân an thần, bổ tỳ ích phế.',
    acupoints: [
      {
        name: 'Thái Xung (LR3)',
        code: 'LR3',
        location: 'Kẽ giữa ngón chân 1 và 2 đo lên 1.5 thốn',
        benefit: 'Sơ can lý khí, bình can tiềm dương, giảm căng thẳng.',
        position: [0.18, -1.35, 0.28]
      },
      {
        name: 'Tam Âm Giao (SP6)',
        code: 'SP6',
        location: 'Trên đỉnh mắt cá trong 3 thốn',
        benefit: 'Bổ 3 kinh âm (Tỳ - Can - Thận), dưỡng huyết điều kinh.',
        position: [0.22, -1.05, 0.12]
      },
      {
        name: 'Quan Nguyên (CV4)',
        code: 'CV4',
        location: 'Dưới rốn 3 thốn trên đường giữa bụng',
        benefit: 'Bổ hạ tiêu, tráng dương khí, đại bổ hư tổn.',
        position: [0.0, 0.14, 0.22]
      }
    ]
  },
  {
    keywords: ['đương quy', 'bổ huyết', 'quy tỳ', 'huyết'],
    nature: 'Vị ngọt cay, tính ấm',
    meridians: ['CAN', 'TAM', 'TY'],
    functions: 'Bổ huyết hoạt huyết, điều kinh止痛, nhuận tràng thông tiện.',
    acupoints: [
      {
        name: 'Huyết Hải (SP10)',
        code: 'SP10',
        location: 'Bờ trên trong xương bánh chè đo lên 2 thốn',
        benefit: 'Tụ huyết tư âm, thanh nhiệt hoạt huyết, trị ban ngứa.',
        position: [0.25, -0.42, 0.2]
      },
      {
        name: 'Nội Quan (PC6)',
        code: 'PC6',
        location: 'Trên nếp gấp cổ tay 2 thốn giữa 2 gân',
        benefit: 'Định tâm an thần, hòa vị dừng nôn, giảm đau ngực.',
        position: [0.62, 0.65, 0.1]
      }
    ]
  },
  {
    keywords: ['nấm linh chi', 'linh chi', 'an thần'],
    nature: 'Vị đắng, tính bình',
    meridians: ['TAM', 'PHE', 'CAN', 'THAN'],
    functions: 'Dưỡng tâm an thần, chỉ khái bình suyễn, bổ khí dưỡng huyết.',
    acupoints: [
      {
        name: 'Thần Môn (HT7)',
        code: 'HT7',
        location: 'Trên nếp gấp cổ tay phía ngón út',
        benefit: 'Chuyên trị mất ngủ, hồi hộp, tâm thần不安.',
        position: [0.68, 0.62, 0.08]
      },
      {
        name: 'Bách Hội (GV20)',
        code: 'GV20',
        location: 'Giao điểm đường giữa đầu và đường nối 2 đỉnh tai',
        benefit: 'Thăng dương cử hãm, định thần tỉnh não.',
        position: [0.0, 1.68, 0.0]
      }
    ]
  }
];

// Fallback nếu không trùng từ khóa
export const DEFAULT_HERBAL_MERIDIAN = {
  nature: 'Vị ngọt đắng nhẹ, tính bình, bổ dưỡng cơ thể',
  meridians: ['PHE', 'TY', 'THAN'],
  functions: 'Hỗ trợ tăng cường sức khỏe, dưỡng âm bổ khí, cân bằng tạng phủ.',
  acupoints: [
    {
      name: 'Túc Tam Lý (ST36)',
      code: 'ST36',
      location: 'Dưới lõm ngoài xương bánh chè 3 thốn',
      benefit: 'Đại bổ nguyên khí, tăng cường tiêu hóa & miễn dịch.',
      position: [0.32, -0.65, 0.15]
    },
    {
      name: 'Tam Âm Giao (SP6)',
      code: 'SP6',
      location: 'Trên đỉnh mắt cá trong 3 thốn',
      benefit: 'Bổ Tỳ Can Thận, dưỡng huyết bổ khí.',
      position: [0.22, -1.05, 0.12]
    }
  ]
};

// Trả về dữ liệu quy kinh đã kiểm duyệt cho vị thuốc, hoặc null nếu không khớp từ khóa nào
// (caller nên fallback sang phân tích AI thay vì tự ý dùng DEFAULT_HERBAL_MERIDIAN).
export const getMeridianInfoForMedicine = (medicineName = '') => {
  const lower = medicineName.toLowerCase();
  return HERBAL_MERIDIAN_MAPPING.find(m => m.keywords.some(k => lower.includes(k))) || null;
};

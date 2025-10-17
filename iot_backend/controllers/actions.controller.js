const Action = require('../models/actions.model');

function old_parseFlexibleDatetime(input) {
  if (!input) return null;
  const s = input.trim();

  const yearOnly   = /^(\d{4})$/;
  const monthOnly  = /^(\d{4})-(\d{2})$/;
  const dayOnly    = /^(\d{4})-(\d{2})-(\d{2})$/;
  const hourOnly   = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2})$/;
  const minuteOnly = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2})-(\d{2})$/;
  const secondOnly = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2})-(\d{2})-(\d{2})$/;

  let start, end, m;

  // năm
  if (m = s.match(yearOnly)) {
    const [ , year] = m;
    start = new Date(`${year}-01-01T00:00:00.000Z`);
    end   = new Date(`${year}-12-31T23:59:59.999Z`);
  }
  // năm+tháng
  else if (m = s.match(monthOnly)) {
    const [ , year, month ] = m;
    const startString = `${year}-${month}-01T00:00:00.000Z`;
    const startDate = new Date(startString);
    const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999));
    
    start = startDate;
    end   = endDate;
  }
  // năm+tháng+ngày
  else if (m = s.match(dayOnly)) {
    const [ , year, month, day ] = m;
    start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    end   = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
  }
  // năm+tháng+ngày+giờ
  else if (m = s.match(hourOnly)) {
    const [ , year, month, day, hour ] = m;
    start = new Date(`${year}-${month}-${day}T${hour}:00:00.000Z`);
    end   = new Date(`${year}-${month}-${day}T${hour}:59:59.999Z`);
  }
  // năm+tháng+ngày+giờ+phút
  else if (m = s.match(minuteOnly)) {
    const [ , year, month, day, hour, minute ] = m;
    start = new Date(`${year}-${month}-${day}T${hour}:${minute}:00.000Z`);
    end   = new Date(`${year}-${month}-${day}T${hour}:${minute}:59.999Z`);
  }
  // năm+tháng+ngày+giờ+phút+giây
  else if (m = s.match(secondOnly)) {
    const [ , year, month, day, hour, minute, second ] = m;
    start = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`);
    end   = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.999Z`);
  // fall back
  } else {
    return null;
  }

  return { start, end };
}

function parseFlexibleDatetime(input) {
  if (!input) return null; // nếu rỗng
  const s = input.trim();

  const yearOnly   = /^(\d{4})$/;
  const monthOnly  = /^(\d{4})-(\d{2})$/;
  const dayOnly    = /^(\d{4})-(\d{2})-(\d{2})$/;
  const hourOnly   = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2})$/;
  const minuteOnly = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2})-(\d{2})$/;
  const secondOnly = /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2})-(\d{2})-(\d{2})$/;

  let start, end, m;

  const makeLocal = (y, mo, d, h = 0, mi = 0, s = 0, ms = 0) => {
    // ⚙️ Tạo Date theo local time (giờ Việt Nam)
    return new Date(y, mo - 1, d, h, mi, s, ms);
  };

  // năm
  if ((m = s.match(yearOnly))) {
    const [, year] = m;
    start = makeLocal(year, 1, 1, 0, 0, 0, 0);
    end   = makeLocal(year, 12, 31, 23, 59, 59, 999);
  }
  // năm+tháng
  else if ((m = s.match(monthOnly))) {
    const [, year, month] = m;
    start = makeLocal(year, month, 1, 0, 0, 0, 0);
    end   = makeLocal(year, Number(month) + 1, 0, 23, 59, 59, 999);
  }
  // năm+tháng+ngày
  else if ((m = s.match(dayOnly))) {
    const [, year, month, day] = m;
    start = makeLocal(year, month, day, 0, 0, 0, 0);
    end   = makeLocal(year, month, day, 23, 59, 59, 999);
  }
  // năm+tháng+ngày+giờ
  else if ((m = s.match(hourOnly))) {
    const [, year, month, day, hour] = m;
    start = makeLocal(year, month, day, hour, 0, 0, 0);
    end   = makeLocal(year, month, day, hour, 59, 59, 999);
  }
  // năm+tháng+ngày+giờ+phút
  else if ((m = s.match(minuteOnly))) {
    const [, year, month, day, hour, minute] = m;
    start = makeLocal(year, month, day, hour, minute, 0, 0);
    end   = makeLocal(year, month, day, hour, minute, 59, 999);
  }
  // năm+tháng+ngày+giờ+phút+giây
  else if ((m = s.match(secondOnly))) {
    const [, year, month, day, hour, minute, second] = m;
    start = makeLocal(year, month, day, hour, minute, second, 0);
    end   = makeLocal(year, month, day, hour, minute, second, 999);
  } 
  else {
    return null;
  }

  return { start, end };
}


// Lấy lịch sử device (có phân trang, lọc)
exports.getHistory = async (req, res) => {
  try {
    const {
      search, // để tìm kiếm thời gian
      device = 'all', // all, led, fan, ac
      action = 'all', // all, on, off
      sortOrder = 'asc', // chỉ có asc/desc cho time
      page = 1,
      limit = 10
    } = req.query;

    // Xây dựng query tìm kiếm
    let query = {};

    // Lọc theo device
    if (device && device !== 'all') {
      query.device = device;
    }

    // Lọc theo action
    if (action && action !== 'all') {
      query.action = action;
    }

    // Tìm kiếm theo thời gian
    if (search && search.trim() !== '') {
      const searchValue = search.trim();
      const timeRange = parseFlexibleDatetime(searchValue);
      
      if (timeRange) {
        query.time = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }
    }

    // Luôn sắp xếp theo time
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    // Tính toán phân trang
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Thực hiện query - luôn sort theo time
    const actions = await Action.find(query)
      .sort({ time: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Đếm tổng số bản ghi
    const total = await Action.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: actions,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: total,
        recordsPerPage: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        device: device,
        action: action,
        timeSearch: search || '',
        sortOrder: sortOrder
      }
    });

  } catch (error) {
    console.error('Error fetching device history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu lịch sử device',
      error: error.message
    });
  }
};

// Lấy thống kê device (đơn giản)
exports.getDeviceStats = async (req, res) => {
  try {
    const stats = await Action.aggregate([
      {
        $group: {
          _id: '$device',
          totalActions: { $sum: 1 },
          onCount: {
            $sum: { $cond: [{ $eq: ['$action', 'on'] }, 1, 0] }
          },
          offCount: {
            $sum: { $cond: [{ $eq: ['$action', 'off'] }, 1, 0] }
          },
          latestTime: { $max: '$time' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê device',
      error: error.message
    });
  }
};
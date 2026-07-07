using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;

namespace backend.Controllers
{
    [ApiController]
    public class SuppliersController : ControllerBase
    {
        private readonly TMPMSDbContext _context;

        public SuppliersController(TMPMSDbContext context)
        {
            _context = context;
        }

        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers()
        {
            var suppliers = await _context.Suppliers
                .OrderBy(s => s.Id)
                .ToListAsync();
            return Ok(suppliers);
        }

        [HttpGet("warehouses-info")]
        public async Task<IActionResult> GetWarehousesInfo()
        {
            var warehouses = await _context.Warehouses
                .OrderBy(w => w.Id)
                .Select(w => new {
                    w.Id,
                    w.Name,
                    w.Address,
                    TotalQuantity = _context.InventoryStocks
                        .Where(s => s.WarehouseId == w.Id)
                        .Sum(s => (int?)s.Quantity) ?? 0
                })
                .ToListAsync();

            return Ok(warehouses);
        }
    }
}

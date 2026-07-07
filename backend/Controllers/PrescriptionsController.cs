using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System;

namespace backend.Controllers
{
    [ApiController]
    [Route("prescriptions")]
    public class PrescriptionsController : ControllerBase
    {
        private readonly TMPMSDbContext _context;

        public PrescriptionsController(TMPMSDbContext context)
        {
            _context = context;
        }

        public class PrescriptionItemInput
        {
            public int MedicineId { get; set; }
            public int Quantity { get; set; }
        }

        public class PrescriptionRequest
        {
            public int? UserId { get; set; }
            public int? PatientId { get; set; }
            public string DoctorName { get; set; } = "Thầy thuốc";
            public string Hospital { get; set; } = "Phòng khám Đông Y";
            public List<PrescriptionItemInput> Items { get; set; } = new();
        }

        [HttpGet]
        public async Task<IActionResult> GetPrescriptions()
        {
            var prescriptions = await _context.Prescriptions
                .OrderByDescending(p => p.PrescriptionDate)
                .Select(p => new {
                    p.Id,
                    p.UserId,
                    p.PatientId,
                    p.DoctorName,
                    p.Hospital,
                    p.PrescriptionDate,
                    p.ImageUrl,
                    p.Status,
                    PatientName = p.PatientId.HasValue 
                        ? _context.Patients.Where(pt => pt.Id == p.PatientId).Select(pt => pt.Name).FirstOrDefault()
                        : _context.Users.Where(u => u.Id == p.UserId).Select(u => u.Username).FirstOrDefault(),
                    Items = _context.PrescriptionItems
                        .Where(pi => pi.PrescriptionId == p.Id)
                        .Join(_context.Medicines,
                            pi => pi.MedicineId,
                            m => m.Id,
                            (pi, m) => new {
                                pi.Id,
                                pi.MedicineId,
                                pi.Quantity,
                                MedicineName = m.Name,
                                ImageUrl = m.ImageUrl,
                                Price = m.Price
                            })
                        .ToList()
                })
                .ToListAsync();

            return Ok(prescriptions);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePrescription([FromBody] PrescriptionRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var prescription = new Prescription
                {
                    UserId = request.UserId,
                    PatientId = request.PatientId,
                    DoctorName = request.DoctorName,
                    Hospital = request.Hospital,
                    PrescriptionDate = DateTime.UtcNow,
                    ImageUrl = "",
                    Status = "Active"
                };

                _context.Prescriptions.Add(prescription);
                await _context.SaveChangesAsync();

                foreach (var item in request.Items)
                {
                    var pItem = new PrescriptionItem
                    {
                        PrescriptionId = prescription.Id,
                        MedicineId = item.MedicineId,
                        Quantity = item.Quantity
                    };
                    _context.PrescriptionItems.Add(pItem);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return StatusCode(201, prescription);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] Dictionary<string, string> body)
        {
            var p = await _context.Prescriptions.FindAsync(id);
            if (p == null) return NotFound(new { message = "Không tìm thấy đơn thuốc" });

            if (body.ContainsKey("status"))
            {
                p.Status = body["status"];
            }

            await _context.SaveChangesAsync();
            return Ok(p);
        }
    }
}

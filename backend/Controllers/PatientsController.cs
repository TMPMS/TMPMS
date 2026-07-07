using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace backend.Controllers
{
    [ApiController]
    [Route("patients")]
    public class PatientsController : ControllerBase
    {
        private readonly TMPMSDbContext _context;

        public PatientsController(TMPMSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Patient>>> GetPatients()
        {
            return await _context.Patients
                .OrderByDescending(p => p.Id)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Patient>> GetPatient(int id)
        {
            var patient = await _context.Patients.FindAsync(id);
            if (patient == null) return NotFound(new { message = "Không tìm thấy bệnh nhân" });
            return patient;
        }

        [HttpPost]
        public async Task<ActionResult<Patient>> CreatePatient([FromBody] Patient patient)
        {
            patient.CreatedAt = DateTime.UtcNow;
            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPatient), new { id = patient.Id }, patient);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePatient(int id, [FromBody] Patient patientInput)
        {
            var patient = await _context.Patients.FindAsync(id);
            if (patient == null) return NotFound(new { message = "Không tìm thấy bệnh nhân" });

            patient.Name = patientInput.Name;
            patient.Gender = patientInput.Gender;
            patient.DateOfBirth = patientInput.DateOfBirth;
            patient.Phone = patientInput.Phone;
            patient.Address = patientInput.Address;
            patient.MedicalHistory = patientInput.MedicalHistory;

            await _context.SaveChangesAsync();
            return Ok(patient);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePatient(int id)
        {
            var patient = await _context.Patients.FindAsync(id);
            if (patient == null) return NotFound(new { message = "Không tìm thấy bệnh nhân" });

            _context.Patients.Remove(patient);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã xóa bệnh nhân thành công" });
        }
    }
}

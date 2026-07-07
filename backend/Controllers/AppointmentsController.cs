using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace backend.Controllers
{
    [ApiController]
    [Route("appointments")]
    public class AppointmentsController : ControllerBase
    {
        private readonly TMPMSDbContext _context;

        public AppointmentsController(TMPMSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAppointments()
        {
            var appointments = await _context.Appointments
                .OrderByDescending(a => a.AppointmentDate)
                .Select(a => new {
                    a.Id,
                    a.PatientId,
                    a.DoctorId,
                    a.AppointmentDate,
                    a.Reason,
                    a.Status,
                    a.Notes,
                    a.CreatedAt,
                    PatientName = _context.Patients.Where(p => p.Id == a.PatientId).Select(p => p.Name).FirstOrDefault(),
                    PatientPhone = _context.Patients.Where(p => p.Id == a.PatientId).Select(p => p.Phone).FirstOrDefault(),
                    DoctorName = _context.Users.Where(u => u.Id == a.DoctorId).Select(u => u.Username).FirstOrDefault()
                })
                .ToListAsync();

            return Ok(appointments);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAppointment(int id)
        {
            var a = await _context.Appointments.FindAsync(id);
            if (a == null) return NotFound(new { message = "Không tìm thấy lịch hẹn" });
            return Ok(a);
        }

        [HttpPost]
        public async Task<IActionResult> CreateAppointment([FromBody] Appointment appointment)
        {
            appointment.CreatedAt = DateTime.UtcNow;
            if (appointment.Status == null) appointment.Status = "Scheduled";
            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync();

            return StatusCode(201, appointment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAppointment(int id, [FromBody] Appointment appointmentInput)
        {
            var a = await _context.Appointments.FindAsync(id);
            if (a == null) return NotFound(new { message = "Không tìm thấy lịch hẹn" });

            a.PatientId = appointmentInput.PatientId;
            a.DoctorId = appointmentInput.DoctorId;
            a.AppointmentDate = appointmentInput.AppointmentDate;
            a.Reason = appointmentInput.Reason;
            a.Status = appointmentInput.Status;
            a.Notes = appointmentInput.Notes;

            await _context.SaveChangesAsync();
            return Ok(a);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(int id)
        {
            var a = await _context.Appointments.FindAsync(id);
            if (a == null) return NotFound(new { message = "Không tìm thấy lịch hẹn" });

            _context.Appointments.Remove(a);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã xóa lịch hẹn thành công" });
        }
    }
}

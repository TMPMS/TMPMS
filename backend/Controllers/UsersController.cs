using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace backend.Controllers
{
    [ApiController]
    [Route("users")]
    public class UsersController : ControllerBase
    {
        private readonly TMPMSDbContext _context;

        public UsersController(TMPMSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .OrderBy(u => u.Id)
                .Select(u => new {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Phone,
                    u.RoleId,
                    RoleName = _context.Roles.Where(r => r.Id == u.RoleId).Select(r => r.Name).FirstOrDefault(),
                    u.IsActive,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateUserRole(int id, [FromBody] Dictionary<string, int> body)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng" });

            if (body.ContainsKey("role_id"))
            {
                user.RoleId = body["role_id"];
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> ToggleUserStatus(int id, [FromBody] Dictionary<string, bool> body)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng" });

            if (body.ContainsKey("is_active"))
            {
                user.IsActive = body["is_active"];
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }
    }
}

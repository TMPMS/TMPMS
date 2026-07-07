using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;

namespace backend.Controllers
{
    [ApiController]
    [Route("rpc")]
    public class AuthController : ControllerBase
    {
        private readonly TMPMSDbContext _context;

        public AuthController(TMPMSDbContext context)
        {
            _context = context;
        }

        public class LoginRequest
        {
            public string p_username { get; set; } = "";
            public string p_password { get; set; } = "";
        }

        [HttpPost("login_user")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            Console.WriteLine($"[AUTH DEBUG] Login attempt for user: '{request.p_username}' with password length: {request.p_password.Length}");
            
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.p_username && u.PasswordHash == request.p_password);

            if (user == null)
            {
                return BadRequest(new { message = "Sai tên đăng nhập hoặc mật khẩu" });
            }

            if (!user.IsActive)
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị khóa" });
            }

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                phone = user.Phone,
                role_id = user.RoleId,
                is_active = user.IsActive,
                created_at = user.CreatedAt
            });
        }

        public class RegisterRequest
        {
            public string p_username { get; set; } = "";
            public string p_email { get; set; } = "";
            public string p_password { get; set; } = "";
            public string p_phone { get; set; } = "";
        }

        [HttpPost("register_user")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var exists = await _context.Users.AnyAsync(u => u.Username == request.p_username || u.Email == request.p_email);
            if (exists)
            {
                return BadRequest(new { message = "Tên đăng nhập hoặc email đã tồn tại" });
            }

            var newUser = new User
            {
                Username = request.p_username,
                Email = request.p_email,
                PasswordHash = request.p_password,
                Phone = request.p_phone,
                RoleId = 2, // Customer default
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            // Auto create cart for user
            var newCart = new Cart
            {
                UserId = newUser.Id
            };
            _context.Carts.Add(newCart);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công!" });
        }
    }
}

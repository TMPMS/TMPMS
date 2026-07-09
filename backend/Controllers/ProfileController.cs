using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TMPMS.DTOs;
using Services.Interfaces;
using System.Text.Json.Serialization;

namespace TMPMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        }

        [Authorize(Roles = "User,Pharmacy,Admin")]
        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var result = await _profileService.GetProfileAsync(GetUserId());

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [Authorize(Roles = "User,Pharmacy,Admin")]
        [HttpPut]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDTO dto)
        {
            var result = await _profileService.UpdateProfileAsync(GetUserId(), dto);

            if (!result)
            {
                return BadRequest(new
                {
                    message = "Update profile failed."
                });
            }

            return Ok(new
            {
                message = "Profile updated successfully."
            });
        }

        [Authorize(Roles = "User,Pharmacy,Admin")]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDTO dto)
        {
            var result = await _profileService.ChangePasswordAsync(GetUserId(), dto);

            if (!result)
            {
                return BadRequest(new
                {
                    message = "Old password is incorrect."
                });
            }

            return Ok(new
            {
                message = "Password changed successfully."
            });
        }

        
        [Authorize(Roles = "Admin")]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _profileService.GetAllUsersAsync();

            return Ok(users);
        }

      
        [Authorize(Roles = "Admin")]
        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _profileService.GetUserByIdAsync(id);

            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("users/{id}/status")]
        public async Task<IActionResult> ToggleUserStatus(int id, [FromBody] ToggleStatusInput input)
        {
            var result = await _profileService.ToggleUserStatusAsync(id, input.IsActive);
            if (!result)
                return BadRequest("Không thể cập nhật trạng thái người dùng.");
            return Ok(new { message = "Cập nhật trạng thái người dùng thành công." });
        }

        public class ToggleStatusInput
        {
            [JsonPropertyName("is_active")]
            public bool IsActive { get; set; }
        }
    }
}

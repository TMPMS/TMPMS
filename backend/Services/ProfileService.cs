using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using BusinessObjects;
using TMPMS.DTOs;
using Services.Interfaces;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace TMPMS.Services
{
    public class ProfileService : IProfileService
    {
        private readonly UserManager<User> _userManager;

        public ProfileService(UserManager<User> userManager)
        {
            _userManager = userManager;
        }

        public async Task<ProfileResponseDTO?> GetProfileAsync(int userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return null;

            var roles = await _userManager.GetRolesAsync(user);

            return new ProfileResponseDTO
            {
                Id = user.Id,
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                Phone = user.PhoneNumber ?? string.Empty,
                Role = roles.FirstOrDefault() ?? string.Empty,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<bool> UpdateProfileAsync(int userId, UpdateProfileDTO dto)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return false;

            // Check Email
            var emailUser = await _userManager.FindByEmailAsync(dto.Email);
            if (emailUser != null && emailUser.Id != user.Id)
                return false;

            // Check Username
            var nameUser = await _userManager.FindByNameAsync(dto.Username);
            if (nameUser != null && nameUser.Id != user.Id)
                return false;

            user.UserName = dto.Username;
            user.Email = dto.Email;
            user.PhoneNumber = dto.Phone;

            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }

        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDTO dto)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return false;

            var result = await _userManager.ChangePasswordAsync(user, dto.OldPassword, dto.NewPassword);
            return result.Succeeded;
        }

        public async Task<List<ProfileResponseDTO>> GetAllUsersAsync()
        {
            var users = await _userManager.Users.ToListAsync();
            var dtos = new List<ProfileResponseDTO>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                dtos.Add(new ProfileResponseDTO
                {
                    Id = user.Id,
                    Username = user.UserName ?? string.Empty,
                    Email = user.Email ?? string.Empty,
                    Phone = user.PhoneNumber ?? string.Empty,
                    Role = roles.FirstOrDefault() ?? string.Empty,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                });
            }

            return dtos;
        }

        public async Task<ProfileResponseDTO?> GetUserByIdAsync(int id)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
                return null;

            var roles = await _userManager.GetRolesAsync(user);

            return new ProfileResponseDTO
            {
                Id = user.Id,
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                Phone = user.PhoneNumber ?? string.Empty,
                Role = roles.FirstOrDefault() ?? string.Empty,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<bool> ToggleUserStatusAsync(int id, bool isActive)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
                return false;

            user.IsActive = isActive;
            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }
    }
}

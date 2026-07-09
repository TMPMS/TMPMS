using TMPMS.DTOs;

namespace Services.Interfaces
{
    public interface IProfileService
    {
        Task<ProfileResponseDTO?> GetProfileAsync(int userId);

        Task<bool> UpdateProfileAsync(int userId, UpdateProfileDTO dto);

        Task<bool> ChangePasswordAsync(int userId, ChangePasswordDTO dto);

        Task<List<ProfileResponseDTO>> GetAllUsersAsync();

        Task<ProfileResponseDTO?> GetUserByIdAsync(int id);

        Task<bool> ToggleUserStatusAsync(int id, bool isActive);
    }
}

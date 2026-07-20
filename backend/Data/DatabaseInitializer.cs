using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using BusinessObjects;

namespace TMPMS.Data
{
    public static class DatabaseInitializer
    {
        public static async Task InitializeAsync(IServiceProvider serviceProvider)
        {
            var dbContext = serviceProvider.GetRequiredService<TMPMSDbContext>();

            // 1. Run raw SQL migrations for Orders table columns
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(@"
                    IF NOT EXISTS (
                        SELECT * FROM sys.columns 
                        WHERE object_id = OBJECT_ID('Orders') AND name = 'DeliveryMethod'
                    )
                    BEGIN
                        ALTER TABLE Orders ADD DeliveryMethod NVARCHAR(255) NULL;
                    END
                ");

                await dbContext.Database.ExecuteSqlRawAsync(@"
                    IF NOT EXISTS (
                        SELECT * FROM sys.columns 
                        WHERE object_id = OBJECT_ID('Orders') AND name = 'ShippingFee'
                    )
                    BEGIN
                        ALTER TABLE Orders ADD ShippingFee DECIMAL(18, 2) NULL;
                    END
                ");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error migrating database schema: " + ex.Message);
            }

            // 2. Log total medicines count
            try
            {
                var medCount = await dbContext.Medicines.CountAsync();
                Console.WriteLine("=== TOTAL MEDICINES IN SQL SERVER: " + medCount + " ===");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error querying medicines count: " + ex.Message);
            }

            var roleManager = serviceProvider.GetRequiredService<RoleManager<Role>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<User>>();

            // 3. Seed Roles
            var roles = new List<Role>
            {
                new Role { Name = "Admin", Description = "System Administrator" },
                new Role { Name = "Pharmacy", Description = "Pharmacy Staff" },
                new Role { Name = "User", Description = "Customer" }
            };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role.Name))
                {
                    await roleManager.CreateAsync(role);
                }
            }

            // 4. Seed Admin account
            if (await userManager.FindByEmailAsync("admin@tmpms.com") == null)
            {
                var admin = new User
                {
                    UserName = "admin",
                    Email = "admin@tmpms.com",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await userManager.CreateAsync(admin, "Admin@123");
                await userManager.AddToRoleAsync(admin, "Admin");
            }
            else
            {
                var admin = await userManager.FindByEmailAsync("admin@tmpms.com");
                if (admin != null)
                {
                    await userManager.SetLockoutEndDateAsync(admin, null);
                    await userManager.ResetAccessFailedCountAsync(admin);
                    admin.IsActive = true;
                    await userManager.UpdateAsync(admin);
                }
            }

            // 5. Seed Pharmacy account
            if (await userManager.FindByEmailAsync("pharmacy@tmpms.com") == null)
            {
                var pharmacy = new User
                {
                    UserName = "pharmacy",
                    Email = "pharmacy@tmpms.com",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await userManager.CreateAsync(pharmacy, "Pharmacy@123");
                await userManager.AddToRoleAsync(pharmacy, "Pharmacy");
            }
            else
            {
                var pharmacy = await userManager.FindByEmailAsync("pharmacy@tmpms.com");
                if (pharmacy != null)
                {
                    await userManager.SetLockoutEndDateAsync(pharmacy, null);
                    await userManager.ResetAccessFailedCountAsync(pharmacy);
                    pharmacy.IsActive = true;
                    await userManager.UpdateAsync(pharmacy);
                }
            }

            // 6. Seed User account
            if (await userManager.FindByEmailAsync("user@tmpms.com") == null)
            {
                var user = new User
                {
                    UserName = "user",
                    Email = "user@tmpms.com",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await userManager.CreateAsync(user, "User@123");
                await userManager.AddToRoleAsync(user, "User");
            }
            else
            {
                var user = await userManager.FindByEmailAsync("user@tmpms.com");
                if (user != null)
                {
                    await userManager.SetLockoutEndDateAsync(user, null);
                    await userManager.ResetAccessFailedCountAsync(user);
                    user.IsActive = true;
                    await userManager.UpdateAsync(user);
                }
            }
        }
    }
}

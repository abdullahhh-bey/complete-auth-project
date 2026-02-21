using authproject.Models;
using Microsoft.EntityFrameworkCore;

namespace authproject.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        //I will be having "consumers" as table for model "Users" in DB
        public DbSet<User> Consumers { get; set; }
        
    }
}

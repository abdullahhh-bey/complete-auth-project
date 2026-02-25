using authproject.Models;
using Microsoft.EntityFrameworkCore;

namespace authproject.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        // I will be having "consumers" as table for model "Users" in DB
        public DbSet<User> Consumers { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Explicitly configure the primary key and table name so EF always knows the key at design time.
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.ToTable("Consumers");
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}

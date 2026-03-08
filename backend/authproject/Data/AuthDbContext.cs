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
        public DbSet<Chat> Chats { get; set; } = null!;
        public DbSet<ChatParticipant> ChatParticipants { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Explicitly configure the primary key and table name so EF always knows the key at design time.
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.ToTable("Consumers");
            });

            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.ToTable("Messages");
                entity.HasOne(m => m.Chat)
                      .WithMany(c => c.Messages)
                      .HasForeignKey(m => m.ChatId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ChatParticipant>(entity =>
            {
                // Composite Primary Key for the junction table
                entity.HasKey(cp => new { cp.ChatId, cp.UserId });

                entity.HasOne(cp => cp.Chat)
                      .WithMany(c => c.Participants)
                      .HasForeignKey(cp => cp.ChatId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(cp => cp.User)
                      .WithMany()
                      .HasForeignKey(cp => cp.UserId)
                      .OnDelete(DeleteBehavior.NoAction); // Prevent multiple cascade paths
            });

            base.OnModelCreating(modelBuilder);
        }

        
    }
}

using System;
using System.IO;
using System.Linq;
using authproject.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace authproject.Data
{
    // This is used by EF tools (migrations, update) to create the DbContext at design time.
    public class AuthDbContextFactory : IDesignTimeDbContextFactory<AuthDbContext>
    {
        public AuthDbContext CreateDbContext(string[] args)
        {
            // Try to find a project directory that contains appsettings.json (walk up the folder tree).
            static string? FindProjectDirectory(string start)
            {
                var dir = new DirectoryInfo(start);
                while (dir != null)
                {
                    // Prefer appsettings.json but also accept a .csproj presence as a hint.
                    if (File.Exists(Path.Combine(dir.FullName, "appsettings.json")) ||
                        dir.GetFiles("*.csproj").Any())
                    {
                        return dir.FullName;
                    }

                    dir = dir.Parent;
                }

                return null;
            }

            var current = Directory.GetCurrentDirectory();
            var projectDir = FindProjectDirectory(current) ?? AppContext.BaseDirectory ?? current;

            var configuration = new ConfigurationBuilder()
                .SetBasePath(projectDir)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
                .AddEnvironmentVariables()
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<AuthDbContext>();
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            // Fallback to environment variable if needed
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = Environment.GetEnvironmentVariable("DefaultConnection");
            }

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                // Provide a clear, actionable error for design-time tools
                throw new InvalidOperationException(
                    $"Could not find a valid connection string named 'DefaultConnection'. " +
                    $"Searched base path: '{projectDir}'. Ensure appsettings.json contains " +
                    $"a valid ConnectionStrings:DefaultConnection entry, or set the " +
                    $"'DefaultConnection' environment variable for design-time operations.");
            }

            optionsBuilder.UseNpgsql(connectionString);

            return new AuthDbContext(optionsBuilder.Options);
        }
    }
}
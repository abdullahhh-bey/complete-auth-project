using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace authproject.Migrations
{
    /// <inheritdoc />
    public partial class AddedFieldToUserModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ResetToken",
                table: "Consumers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResetTokenExpiry",
                table: "Consumers",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResetToken",
                table: "Consumers");

            migrationBuilder.DropColumn(
                name: "ResetTokenExpiry",
                table: "Consumers");
        }
    }
}

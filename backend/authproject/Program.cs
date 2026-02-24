using authproject.Application.EmailService;
using authproject.Data;
using Microsoft.EntityFrameworkCore;
using authproject.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR(); //Added the SignalR service in IOC container
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();


//Adding the connction string 
var connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"];

builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.UseStaticFiles();
// Allow index.html to be served at root URL
app.UseDefaultFiles();


// Clients will connect to: https://authproject.com/chathub
// Think of this like MapControllers() but for SignalR Hubs
// The route "/chathub" is what clients use to connect
app.MapHub<ChatHub>("/chathub");

app.Run();

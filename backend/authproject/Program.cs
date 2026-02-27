using authproject.Application;
using authproject.Application.EmailService;
using authproject.Data;
using authproject.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

//will  add chat room later
// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR(); //Added the SignalR service in IOC container
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddSingleton<ConnectionManager>();


//Adding the connction string 
var connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"];

builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.WithOrigins("http://localhost:5173") // Allow the React Vite dev server
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials(); // Required for SignalR WebSocket connections
    });
});


builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Standard JWT validation for HTTP requests
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JWT:Issuer"],
            ValidAudience = builder.Configuration["JWT:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["JWT:Secret"])
            )
        };

        // ═══════════════════════════════════════════════════════════
        // SIGNALR-SPECIFIC JWT CONFIGURATION
        // ═══════════════════════════════════════════════════════════

        // SignalR sends the token in a QUERY STRING (not header)
        // We need to extract it and validate it
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Get the access token from query string
                // SignalR client will send: /chathub?access_token=YOUR_JWT_TOKEN
                var accessToken = context.Request.Query["access_token"];

                // Get the path that was requested
                var path = context.HttpContext.Request.Path;

                // If the request is for our SignalR hub AND token exists
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/chathub"))
                {
                    // Set the token so JWT middleware can validate it
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });



var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Temporarily disabling HTTPS redirection for local dev to avoid CORS preflight failures on redirect
// app.UseHttpsRedirection();

app.UseRouting();
app.UseCors("AllowAll");

app.UseAuthentication();
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

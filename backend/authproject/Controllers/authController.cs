using authproject.Application.EmailService;
using authproject.Data;
using authproject.DTOs;
using authproject.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace authproject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class authController : ControllerBase
    {
        private readonly AuthDbContext _context;
        private readonly TokenService _tokenservice;
        private readonly IEmailService _emailService;

        public authController(AuthDbContext context, TokenService tokenservice, IEmailService emailService)
        {
            _context = context;
            _tokenservice = tokenservice;
            _emailService = emailService;
        }   


       [HttpGet]
       public IActionResult GetUsers()
       {
            var users = _context.Consumers.ToList();
            if ( users.Count == 0)
            {
                return NotFound("No users yet");
            }
            return Ok(users);
       }


        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            //password confirmatrion
            if(dto.Password != dto.ConfirmPassword)
            {
                return BadRequest("Passwords do not match");
            }

            //user email check
            var userCheck = _context.Consumers.FirstOrDefault(u => u.Email == dto.Email);
            if(userCheck != null)
            {
                return BadRequest("Email already exists");
            }

            //add the user
            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password) 
            };

            _context.Consumers.Add(user);
            await _context.SaveChangesAsync();

            //return response
            return Ok("User registered successfully");
        }



        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            //check for email 
            var user = _context.Consumers
                .FirstOrDefault(x => x.Email == dto.Email);

            if (user == null)
                return BadRequest("Invalid credentials ( No user with this email )");

            //decrypt and compare password hashes
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!isPasswordValid)
                return BadRequest("Invalid credentials");

            //if matches, generate token 
            var token = _tokenservice.CreateToken(user);


            //return response
            return Ok(new ResponseTokenDTO
            {
                message = "Login successful",
                Token = token
            });
        }



        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPassDTO dto)
        {
            //Check if email is registered or not
            var user = _context.Consumers.FirstOrDefault(x => x.Email == dto.Email);
            if (user == null)
            {
                return Ok("If email exists, link will be sent to it.");
            }

            // Generate secure token
            var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
            var encrypttoken = BCrypt.Net.BCrypt.HashPassword(token);
            user.ResetToken = encrypttoken;
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(10);

            await _context.SaveChangesAsync();

            // In real project → send via EmailService
            //var resetLink = $"https://yourfrontend.com/reset-password?token={token}";

            var resetLink = $"http://localhost:5173/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";

            var body = $@"
                <h2>Password Reset</h2>
                <p>Click the link below to set a new password:</p>
                <p><a href='{resetLink}'>Reset Password</a></p>
                <p>Or use this token: {token}</p>
                <p>This link expires in 10 minutes.</p>
            ";

            await _emailService.SendEmailAsync(
                user.Email,
                "Reset Your Password",
                body
            );

            Console.WriteLine("Email Sent");

            return Ok("Reset link sent to email.");
        }



        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword( ResetPassDTO dto)
        {
            //Checking if the token is present 
            var user = _context.Consumers
            .FirstOrDefault(x => x.Email == dto.Email);

            if (user == null)
                return BadRequest("No user registered");

            //Check user and do the token checkup with encryption
            var checkUser = BCrypt.Net.BCrypt.Verify(dto.ResetToken, user.ResetToken);
            if (checkUser == false)
                return BadRequest("Invalid token");

            if (user.ResetTokenExpiry < DateTime.UtcNow)
                return BadRequest("Token expired");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            //Once pasword changed, remove the previous token and expiry of previous token
            user.ResetToken = null;
            user.ResetTokenExpiry = null;

            await _context.SaveChangesAsync();

            return Ok("Password reset successful.");
        }


    }
}

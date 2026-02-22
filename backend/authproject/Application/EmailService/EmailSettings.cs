namespace authproject.Application.EmailService
{
    //We could also use IConfiguration provider, but instead, used Optional Pattern
    public class EmailSettings
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FromName { get; set; } = string.Empty;
    }
}

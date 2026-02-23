using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace authproject.Hubs
{
    // Every Hub MUST inherit from Hub class
    // Hub is the base class provided by SignalR
    public class ChatHub : Hub
    {
        // This method will be called BY CLIENTS
        // It's like an API endpoint, but for real-time communication
        public async Task SendMessage(string user, string message)
        {
            // Clients.All means "send to ALL connected clients"
            // SendAsync is the method that pushes data to clients
            // "ReceiveMessage" is the event name clients listen for
            // user and message are parameters sent to the client
            //Basically recievemessga eis the function that other connected clients listen to, When client sends message
            //receivemessgae funtion of alk other clients including caller client will be called and show the client user and message
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        public override async Task OnConnectedAsync()
        {
            // Context.ConnectionId is a unique ID for this connection
            // Something like: "x8s9d7f6-3h2j-4k5l-9m8n-7b6v5c4x3z2a"
            Console.WriteLine($"Client connected: {Context.ConnectionId}");

            // ALWAYS call the base method
            // This ensures SignalR's internal tracking works
            await base.OnConnectedAsync();
        }

        // Optional: Track when users disconnect
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Client disconnected: {Context.ConnectionId}");

            // exception is non-null when the disconnect was due to an error
            await base.OnDisconnectedAsync(exception);
        }
    }
}

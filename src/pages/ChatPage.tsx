import React, { useEffect, useState, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import Cookies from 'js-cookie';
import { useAuth } from '../context/AuthContext';
import styles from './ChatPage.module.css';
import { Send, Users, UserCircle2, LogOut, Paperclip, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface ChatMessage {
    id: string; // generate a local unique id for mapping
    fullName: string;
    email: string;
    content: string;
    sentAt: string; // ISO string
    isSystem?: boolean;
}

interface OnlineUser {
    userId: string;
    fullName: string;
    email: string;
    connectedAt: string;
}

// --- Helper Functions ---
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 45%)`;
};

const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const ChatPage: React.FC = () => {
    const { user, logout } = useAuth();

    // Fallback names if decoded token doesn't have exact fields
    const currentUserName = user?.name || "User";
    const currentUserEmail = user?.email || "";

    // --- State ---
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState<'Connecting...' | 'Online' | 'Reconnecting...' | 'Disconnected'>('Connecting...');

    const [inputValue, setInputValue] = useState('');
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Auto Scroll ---
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]);

    // --- SignalR Setup ---
    useEffect(() => {
        const token = Cookies.get('authToken') || localStorage.getItem('authToken');

        if (!token) {
            console.warn("No token available for SignalR connection.");
            setStatus('Disconnected');
            return;
        }

        // Initialize Connection
        const newConnection = new HubConnectionBuilder()
            // Important: Route path should match the .NET setup. If the React dev server is proxying, use "/chathub".
            // Since Vite proxy might not be perfectly set up for websockets in all environments yet, 
            // It's safer to point to the absolute URL of the backend hub during dev:
            .withUrl("http://localhost:5034/chathub", {
                accessTokenFactory: () => token
            })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .build();

        // Setup Event Listeners
        newConnection.on("receivemessage", (fullName: string, email: string, message: string) => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                fullName,
                email,
                content: message,
                sentAt: new Date().toISOString()
            }]);
        });

        newConnection.on("LoadChatHistory", (history: any[]) => {
            if (!history) return;
            const formattedHistory: ChatMessage[] = history.map(msg => ({
                id: crypto.randomUUID(),
                fullName: msg.fullName,
                email: msg.email,
                content: msg.content,
                sentAt: msg.sentAt
            }));
            setMessages(formattedHistory);
        });

        newConnection.on("userconnected", (fullName: string) => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                fullName: "System",
                email: "system",
                content: `${fullName} joined the chat`,
                sentAt: new Date().toISOString(),
                isSystem: true
            }]);
            newConnection.invoke("GetOnlineUsers").catch(console.error);
        });

        newConnection.on("userdisconnected", (fullName: string) => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                fullName: "System",
                email: "system",
                content: `${fullName} left the chat`,
                sentAt: new Date().toISOString(),
                isSystem: true
            }]);
            newConnection.invoke("GetOnlineUsers").catch(console.error);
        });

        newConnection.on("onlineuserslist", (users: OnlineUser[]) => {
            setOnlineUsers(users || []);
        });

        newConnection.on("usertyping", (fullName: string) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.add(fullName);
                return next;
            });
        });

        newConnection.on("userstoppedtyping", (fullName: string) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(fullName);
                return next;
            });
        });

        // Connection Lifecycle Handlers
        newConnection.onreconnecting(() => {
            setStatus('Reconnecting...');
        });

        newConnection.onreconnected(() => {
            setStatus('Online');
            newConnection.invoke("GetOnlineUsers").catch(console.error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                fullName: "System",
                email: "system",
                content: "Reconnected to chat server.",
                sentAt: new Date().toISOString(),
                isSystem: true
            }]);
        });

        newConnection.onclose(() => {
            setStatus('Disconnected');
        });

        // Start Connection
        const startConnection = async () => {
            try {
                await newConnection.start();
                setStatus('Online');
                setConnection(newConnection);
            } catch (err) {
                console.error("SignalR Connection Error: ", err);
                setStatus('Disconnected');
                // You could optionally redirect to login here if the error is 401 Unauthorized
            }
        };

        startConnection();

        // Cleanup on unmount
        return () => {
            newConnection.stop();
        };
    }, []);

    // --- Handlers ---
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const message = inputValue.trim();
        if (!message || !connection || status !== 'Online') return;

        try {
            await connection.invoke("SendMessage", message);
            setInputValue(''); // clear input

            // Immediately stop typing indicator
            await connection.invoke("StopTypingIndicator");
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        } catch (err) {
            console.error("Failed to send message: ", err);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);

        if (!connection || status !== 'Online') return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (e.target.value.trim() !== "") {
            connection.invoke("SendTypingIndicator").catch(console.error);

            typingTimeoutRef.current = setTimeout(() => {
                connection.invoke("StopTypingIndicator").catch(console.error);
            }, 2000);
        } else {
            connection.invoke("StopTypingIndicator").catch(console.error);
        }
    };

    // --- Render Helpers ---
    const getTypingText = () => {
        if (typingUsers.size === 0) return null;
        const users = Array.from(typingUsers);
        if (users.length === 1) return `${users[0]} is typing...`;
        if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
        return `${users.length} people are typing...`;
    };

    return (
        <div className={styles.appContainer}>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2>SecureLocks</h2>
                </div>
                <div className={styles.sidebarSearch}>
                    <div className={styles.searchBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search members..." />
                    </div>
                </div>
                <div className={styles.sidebarListHeader}>
                    <h3>Online Members ({onlineUsers.length})</h3>
                </div>
                <ul className={styles.userList}>
                    {onlineUsers.map(u => (
                        <li key={u.userId}>
                            <div className={styles.userAvatar} style={{ backgroundColor: stringToColor(u.fullName) }}>
                                {getInitials(u.fullName)}
                            </div>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{u.fullName}</div>
                                <div className={styles.userStatus}>online</div>
                            </div>
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Main Chat Area */}
            <main className={styles.chatMain}>
                <header className={styles.chatHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.chatAvatarIcon}>
                            <Users size={24} />
                        </div>
                        <div className={styles.chatInfo}>
                            <h2>Global Chat</h2>
                            <span className={`${styles.statusBadge} ${status === 'Online' ? styles.online : styles.offline}`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    <div className={styles.headerRight}>
                        <div className={styles.currentUserInfo}>
                            <UserCircle2 size={24} />
                            <span>{currentUserName}</span>
                        </div>
                        <button onClick={logout} className={styles.iconButton} title="Sign Out">
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <div className={styles.messagesContainer}>
                    <div className={styles.messagesWrapper}>
                        <AnimatePresence>
                            {messages.map((msg) => {
                                if (msg.isSystem) {
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={styles.systemMessage}
                                        >
                                            {msg.content}
                                        </motion.div>
                                    );
                                }

                                const isSentByMe = msg.fullName === currentUserName || msg.email === currentUserEmail;

                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`${styles.messageRow} ${isSentByMe ? styles.sent : styles.received}`}
                                    >
                                        <div className={styles.messageBubble}>
                                            {!isSentByMe && (
                                                <div className={styles.messageSenderName} style={{ color: stringToColor(msg.fullName) }}>
                                                    {msg.fullName}
                                                </div>
                                            )}
                                            <div className={styles.messageText}>
                                                {msg.content}
                                            </div>
                                            <div className={styles.messageTime}>
                                                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Typing Indicator */}
                <div className={`${styles.typingIndicator} ${typingUsers.size > 0 ? styles.visible : ''}`}>
                    <div className={styles.dots}>
                        <span></span><span></span><span></span>
                    </div>
                    <em>{getTypingText()}</em>
                </div>

                <footer className={styles.chatFooter}>
                    <button className={styles.iconButton} aria-label="Attach file">
                        <Paperclip size={20} />
                    </button>
                    <form onSubmit={handleSendMessage} className={styles.inputForm}>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={handleInput}
                                placeholder="Write a message..."
                                maxLength={500}
                                autoComplete="off"
                            />
                            <button type="button" className={styles.emojiBtn} aria-label="Add emoji">
                                <Smile size={20} />
                            </button>
                        </div>
                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={!inputValue.trim() || status !== 'Online'}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </footer>
            </main>
        </div>
    );
};

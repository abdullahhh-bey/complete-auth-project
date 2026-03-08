import React, { useEffect, useState, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import Cookies from 'js-cookie';
import { useAuth } from '../context/AuthContext';
import styles from './ChatPage.module.css';
import { Send, Users, UserCircle2, LogOut, Paperclip, Smile, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface ChatMessage {
    id: string; // generate a local unique id for mapping
    fullName: string;
    email: string;
    content: string;
    sentAt: string; // ISO string
    chatId?: string | null;
    senderId?: string | null;
    isSystem?: boolean;
    isRead?: boolean;
    readAt?: string | null;
}

interface ChatRoom {
    id: string;
    type: number; // 1 = Private, 2 = Group
    name: string | null;
    adminId: string | null;
    displayName: string;
    createdAt: string;
    participants: { userId: string; fullName: string; email: string; }[];
}

interface OnlineUser {
    userId: string;
    fullName: string;
    email: string;
    connectedAt: string;
}

interface DirectoryUser {
    id: string;
    fullName: string;
    email: string;
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

    const currentUserName = user?.name || "User";
    const currentUserEmail = user?.email || "";

    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [allUsers, setAllUsers] = useState<DirectoryUser[]>([]);
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState<'Connecting...' | 'Online' | 'Reconnecting...' | 'Disconnected'>('Connecting...');

    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const activeChatIdRef = useRef<string | null>(null);

    // Modal State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroupUsers, setSelectedGroupUsers] = useState<Set<string>>(new Set());

    const userRef = useRef(user);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
        setTypingUsers(new Set()); // Reset typing dots when switching rooms
    }, [activeChatId]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const [inputValue, setInputValue] = useState('');
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]);

    useEffect(() => {
        if (!connection || status !== 'Online' || !activeChatId) return;
        connection.invoke("MarkMessagesAsRead", activeChatId).catch(console.error);
    }, [activeChatId, connection, status]);

    const fetchChats = async (token: string) => {
        try {
            const res = await fetch('http://localhost:5034/api/chat', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setChats(await res.json());
        } catch (err) {
            console.error("Failed to fetch chats:", err);
        }
    };

    useEffect(() => {
        const token = Cookies.get('authToken') || localStorage.getItem('authToken');
        if (!token) {
            setStatus('Disconnected');
            return;
        }

        const fetchAllUsers = async () => {
            try {
                const res = await fetch('http://localhost:5034/api/auth');
                if (res.ok) setAllUsers(await res.json());
            } catch (err) {
                console.error("Failed to fetch user directory:", err);
            }
        };

        fetchAllUsers();
        fetchChats(token);

        const newConnection = new HubConnectionBuilder()
            .withUrl("http://localhost:5034/chathub", { accessTokenFactory: () => token })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .build();

        newConnection.on("ReceiveMessage", (fullName: string, email: string, message: string, senderId: string, chatId: string | null) => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                fullName,
                email,
                content: message,
                sentAt: new Date().toISOString(),
                senderId,
                chatId: chatId ?? null
            }]);

            if (activeChatIdRef.current && (chatId ?? null) === activeChatIdRef.current) {
                newConnection.invoke("MarkMessagesAsRead", activeChatIdRef.current).catch(console.error);
            }
        });

        newConnection.on("LoadChatHistory", (history: any[]) => {
            if (!history) return;
            const formattedHistory: ChatMessage[] = history.map(msg => ({
                id: crypto.randomUUID(),
                fullName: msg.fullName,
                email: msg.email,
                content: msg.content,
                sentAt: msg.sentAt,
                chatId: msg.chatId ?? null,
                senderId: msg.senderId,
                isRead: msg.isRead ?? false,
                readAt: msg.readAt ?? null
            }));
            setMessages(formattedHistory);
        });

        newConnection.on("MessagesRead", (_readerId: string, chatId: string) => {
            setMessages(prev => prev.map(msg => {
                if (msg.senderId === userRef.current?.id && (msg.chatId ?? null) === (chatId ?? null) && !msg.isRead) {
                    return { ...msg, isRead: true, readAt: new Date().toISOString() };
                }
                return msg;
            }));
        });

        newConnection.on("userconnected", (fullName: string) => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                fullName: "System",
                email: "system",
                content: `${fullName} joined the platform`,
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
                content: `${fullName} left the platform`,
                sentAt: new Date().toISOString(),
                isSystem: true
            }]);
            newConnection.invoke("GetOnlineUsers").catch(console.error);
        });

        newConnection.on("onlineuserslist", (users: OnlineUser[]) => {
            setOnlineUsers(users || []);
        });

        newConnection.on("usertyping", (fullName: string, _senderId: string, chatId: string | null) => {
            if (chatId === null && activeChatIdRef.current !== null) return;
            if (chatId !== null && activeChatIdRef.current !== chatId) return; // Wait: if senderId is typing in the same chat room, we show it!

            setTypingUsers(prev => {
                const next = new Set(prev);
                next.add(fullName);
                return next;
            });
        });

        newConnection.on("userstoppedtyping", (fullName: string, _senderId: string, _chatId: string | null) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(fullName);
                return next;
            });
        });

        newConnection.onreconnecting(() => setStatus('Reconnecting...'));
        newConnection.onreconnected(() => {
            setStatus('Online');
            newConnection.invoke("GetOnlineUsers").catch(console.error);
        });
        newConnection.onclose(() => setStatus('Disconnected'));

        const startConnection = async () => {
            try {
                await newConnection.start();
                setStatus('Online');
                setConnection(newConnection);
            } catch (err) {
                console.error("SignalR Connection Error: ", err);
                setStatus('Disconnected');
            }
        };

        startConnection();
        return () => { newConnection.stop(); };
    }, []);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const message = inputValue.trim();
        if (!message || !connection || status !== 'Online') return;

        try {
            await connection.invoke("SendMessage", message, activeChatId);
            setInputValue('');
            await connection.invoke("StopTypingIndicator", activeChatIdRef.current);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        } catch (err) {
            console.error("Failed to send message: ", err);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (!connection || status !== 'Online') return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (e.target.value.trim() !== "") {
            connection.invoke("SendTypingIndicator", activeChatIdRef.current).catch(console.error);
            typingTimeoutRef.current = setTimeout(() => {
                connection.invoke("StopTypingIndicator", activeChatIdRef.current).catch(console.error);
            }, 2000);
        } else {
            connection.invoke("StopTypingIndicator", activeChatIdRef.current).catch(console.error);
        }
    };

    const startPrivateChat = async (targetUserId: string) => {
        try {
            const token = Cookies.get('authToken') || localStorage.getItem('authToken');
            const res = await fetch('http://localhost:5034/api/chat/private', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targetUserId })
            });
            if (res.ok) {
                const data = await res.json();
                fetchChats(token!);
                setActiveChatId(data.chatId);
            }
        } catch (err) { console.error("Error creating private chat", err); }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedGroupUsers.size === 0) return;
        try {
            const token = Cookies.get('authToken') || localStorage.getItem('authToken');
            const res = await fetch('http://localhost:5034/api/chat/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newGroupName, userIds: Array.from(selectedGroupUsers) })
            });
            if (res.ok) {
                const data = await res.json();
                fetchChats(token!);
                setActiveChatId(data.chatId);
                setIsGroupModalOpen(false);
                setNewGroupName('');
                setSelectedGroupUsers(new Set());
            }
        } catch (err) { console.error("Error creating group", err); }
    };

    const getTypingText = () => {
        if (typingUsers.size === 0) return null;
        const users = Array.from(typingUsers);
        if (users.length === 1) return `${users[0]} is typing...`;
        if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
        return `${users.length} people are typing...`;
    };

    const privateChats = chats.filter(c => c.type === 1);
    const groupChats = chats.filter(c => c.type === 2);

    return (
        <div className={styles.appContainer}>
            {/* Modal for Group Creation */}
            <AnimatePresence>
                {isGroupModalOpen && (
                    <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={styles.modalContent} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
                            <div className={styles.modalHeader}>
                                <h2>Create Group</h2>
                                <button onClick={() => setIsGroupModalOpen(false)} className={styles.closeBtn}><X size={20} /></button>
                            </div>
                            <div className={styles.modalBody}>
                                <input type="text" placeholder="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className={styles.modalInput} />
                                <h4>Select Members</h4>
                                <ul className={styles.selectionList}>
                                    {allUsers.filter(u => u.id !== user?.id).map(u => (
                                        <li key={u.id} onClick={() => {
                                            const newSet = new Set(selectedGroupUsers);
                                            newSet.has(u.id) ? newSet.delete(u.id) : newSet.add(u.id);
                                            setSelectedGroupUsers(newSet);
                                        }} className={selectedGroupUsers.has(u.id) ? styles.selectedUser : ''}>
                                            <div className={styles.userAvatar} style={{ backgroundColor: stringToColor(u.fullName) }}>{getInitials(u.fullName)}</div>
                                            <span>{u.fullName}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.modalFooter}>
                                <button className={styles.btnPrimary} onClick={handleCreateGroup}>Create Group</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}><h2>SecureLocks</h2></div>
                <div className={styles.sidebarSearch}>
                    <div className={styles.searchBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search members..." />
                    </div>
                </div>

                <div className={styles.sidebarListHeader}><h3>Channels</h3></div>
                <ul className={styles.userList}>
                    <li onClick={() => setActiveChatId(null)} style={{ backgroundColor: activeChatId === null ? 'var(--color-muted)' : 'transparent' }}>
                        <div className={styles.userAvatar} style={{ backgroundColor: 'var(--color-primary)' }}><Users size={20} /></div>
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>Global Chat</div>
                            <div className={styles.userStatus}>Public</div>
                        </div>
                    </li>
                </ul>

                <div className={styles.sidebarListHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Groups</h3>
                    <button onClick={() => setIsGroupModalOpen(true)} className={styles.addBtn}><Plus size={16} /></button>
                </div>
                <ul className={styles.userList}>
                    {groupChats.map(group => (
                        <li key={group.id} onClick={() => setActiveChatId(group.id)} style={{ backgroundColor: activeChatId === group.id ? 'var(--color-muted)' : 'transparent' }}>
                            <div className={styles.userAvatar} style={{ backgroundColor: stringToColor(group.displayName) }}><Users size={20} /></div>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{group.displayName}</div>
                                <div className={styles.userStatus}>{group.participants.length} members</div>
                            </div>
                        </li>
                    ))}
                </ul>

                <div className={styles.sidebarListHeader}><h3>Direct Messages</h3></div>
                <ul className={styles.userList}>
                    {privateChats.map(chat => {
                        // Find the other user from the directory to check online status easily
                        const otherParticipant = chat.participants.find(p => p.userId !== user?.id);
                        const isOnline = onlineUsers.some(ou => ou.userId === otherParticipant?.userId);

                        return (
                            <li key={chat.id} onClick={() => setActiveChatId(chat.id)} style={{ backgroundColor: activeChatId === chat.id ? 'var(--color-muted)' : 'transparent' }}>
                                <div className={styles.userAvatar} style={{ backgroundColor: stringToColor(chat.displayName), position: 'relative' }}>
                                    {getInitials(chat.displayName)}
                                    {isOnline && <span className={styles.onlineDot} style={{
                                        position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', backgroundColor: '#4CAF50',
                                        borderRadius: '50%', border: '2px solid var(--color-background)'
                                    }}></span>}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{chat.displayName}</div>
                                    <div className={styles.userStatus} style={{ color: isOnline ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                        {isOnline ? 'online' : 'offline'}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <div className={styles.sidebarListHeader}><h3>User Directory</h3></div>
                <ul className={styles.userList}>
                    {allUsers.filter(u => u.id !== user?.id).map(u => {
                        const isOnline = onlineUsers.some(ou => ou.userId === u.id);
                        return (
                            <li key={u.id} onClick={() => startPrivateChat(u.id)}>
                                <div className={styles.userAvatar} style={{ backgroundColor: stringToColor(u.fullName), position: 'relative' }}>
                                    {getInitials(u.fullName)}
                                    {isOnline && <span className={styles.onlineDot} style={{
                                        position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', backgroundColor: '#4CAF50',
                                        borderRadius: '50%', border: '2px solid var(--color-background)'
                                    }}></span>}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{u.fullName}</div>
                                    <div className={styles.userStatus} style={{ color: isOnline ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                        Start chat
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </aside>

            {/* Main Chat Area */}
            <main className={styles.chatMain}>
                <header className={styles.chatHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.chatAvatarIcon}>
                            {activeChatId === null ? <Users size={24} /> : <UserCircle2 size={24} />}
                        </div>
                        <div className={styles.chatInfo}>
                            <h2>
                                {activeChatId === null
                                    ? "Global Chat"
                                    : chats.find(c => c.id === activeChatId)?.displayName || "Chat"}
                            </h2>
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
                            {messages.filter(msg => (msg.chatId ?? null) === (activeChatId ?? null)).map((msg) => {
                                if (msg.isSystem) {
                                    return (
                                        <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={styles.systemMessage}>
                                            {msg.content}
                                        </motion.div>
                                    );
                                }

                                const isSentByMe = msg.fullName === currentUserName || msg.email === currentUserEmail;

                                return (
                                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${styles.messageRow} ${isSentByMe ? styles.sent : styles.received}`}>
                                        <div className={styles.messageBubble}>
                                            {!isSentByMe && (
                                                <div className={styles.messageSenderName} style={{ color: stringToColor(msg.fullName) }}>{msg.fullName}</div>
                                            )}
                                            <div className={styles.messageText}>{msg.content}</div>
                                            <div className={styles.messageTime}>
                                                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isSentByMe && msg.chatId && (
                                                    <span className={styles.readReceipt} style={{ marginLeft: '4px', fontSize: '10px' }}>
                                                        {msg.isRead ? <span style={{ color: '#4CAF50' }}>✓✓</span> : <span style={{ color: 'rgba(255,255,255,0.5)' }}>✓</span>}
                                                    </span>
                                                )}
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
                    <div className={styles.dots}><span></span><span></span><span></span></div>
                    <em>{getTypingText()}</em>
                </div>

                <footer className={styles.chatFooter}>
                    <button className={styles.iconButton} aria-label="Attach file"><Paperclip size={20} /></button>
                    <form onSubmit={handleSendMessage} className={styles.inputForm}>
                        <div className={styles.inputWrapper}>
                            <input type="text" value={inputValue} onChange={handleInput} placeholder="Write a message..." maxLength={500} autoComplete="off" />
                            <button type="button" className={styles.emojiBtn} aria-label="Add emoji"><Smile size={20} /></button>
                        </div>
                        <button type="submit" className={styles.sendButton} disabled={!inputValue.trim() || status !== 'Online'}><Send size={18} /></button>
                    </form>
                </footer>
            </main>
        </div>
    );
};

"use client"

import { useState, useEffect } from "react"
import { Menu, Send, Radio, RadioTower } from "lucide-react"
import { RainbowButton } from "../components/ui/rainbow-button"
import { Input } from "../components/ui/input"
import { Meteors } from "../components/ui/meteors"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import ReactMarkdown from 'react-markdown'
import { WordRotate } from "../components/ui/word-rotate"

export default function Home() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListenMode, setIsListenMode] = useState(false);
    const [lastTriggerTime, setLastTriggerTime] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [entityId, setEntityId] = useState('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [connectedAccountId, setConnectedAccountId] = useState(null);

    const checkAuthStatus = async (entityIdToCheck) => {
        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ entityId: entityIdToCheck })
            });

            const data = await response.json();
            
            if (response.ok && data.status === 'connected') {
                if (data.connectedAccountId) {
                    setConnectedAccountId(data.connectedAccountId);
                    localStorage.setItem('connectedAccountId', data.connectedAccountId);
                }
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking auth status:', error);
            return false;
        }
    };

    const handleSignIn = async () => {
        if (!entityId.trim()) {
            alert('Please enter an Entity ID');
            return;
        }

        setIsSigningIn(true);
        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ entityId })
            });

            if (!response.ok) throw new Error('Failed to sign in');

            const data = await response.json();
            
            if (data.status === 'initiated' && data.url) {
                localStorage.setItem('pendingEntityId', entityId);
                setIsCheckingAuth(true);
                window.location.href = data.url;
            } else if (data.status === 'connected') {
                setIsSignedIn(true);
                if (data.connectedAccountId) {
                    setConnectedAccountId(data.connectedAccountId);
                    localStorage.setItem('connectedAccountId', data.connectedAccountId);
                }
                // Add welcome message when user signs in
                setMessages([{
                    role: 'assistant',
                    content: "Hi, this is your Executive Assistant. I am equipped with Gmail integration. You can chat with me or click on the chat mode at the top to get me to listen to the emails coming to your inbox",
                    id: Date.now()
                }]);
            }
        } catch (error) {
            console.error('Error signing in:', error);
            alert('Failed to sign in. Please try again.');
        } finally {
            setIsSigningIn(false);
        }
    };

    useEffect(() => {
        const pendingEntityId = localStorage.getItem('pendingEntityId');
        const storedEntityId = localStorage.getItem('signedInEntityId');
        const storedConnectedAccountId = localStorage.getItem('connectedAccountId');

        if (storedConnectedAccountId) {
            setConnectedAccountId(storedConnectedAccountId);
            setIsSignedIn(true);
            setMessages([{
                role: 'assistant',
                content: "Hi, this is your Executive Assistant. I am equipped with Gmail integration. You can chat with me or click on the chat mode at the top to get me to listen to the emails coming to your inbox",
                id: Date.now()
            }]);
        }

        const checkAndSetAuth = async (entityIdToCheck) => {
            const isConnected = await checkAuthStatus(entityIdToCheck);
            if (isConnected) {
                if (pendingEntityId) {
                    localStorage.removeItem('pendingEntityId');
                }
                localStorage.setItem('signedInEntityId', entityIdToCheck);
                setIsSignedIn(true);
                setIsCheckingAuth(false);
                setMessages([{
                    role: 'assistant',
                    content: "Hi, this is your Executive Assistant. I am equipped with Gmail integration. You can chat with me or click on the chat mode at the top to get me to listen to the emails coming to your inbox",
                    id: Date.now()
                }]);
            } else if (!pendingEntityId) {
                localStorage.removeItem('signedInEntityId');
                localStorage.removeItem('connectedAccountId');
                setIsSignedIn(false);
                setIsCheckingAuth(false);
            }
        };

        if (!storedConnectedAccountId) {
            if (pendingEntityId) {
                setEntityId(pendingEntityId);
                setIsCheckingAuth(true);
                checkAndSetAuth(pendingEntityId);
            } else if (storedEntityId) {
                setEntityId(storedEntityId);
                checkAndSetAuth(storedEntityId);
            }
        }
    }, []);

    useEffect(() => {
        let isSubscribed = true;

        const setupTriggerListener = async () => {
            if (!isListenMode) return;

            try {
                const response = await fetch('/api/trigger', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        listenMode: true,
                        connectedAccountId: connectedAccountId
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to setup trigger listener');
                }
                
                if (data.status === 'trigger_received' && isSubscribed) {
                    setLastTriggerTime(new Date());
                    // Improved email formatting
                    const formattedContent = {
                        type: 'email',
                        emailData: {
                            from: data.sender,
                            subject: data.subject,
                            message: data.messageText
                        }
                    };

                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: JSON.stringify(formattedContent),
                        id: Date.now() 
                    }]);
                    setIsListenMode(false);
                } else if (data.status === 'timeout') {
                    console.log('Trigger listener timed out, restarting...');
                    // Optionally restart the listener
                    if (isListenMode && isSubscribed) {
                        setupTriggerListener();
                    }
                }
            } catch (error) {
                console.error('Error setting up trigger listener:', error);
                // Add user feedback for the error
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Failed to setup email listener: ${error.message}`,
                    id: Date.now()
                }]);
                // Disable listen mode on error
                setIsListenMode(false);
            }
        };

        if (isListenMode) {
            setupTriggerListener();
        }

        return () => {
            isSubscribed = false;
        };
    }, [isListenMode, connectedAccountId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input, id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages.concat(userMessage).map(({ role, content }) => ({ 
                        role, 
                        content: typeof content === 'string' ? content : JSON.stringify(content)
                    })),
                    chatHistory: [], // We're already including the full history in messages
                    listenMode: false
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            setMessages(prev => [...prev, { ...data, id: Date.now() }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.',
                id: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const formatContent = (content) => {
        try {
            const parsedContent = JSON.parse(content);
            
            if (parsedContent.type === 'email') {
                const { from, subject, message } = parsedContent.emailData;
                const markdownContent = `
## 📧 New Email Received

**From:** ${from}
**Subject:** ${subject}

---

${message}
                `;
                
                return (
                    <div className="space-y-2 prose prose-invert prose-pre:bg-zinc-800 prose-pre:text-gray-300 max-w-none">
                        <ReactMarkdown>
                            {markdownContent}
                        </ReactMarkdown>
                    </div>
                );
            }

            // Handle existing execution result case
            if (content.includes('\n\nExecution Result: ')) {
                const parts = content.split('\n\nExecution Result: ');
                try {
                    const executionResult = JSON.parse(parts[1]);
                    const markdownContent = `
${parts[0]}

**Execution Result:**
\`\`\`json
${JSON.stringify(executionResult, null, 2)}
\`\`\`
                    `;
                    
                    return (
                        <div className="space-y-2 prose prose-invert prose-pre:bg-zinc-800 prose-pre:text-gray-300 max-w-none">
                            <ReactMarkdown>
                                {markdownContent}
                            </ReactMarkdown>
                        </div>
                    );
                } catch (e) {
                    return (
                        <div className="prose prose-invert max-w-none">
                            <ReactMarkdown>
                                {content}
                            </ReactMarkdown>
                        </div>
                    );
                }
            }
            
            return (
                <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>
                        {content}
                    </ReactMarkdown>
                </div>
            );
        } catch (e) {
            return (
                <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>
                        {content}
                    </ReactMarkdown>
                </div>
            );
        }
    };

    const handleLogout = () => {
        // Clear all stored auth data
        localStorage.removeItem('pendingEntityId');
        localStorage.removeItem('signedInEntityId');
        localStorage.removeItem('connectedAccountId');
        
        // Reset state
        setIsSignedIn(false);
        setEntityId('');
        setConnectedAccountId(null);
        setMessages([]);
        setIsListenMode(false);
    };

    return (
        <main className="flex flex-col h-screen overflow-hidden bg-black text-white">
            <div className="flex flex-col h-full max-w-4xl w-full mx-auto px-4 pb-4">
                {!isSignedIn ? (
                    <div className="flex-grow flex flex-col justify-center items-center">
                        <h1 className="text-4xl sm:text-5xl font-light mb-8">
                            Your own Executive Assistant with{" "}
                            <WordRotate
                                words={["Gmail"]}
                                className="text-gray-500 inline-block"
                            />
                        </h1>
                        <div className="flex flex-col items-center space-y-4">
                            <Input
                                type="text"
                                value={entityId}
                                onChange={(e) => setEntityId(e.target.value)}
                                placeholder="Enter your email address"
                                className="w-64 mb-4 bg-zinc-900 text-white placeholder:text-gray-400"
                            />
                            <RainbowButton 
                                onClick={handleSignIn} 
                                className="text-xl px-8 py-4"
                                disabled={isSigningIn || isCheckingAuth}
                            >
                                {isSigningIn ? 'Signing in...' : 
                                 isCheckingAuth ? 'Checking Authorization...' : 
                                 'Sign In'}
                            </RainbowButton>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="py-6 flex justify-between items-center">
                            <h1 className="text-xl font-medium tracking-wider">EXECUTIVE ASSISTANT</h1>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor="listen-mode" className="text-sm">
                                        {isListenMode ? (
                                            <div className="flex items-center space-x-1">
                                                <RadioTower className="w-4 h-4 text-green-500" />
                                                <span>Listening</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1">
                                                <Radio className="w-4 h-4" />
                                                <span>Chat Mode</span>
                                            </div>
                                        )}
                                    </Label>
                                    <Switch
                                        id="listen-mode"
                                        checked={isListenMode}
                                        onCheckedChange={setIsListenMode}
                                    />
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </header>

                        {isListenMode ? (
                            <div className="flex-grow flex flex-col justify-center items-center">
                                <RadioTower className="w-16 h-16 text-green-500 animate-pulse" />
                                <h2 className="text-2xl font-light mt-4">Listening to your Gmail</h2>
                                {lastTriggerTime && (
                                    <p className="text-sm text-gray-400 mt-2">
                                        Last trigger received: {lastTriggerTime.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col flex-1 h-0">
                                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 mb-2 scrollbar-thin">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] py-4 px-4 text-sm rounded-lg relative overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                                                    message.role === "user" 
                                                        ? "bg-white text-black" 
                                                        : "bg-zinc-800 text-gray-300"
                                                }`}
                                            >
                                                {message.role === 'assistant' ? formatContent(message.content) : message.content}
                                                <Meteors number={10} className="opacity-30" />
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[80%] py-4 px-4 text-sm rounded-lg relative bg-zinc-800 text-gray-300">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <Meteors number={10} className="opacity-30" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSubmit} className="flex gap-2 pt-2 bg-black">
                                    <div className="flex-1 relative">
                                        <Input
                                            value={input}
                                            onChange={handleInputChange}
                                            placeholder="Type your message here..."
                                            className="flex-1 p-5 bg-zinc-900 text-white placeholder:text-gray-400 relative z-10"
                                        />
                                        <Meteors number={15} className="opacity-30" />
                                    </div>
                                    <RainbowButton type="submit" disabled={isLoading}>
                                        {isLoading ? (
                                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </RainbowButton>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MessageIcon from "@mui/icons-material/Message";
import { addMessage, getMessages, onMessagesUpdate } from "../../../firebase/firestore";

/**
 * Client Messages Tab - Real-time chat between PT and client
 * Features: Real-time messaging, message history, read status
 */
export default function ClientMessagesTab({ trainerId, clientId, clientName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const listenerUnsubscribe = useRef(null);

  useEffect(() => {
    loadMessages();
    setupRealtimeListener();

    return () => {
      if (listenerUnsubscribe.current) {
        listenerUnsubscribe.current();
      }
    };
  }, [trainerId, clientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!trainerId || !clientId) return;

    setLoading(true);
    setError("");

    try {
      const data = await getMessages(trainerId, clientId);
      setMessages(data || []);

      // Count unread messages
      const unread = (data || []).filter(
        (m) => !m.isRead && m.sender === "client"
      ).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error loading messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    if (!trainerId || !clientId) return;

    try {
      listenerUnsubscribe.current = onMessagesUpdate(
        trainerId,
        clientId,
        (updatedMessages) => {
          setMessages(updatedMessages || []);

          // Count unread messages
          const unread = (updatedMessages || []).filter(
            (m) => !m.isRead && m.sender === "client"
          ).length;
          setUnreadCount(unread);
        }
      );
    } catch (err) {
      console.error("Error setting up real-time listener:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await addMessage(trainerId, clientId, {
        message: newMessage.trim(),
        sender: "pt",
        senderName: "Personal Trainer",
      });

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Group messages by date
  const groupedMessages = {};
  messages.forEach((msg) => {
    const dateKey = formatDate(msg.timestamp);
    if (!groupedMessages[dateKey]) {
      groupedMessages[dateKey] = [];
    }
    groupedMessages[dateKey].push(msg);
  });

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5">Messages with {clientName}</Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread`}
              color="error"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Messages Container */}
      <Paper
        sx={{
          flex: 1,
          overflow: "auto",
          mb: 2,
          p: 2,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#f9f9f9",
        }}
      >
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && messages.length === 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <MessageIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
            <Typography color="textSecondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        )}

        {!loading && messages.length > 0 && (
          <Box>
            {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
              <Box key={dateKey}>
                {/* Date Separator */}
                <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
                  <Divider sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    sx={{ mx: 1, color: "text.secondary" }}
                  >
                    {dateKey}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>

                {/* Messages for this date */}
                {dayMessages.map((msg, idx) => {
                  const isFromPT = msg.sender === "pt";

                  return (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        justifyContent: isFromPT ? "flex-end" : "flex-start",
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: "70%",
                          bgcolor: isFromPT ? "#2196F3" : "#E0E0E0",
                          color: isFromPT ? "white" : "text.primary",
                          borderRadius: 2,
                          p: 1.5,
                          borderBottomLeftRadius: isFromPT ? 16 : 4,
                          borderBottomRightRadius: isFromPT ? 4 : 16,
                        }}
                      >
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {msg.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            opacity: 0.7,
                            display: "flex",
                            justifyContent: isFromPT
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          {formatTime(msg.timestamp)}
                          {isFromPT && !msg.isRead && " ✓"}
                          {isFromPT && msg.isRead && " ✓✓"}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Paper>

      {/* Message Input */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "flex-end",
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending}
          variant="outlined"
          size="small"
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          sx={{ whiteSpace: "nowrap" }}
        >
          {sending ? <CircularProgress size={24} /> : "Send"}
        </Button>
      </Box>
    </Box>
  );
}

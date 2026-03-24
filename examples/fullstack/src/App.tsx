import { useState } from "react";
import type { FormloomSchema, FormloomData } from "@formloom/react";
import { FormloomForm } from "./FormloomForm";

interface Message {
  role: "user" | "assistant";
  content: string;
  schema?: FormloomSchema;
  submittedData?: FormloomData;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.type === "form" && data.schema) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.schema.description || "Please fill out this form:",
            schema: data.schema,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.text || "No response" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to reach the server. Is it running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(msgIndex: number, data: FormloomData) {
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === msgIndex ? { ...msg, submittedData: data } : msg,
      ),
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Formloom Demo</h1>
        <p style={styles.subtitle}>
          Ask the AI to collect information. Try: "I want to book an appointment" or
          "Help me submit a bug report"
        </p>
      </header>

      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            Start a conversation to see Formloom in action.
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(msg.role === "user" ? styles.userMsg : styles.assistantMsg),
            }}
          >
            <div style={styles.role}>
              {msg.role === "user" ? "You" : "Assistant"}
            </div>

            <div style={styles.content}>{msg.content}</div>

            {msg.schema && !msg.submittedData && (
              <div style={styles.formWrapper}>
                <FormloomForm
                  schema={msg.schema}
                  onSubmit={(data) => handleFormSubmit(i, data)}
                />
              </div>
            )}

            {msg.submittedData && (
              <div style={styles.submittedWrapper}>
                <div style={styles.submittedLabel}>Submitted Data:</div>
                <pre style={styles.submittedData}>
                  {JSON.stringify(msg.submittedData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.message, ...styles.assistantMsg }}>
            <div style={styles.role}>Assistant</div>
            <div style={{ ...styles.content, color: "#9ca3af" }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form
        style={styles.inputArea}
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <input
          style={styles.input}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI to collect information..."
          disabled={loading}
        />
        <button style={styles.sendBtn} type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: 720,
    margin: "0 auto",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "24px 16px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  title: { fontSize: 22, margin: 0 },
  subtitle: { fontSize: 14, color: "#6b7280", margin: "4px 0 0" },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  empty: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: 80,
    fontSize: 14,
  },
  message: {
    padding: "12px 16px",
    borderRadius: 12,
    maxWidth: "85%",
  },
  userMsg: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
  },
  assistantMsg: {
    alignSelf: "flex-start",
    background: "#f3f4f6",
    color: "#111",
  },
  role: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 4,
    opacity: 0.7,
  },
  content: { fontSize: 14, lineHeight: 1.5 },
  formWrapper: {
    marginTop: 12,
    padding: 16,
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  submittedWrapper: { marginTop: 12 },
  submittedLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#059669",
    marginBottom: 4,
  },
  submittedData: {
    background: "#1e293b",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 6,
    fontSize: 12,
    overflow: "auto",
    margin: 0,
  },
  inputArea: {
    display: "flex",
    gap: 8,
    padding: 16,
    borderTop: "1px solid #e5e7eb",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};

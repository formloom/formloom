import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleChat, handleFormSubmission } from "./chat.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (typeof message !== "string" || message.length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    const result = await handleChat(message);
    res.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/continue", async (req, res) => {
  try {
    const { originalUserMessage, toolCallId, schema, data } = req.body;
    if (
      typeof originalUserMessage !== "string" ||
      typeof toolCallId !== "string" ||
      typeof schema !== "object" ||
      typeof data !== "object"
    ) {
      res.status(400).json({ error: "Missing or malformed fields" });
      return;
    }
    const result = await handleFormSubmission({
      originalUserMessage,
      toolCallId,
      schema,
      data,
    });
    res.json(result);
  } catch (err) {
    console.error("Continue error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Formloom API server running on http://localhost:${PORT}`);
});

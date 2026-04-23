require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const apiRoutes = require("./routes");
const { initExamTimerSocket } = require("./sockets/examTimer");

// const examImportRoutes = require('./routes/examImportRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Cấu hình CORS cho Socket.IO
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));


// console.log(typeof examImportRoutes);
// console.log(examImportRoutes);
// API entry
app.use("/api", apiRoutes);
// app.use("/api/exam-import", examImportRoutes);



// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// error handler
app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal error",
  });
});

// Khởi tạo WebSocket cho exam timer
initExamTimerSocket(io);

// Export io để có thể sử dụng trong các controller/service khác
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready on ws://localhost:${PORT}`);
});

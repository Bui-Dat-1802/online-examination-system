// src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }


  connect(token) {
    if (this.socket && this.connected) {
      console.log('[SocketService] Already connected');
      return this.socket;
    }

    const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    
    console.log('[SocketService] Connecting to:', `${BACKEND_URL}/exam-timer`);
    console.log('[SocketService] Token provided:', token ? 'Yes' : 'No');
    
    this.socket = io(`${BACKEND_URL}/exam-timer`, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Lắng nghe các sự kiện kết nối
    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to exam timer');
      console.log('[SocketService] Socket ID:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error.message);
    });

    return this.socket;
  }

  /**
   * Subscribe để nhận cập nhật thời gian cho một exam instance
   * @param {string} examInstanceId - UUID của exam instance
   * @param {function} onTimeUpdate - callback khi nhận time-update
   * @param {function} onError - callback khi có lỗi
   * @param {function} onExpired - callback khi hết thời gian
   */
  subscribeToExam(examInstanceId, onTimeUpdate, onError, onExpired) {
    if (!this.socket) {
      console.error('[SocketService] Socket not connected');
      return;
    }

    // Hàm thực hiện subscribe
    const doSubscribe = () => {
      console.log('[SocketService] Subscribing to exam:', examInstanceId);
      
      // Đăng ký subscribe
      this.socket.emit('subscribe', { examInstanceId });

      // Lắng nghe các sự kiện
      this.socket.on('time-update', (data) => {
        console.log('[SocketService] Received time-update:', data);
        if (data.examInstanceId === examInstanceId && onTimeUpdate) {
          onTimeUpdate(data);
        }
      });

      this.socket.on('time-force-update', (data) => {
        if (data.examInstanceId === examInstanceId && onTimeUpdate) {
          console.log('[SocketService] Force update:', data.message);
          onTimeUpdate(data);
        }
      });

      this.socket.on('error', (error) => {
        console.error('[SocketService] Error:', error);
        console.error('[SocketService] Error details:', JSON.stringify(error, null, 2));
        if (onError) onError(error);
      });

      this.socket.on('time-expired', (data) => {
        if (data.examInstanceId === examInstanceId && onExpired) {
          console.log('[SocketService] Time expired for exam:', examInstanceId);
          onExpired(data);
        }
      });

      this.socket.on('exam-ended', (data) => {
        if (data.examInstanceId === examInstanceId && onExpired) {
          console.log('[SocketService] Exam ended:', examInstanceId);
          onExpired(data);
        }
      });

      this.socket.on('waiting', (data) => {
        console.log('[SocketService] Waiting to start:', data);
      });
    };

    // Nếu socket đã kết nối, subscribe ngay
    if (this.connected) {
      doSubscribe();
    } else {
      // Nếu chưa kết nối, đợi event 'connect'
      console.log('[SocketService] Waiting for connection before subscribe...');
      this.socket.once('connect', () => {
        console.log('[SocketService] Connected, now subscribing...');
        doSubscribe();
      });
    }
  }

  /**
   * Unsubscribe khỏi exam instance
   * @param {number} examInstanceId 
   */
  unsubscribeFromExam(examInstanceId) {
    if (!this.socket) return;
    
    this.socket.emit('unsubscribe', { examInstanceId });
    
    // Remove listeners
    this.socket.off('time-update');
    this.socket.off('time-force-update');
    this.socket.off('error');
    this.socket.off('time-expired');
    this.socket.off('exam-ended');
    this.socket.off('waiting');
  }

  /**
   * Lấy thời gian còn lại ngay lập tức (on-demand)
   * @param {string} examInstanceId - UUID của exam instance
   * @param {function} callback 
   */
  getRemainingTime(examInstanceId, callback) {
    if (!this.socket) return;

    this.socket.emit('get-remaining-time', { examInstanceId });
    
    this.socket.once('remaining-time', (data) => {
      if (data.examInstanceId === examInstanceId && callback) {
        callback(data);
      }
    });
  }

  /**
   * Lấy danh sách các exam sessions đang active
   * @param {function} callback 
   */
  getActiveSessions(callback) {
    if (!this.socket) return;

    this.socket.emit('get-active-sessions');
    
    this.socket.once('active-sessions', (data) => {
      if (callback) callback(data.sessions);
    });
  }

  /**
   * Tạm dừng nhận cập nhật thời gian
   */
  pauseTimer() {
    if (!this.socket) return;
    this.socket.emit('pause-timer');
  }

  /**
   * Tiếp tục nhận cập nhật thời gian
   * @param {string} examInstanceId - UUID của exam instance
   */
  resumeTimer(examInstanceId) {
    if (!this.socket) return;
    this.socket.emit('resume-timer', { examInstanceId });
  }

  /**
   * Ping để kiểm tra kết nối
   * @param {function} callback 
   */
  ping(callback) {
    if (!this.socket) return;

    const startTime = Date.now();
    this.socket.emit('ping');
    
    this.socket.once('pong', (data) => {
      const latency = Date.now() - startTime;
      if (callback) callback({ latency, serverTime: data.timestamp });
    });
  }

  /**
   * Ngắt kết nối socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('[SocketService] Disconnected');
    }
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected() {
    return this.socket && this.connected;
  }
}

// Export singleton instance
export default new SocketService();

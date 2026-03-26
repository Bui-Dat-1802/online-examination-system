// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import GlobalModal from './components/GlobalModal';

// Layouts
import StudentLayout from './layouts/StudentLayout';
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';

// Import các trang chung
import OutsidePage from './pages/Outside/OutsidePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';

// Import 3 trang Dashboard mới
import StudentDashboardPage from './pages/Student/StudentDashboardPage';
import TeacherDashboardPage from './pages/Teacher/TeacherDashboardPage';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';

// trang cho teacher
//trang danhsachlop
import TeacherClassesPage from './pages/Teacher/TeacherClassesPage';
//chitiettunglop
import ClassDetailPage from './pages/Teacher/ClassDetailPage';
// ngân hàng câu hỏi
import TeacherQuestionsPage from './pages/Teacher/TeacherQuestionsPage';
//template de thi
import TeacherTemplatesPage from './pages/Teacher/TeacherTemplatesPage';
// de thi
import TeacherExamInstancesPage from './pages/Teacher/TeacherExamInstancesPage';
// Quan ly phien thi
import ClassExamSessionPage from './pages/Teacher/ClassExamSessionPage';
// trang cho student
import StudentClassesPage from './pages/Student/StudentClassesPage';
import StudentClassExamsPage from './pages/Student/StudentClassExamsPage';
import StudentTakeExamPage from './pages/Student/StudentTakeExamPage';

//trang cho admin
import AdminUserPage from './pages/Admin/AdminUserPage';
import AdminClassPage from './pages/Admin/AdminClassPage';
import AdminClassDetailPage from './pages/Admin/AdminClassDetailPage';
import AdminExamPage from './pages/Admin/AdminExamPage';
import AdminExamDetailPage from './pages/Admin/AdminExamDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModalProvider>
          <GlobalModal />
          <Routes>
            <Route path="/" element={<OutsidePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />


            {/* Đường dẫn cho Học sinh */}
            <Route path="/student" element={<StudentLayout />}>
              <Route path="dashboard" element={<StudentDashboardPage />} />
              <Route path="classes" element={<StudentClassesPage />} />
              <Route path="classes/:classId/exams" element={<StudentClassExamsPage />} />
              <Route path="exam/take/:examId" element={<StudentTakeExamPage />} />
            </Route>



            {/* Đường dẫn cho Giáo viên */}
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route path="dashboard" element={<TeacherDashboardPage />} />
              <Route path="classes" element={<TeacherClassesPage />} />
              <Route path="classes/:id" element={<ClassDetailPage />} />
              <Route path="questions" element={<TeacherQuestionsPage />} />
              <Route path="exam-templates" element={<TeacherTemplatesPage />} />
              <Route path="exam-templates/:templateId" element={<TeacherExamInstancesPage />} />
              <Route path="classes/:classId/exams/:examInstanceId" element={<ClassExamSessionPage />} />
            </Route>

            {/* --- NHÓM ROUTE ADMIN --- */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUserPage />} />
              <Route path="classes" element={<AdminClassPage />} />
              <Route path="classes/:id" element={<AdminClassDetailPage />} />
              <Route path="exams" element={<AdminExamPage />} />
              <Route path="exams/:id" element={<AdminExamDetailPage />} />
            </Route>


          </Routes>
        </ModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
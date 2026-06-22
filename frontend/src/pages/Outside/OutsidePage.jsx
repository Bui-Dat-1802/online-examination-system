import React from 'react';
import { Link } from 'react-router-dom';
import styles from './OutsidePage.module.scss';

const OutsidePage = () => {
    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.logo}>
                        <i className={`fa-solid fa-feather-pointed ${styles.logoIcon}`}></i>
                        <div>
                            <span className={styles.logoText}>Online Examination System</span>
                            <span className={styles.logoTagline}>Hệ thống thi trực tuyến</span>
                        </div>
                    </div>
                    <nav className={styles.navLinks}>
                        <a href="#features">Giới thiệu</a>
                        <a href="#features">Tính năng</a>
                        <a href="#contact">Liên hệ</a>
                    </nav>
                </header>

                {/* Stats Section */}
                <section className={styles.statsSection}>
                    <div className={styles.statItem}>
                        <h3>1,500+</h3>
                        <p>Sinh viên</p>
                    </div>
                    <div className={styles.statItem}>
                        <h3>150+</h3>
                        <p>Giáo viên</p>
                    </div>
                    <div className={styles.statItem}>
                        <h3>5,000+</h3>
                        <p>Bài kiểm tra</p>
                    </div>
                    <div className={styles.statItem}>
                        <h3>98%</h3>
                        <p>Hài lòng</p>
                    </div>
                </section>

                {/* Call to Action Section */}
                <section className={styles.ctaSection}>
                    <div className={styles.ctaCard}>
                        <div className={styles.icon}>
                            <i className="fa-solid fa-right-to-bracket"></i>
                        </div>
                        <h2>Bắt đầu sử dụng Online Examination System</h2>
                        <p>Đăng nhập hoặc tạo tài khoản để tham gia hệ thống thi trực tuyến.</p>
                        <div className={styles.ctaActions}>
                            <Link to="/login" className={styles.ctaButton}>Đăng nhập</Link>
                            <Link to="/register" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>Đăng ký</Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className={styles.featuresSection}>
                    <h2 className={styles.sectionTitle}>
                        <i className="fa-solid fa-star"></i> Tính năng nổi bật
                    </h2>
                    <div className={styles.featuresGrid}>
                        <div className={styles.featureItem}>
                            <i className="fa-solid fa-list-check"></i>
                            <h4>Đa dạng câu hỏi</h4>
                            <p>Hỗ trợ nhiều loại câu hỏi: trắc nghiệm, tự luận, điền khuyết, ghép cặp.</p>
                        </div>
                        <div className={styles.featureItem}>
                            <i className="fa-solid fa-clock"></i>
                            <h4>Quản lý thời gian</h4>
                            <p>Đếm ngược thời gian làm bài tự động và nộp bài khi hết giờ.</p>
                        </div>
                        <div className={styles.featureItem}>
                            <i className="fa-solid fa-chart-line"></i>
                            <h4>Thống kê chi tiết</h4>
                            <p>Báo cáo kết quả học tập, phân tích điểm số và xu hướng.</p>
                        </div>
                        <div className={styles.featureItem}>
                            <i className="fa-solid fa-shield-halved"></i>
                            <h4>Bảo mật cao</h4>
                            <p>Mã hóa dữ liệu, phòng chống gian lận hiệu quả.</p>
                        </div>
                        <div className={styles.featureItem}>
                            <i className="fa-solid fa-layer-group"></i>
                            <h4>Đa nền tảng</h4>
                            <p>Truy cập dễ dàng trên máy tính, tablet và điện thoại.</p>
                        </div>
                        <div className={styles.featureItem}>
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <h4>Giao diện thân thiện</h4>
                            <p>Thiết kế hiện đại, dễ sử dụng cho mọi đối tượng.</p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer id="contact" className={styles.footer}>
                    <h4>Online Examination System - Hệ thống thi trực tuyến</h4>
                    <p>Email: contact@edutest.vn | Hotline: 1900 xxxx</p>
                    <p>© 2025 Online Examination System. Đổi mới giáo dục - Nâng cao chất lượng học tập</p>
                </footer>
            </div>
        </div>
    );
};

export default OutsidePage;

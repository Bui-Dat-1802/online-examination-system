// src/components/TopHeader.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';
import styles from './TopHeader.module.scss';

const TopHeader = ({ title, onMenuClick }) => {
    const { user, logout, fetchUserProfile } = useContext(AuthContext);

    // State Dropdown
    const [showProfile, setShowProfile] = useState(false);
    const dropdownRef = useRef(null);

    // State Modal
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' hoặc 'password'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Form
    const [profileData, setProfileData] = useState({ name: '', bio: '' });
    const [passData, setPassData] = useState({ oldPassword: '', password: '', confirmPassword: '' });

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleProfileClick = () => setShowProfile(!showProfile);

    // --- MỞ MODAL & FILL DATA ---
    const handleOpenModal = () => {
        setProfileData({
            name: user?.name || '',
            bio: user?.bio || ''
        });
        setPassData({ oldPassword: '', password: '', confirmPassword: '' });
        setActiveTab('profile'); // Mặc định mở tab hồ sơ
        setShowProfile(false);
        setShowModal(true);
    };

    // --- XỬ LÝ NHẬP LIỆU ---
    const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
    const handlePassChange = (e) => setPassData({ ...passData, [e.target.name]: e.target.value });

    // --- 1. XỬ LÝ API 5: UPDATE PROFILE ---
    const submitProfile = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await authService.updateProfile(profileData);
            alert(res.data.message || "Cập nhật hồ sơ thành công!");
            await fetchUserProfile(false); // Load lại header
            setShowModal(false);
        } catch (error) {
            alert(error.response?.data?.error || "Lỗi cập nhật hồ sơ");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 2. XỬ LÝ API 6: CHANGE PASSWORD ---
    const submitPassword = async (e) => {
        e.preventDefault();

        // Validate Frontend trước
        if (passData.password !== passData.confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }
        if (passData.password.length < 6) { // Ví dụ validate độ dài
            alert("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }

        setIsSubmitting(true);
        try {
            // Payload đúng theo API Endpoint 6
            const payload = {
                oldPassword: passData.oldPassword,
                password: passData.password,       // Mật khẩu mới
                confirmPassword: passData.confirmPassword
            };

            const res = await authService.changePassword(payload);
            alert(res.data.message || "Đổi mật khẩu thành công!");
            setShowModal(false);
        } catch (error) {
            alert(error.response?.data?.error || "Lỗi đổi mật khẩu (Sai mật khẩu cũ?)");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <header className={styles.topHeader}>
            {onMenuClick && (
                <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
                    <i className="fa-solid fa-bars"></i>
                </button>
            )}
            <h3>{title}</h3>

            {user && (
                <div className={styles.profileWrapper} ref={dropdownRef}>
                    <div className={styles.profile} onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
                        <div className={styles.textInfo}>
                            <span className={styles.name}><strong>{user.name}</strong></span>
                        </div>
                        <div className={styles.avatar}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>

                    {showProfile && (
                        <div className={styles.dropdown}>
                            <div className={styles.ddHeader}>Thông tin cá nhân</div>
                            <div className={styles.ddBody}>
                                <div className={styles.row}><span>ID: </span> <b>{user.id}</b></div>
                                <div className={styles.row}><span>Tên:</span> <b>{user.name}</b></div>
                                <div className={styles.row}><span>Bio:</span> <b>{user.bio || '...'}</b></div>
                                <div className={styles.row}><span>Email:</span> <b>{user.email}</b></div>
                            </div>
                            <div className={styles.ddAction}>
                                <button onClick={handleOpenModal} className={styles.updateBtn}>
                                    <i className="fa-solid fa-gear"></i> Thiết lập tài khoản
                                </button>
                            </div>
                            <div className={styles.ddFooter}>
                                <button onClick={logout} className={styles.logoutBtn}>
                                    <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- MODAL CÓ TABS --- */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Thiết lập tài khoản</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>

                        {/* THANH TAB NAVIGATION */}
                        <div className={styles.tabs}>
                            <button
                                className={activeTab === 'profile' ? styles.activeTab : ''}
                                onClick={() => setActiveTab('profile')}
                            >
                                Hồ sơ cá nhân
                            </button>
                            <button
                                className={activeTab === 'password' ? styles.activeTab : ''}
                                onClick={() => setActiveTab('password')}
                            >
                                Đổi mật khẩu
                            </button>
                        </div>

                        {/* NỘI DUNG TAB: HỒ SƠ (API 5) */}
                        {activeTab === 'profile' && (
                            <form onSubmit={submitProfile} className={styles.formBody}>
                                <div className={styles.formGroup}>
                                    <label>Họ tên</label>
                                    <input name="name" value={profileData.name} onChange={handleProfileChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Giới thiệu (Bio)</label>
                                    <textarea name="bio" value={profileData.bio} onChange={handleProfileChange} rows="3" />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* NỘI DUNG TAB: MẬT KHẨU (API 6) */}
                        {activeTab === 'password' && (
                            <form onSubmit={submitPassword} className={styles.formBody}>
                                <div className={styles.formGroup}>
                                    <label>Mật khẩu hiện tại</label>
                                    <input type="password" name="oldPassword" value={passData.oldPassword} onChange={handlePassChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Mật khẩu mới</label>
                                    <input type="password" name="password" value={passData.password} onChange={handlePassChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Nhập lại mật khẩu mới</label>
                                    <input type="password" name="confirmPassword" value={passData.confirmPassword} onChange={handlePassChange} required />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default TopHeader;
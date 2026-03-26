import React from 'react';
import styles from './Pagination.module.scss';

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
    const handlePrevious = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    const handlePageClick = (page) => {
        onPageChange(page);
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className={styles.paginationContainer}>
            <div className={styles.paginationInfo}>
                Hiển thị {startItem}-{endItem} trên tổng {totalItems} mục
            </div>
            <div className={styles.pagination}>
                <button
                    className={styles.pageBtn}
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                >
                    ← Trước
                </button>

                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
                    ) : (
                        <button
                            key={page}
                            className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
                            onClick={() => handlePageClick(page)}
                        >
                            {page}
                        </button>
                    )
                ))}

                <button
                    className={styles.pageBtn}
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                >
                    Sau →
                </button>
            </div>
        </div>
    );
};

export default Pagination;

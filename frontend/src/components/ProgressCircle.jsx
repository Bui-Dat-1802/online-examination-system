import styles from './ProgressCircle.module.scss';
const ProgressCircle = ({ title, value, total, color }) => {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className={styles.circleCard}>
      <div
        className={styles.circle}
        style={{
          background: `conic-gradient(${color} ${percent}%, #e5e7eb 0)`
        }}
      >
        <div className={styles.inner}>
          <strong>{value}</strong>
          <span>{percent}%</span>
        </div>
      </div>

      <p className={styles.circleTitle}>{title}</p>
    </div>
  );
};

export default ProgressCircle;

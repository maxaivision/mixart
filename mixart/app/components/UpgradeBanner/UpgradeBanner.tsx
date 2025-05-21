"use client";

import { useRouter } from 'next/navigation';

import styles from "./UpgradeBanner.module.css";

export default function UpgradeBanner() {
    const router = useRouter();

    const goToPricing = () => router.push('/pricing');

    return (
        <div className={styles.banner_wrapper} onClick={goToPricing}>
        <div className={styles.content}>
            <h2 className={styles.title}>Upgrade to unlock</h2>
            <p className={styles.description}>
            <span className={styles.highlight}>Purchase a Standart plan</span> or higher, to <br />
            get Pro settings.
            </p>
            <button className={styles.button}>Upgrade</button>
        </div>
        </div>
    );
}

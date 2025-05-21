import React, { Suspense } from 'react'

// Components import
import StudioControlMenu from "../components/StudioControlMenu/ControlMenu";
import Footer from "../components/Footer/Footer";
import MobileMenu from "../components/MobileMenu/MobileMenu";

// Styles import
import styles from "./page.module.css";

export default function StudioLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<section className="layout_wrapper">
            <Suspense fallback={null}>
                <div className="main_content">
                    <div className={styles.page_wrapper}>
                        <div className={styles.page_working_area}>
                            <div className={styles.controls__outer} >
                                <StudioControlMenu />
                            </div>
                            <div className={styles.creation_page_content}>
                                {children}
                            </div>
                        </div>
                        <Footer />
                    </div>
                </div>
                <MobileMenu />
            </Suspense>
		</section>
	);
}

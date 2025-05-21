'use client';

import React, { useState, useEffect } from 'react';

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from 'next/navigation'

import LoginModal from '../LoginModal/LoginModal';

import styles from './mobileMenu.module.css';

// import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem } from "@heroui/react";

// import LoginModal from "@/components/loginModal";

// Functions import
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

// Centralized image import
import HomeLogo from "@/public/images/icons/menu/home-icon.svg";
import GenerationLogo from "@/public/images/icons/menu/generation-icon.svg";
import GalleryLogo from "@/public/images/icons/menu/gallery-icon.svg";

export default function  MobileMenu () {
    const { data: session, status, update } = useSession();

    const router = useRouter();
    const pathname = usePathname();
  
    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    const handleMenuClick = (path: string) => {
        router.push(path);
    };

    // Track whether login component should be opened
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);

    const toggleLoginModal = () => {
		setLoginModalOpen(!isLoginModalOpen);
	};

    //   const {
    //     isOpen: isLoginModalOpen,
    //     onOpen: openLoginModal,
    //     onClose: toggleLoginModal,
    //   } = useDisclosure();

    // State to track whether the initial calculation is complete
    const [isCalculated, setIsCalculated] = useState(false);

    useEffect(() => {
         // Mark the screen size calculation as complete
         setIsCalculated(true);
    }, [windowSize]);
 
    // Don't render until the calculation is complete
    if (!isCalculated || !isMobile) return null;

    return (
        <>
            <div className={styles.mobile_navigation_wrapper}>
                {/* Control menu button */}
                <button
                    className={`${styles.mobile_navigation_button} ${pathname == '/' ? styles.mobile_nav_active_button_nav : ''}`}
                    onClick={() => {

                        if (!session?.user?.id) {
                            toggleLoginModal();
                        return;
                        } else {
                            handleMenuClick('/')
                        }
                    }}
                >
                    <div className={styles.mobile_navigation_button_inner_wrapper}>
                        <HomeLogo className={styles.mobile_navigation_button_icon} />
                        <span className={styles.mobile_navigation_button_text}>Main</span>
                    </div>
                </button>

                {/* Generator Button */}
                <button
                    className={`${styles.mobile_navigation_button} ${pathname.includes('/photoshoot') ? styles.mobile_nav_active_button_nav : ''}`} 
                    onClick={() => {

                        if (!session?.user?.id) {
                            toggleLoginModal();
                        return;
                        } else {
                            handleMenuClick('/photoshoot')
                        }

                    }}
                >
                    <div className={styles.mobile_navigation_button_inner_wrapper}>
                        <GenerationLogo className={styles.mobile_navigation_button_icon} />
                        <span className={styles.mobile_navigation_button_text}>My Generations</span>
                    </div>     
                </button>

                {/* Gallery Button */}
                {/* <button
                    className={`${styles.mobile_navigation_button} ${pathname.includes('/gallery') ? styles.mobile_nav_active_button_nav : ''}`}
                    onClick={() => {

                        if (!session?.user?.id) {
                            toggleLoginModal();
                        return;
                        } else {
                            handleMenuClick('/gallery')
                        }
                    }}
                >
                    <div className={styles.mobile_navigation_button_inner_wrapper}>
                        <GalleryLogo className={styles.mobile_navigation_button_icon} />
                        <span className={styles.mobile_navigation_button_text}>Gallery</span>
                    </div>
                </button> */}

            </div>
            <LoginModal isOpen={isLoginModalOpen} onClose={toggleLoginModal} order="reverse"/>
        </>
    );
};

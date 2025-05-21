"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import React from 'react';

// Next specific import
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { signIn, signOut, useSession } from 'next-auth/react';

// Centralized image import
import Logo from "@/public/images/logo/mixart.svg";
import ArrowIcon from "@/public/images/icons/arrow-icon.svg";
import NavMenuStarsIcon from "@/public/images/icons/menu/nav-menu-stars.svg";
import NavMenuGlobeIcon from "@/public/images/icons/menu/nav-menu-globe.svg";
import NavMenuCommunityIcon from "@/public/images/icons/menu/nav-menu-community.svg";
import NavMenuTermsIcon from "@/public/images/icons/menu/nav-menu-terms.svg";
import NavMenuFolderIcon from "@/public/images/icons/menu/nav-menu-folder.svg";
import NavMenuPrivacyIcon from "@/public/images/icons/menu/nav-menu-privacy.svg";

// Import styles
import styles from "./navbar.module.css";

// Functions import
import { trackGtmEvent } from "@/app/lib/analytics/google/trackGtmEvent";
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

// Components import
import UserProfile from "../UserProfile/UserProfile";
import LoginModal from "../LoginModal/LoginModal";
import StudioTypeSelector from "../StudioTypeSelector/StudioTypeSelector";

// First, import the UserContext
import { useUserContext } from '@/app/context/UserContext';

export default function Navbar () {

    const router = useRouter();
    const pathname = usePathname();
    const { data: session, update } = useSession();

    // Only log when session changes
    // useEffect(() => {
    //     console.log("NAVBAR SESSION:", {
    //         sessionExists: !!session,
    //         userId: session?.user?.id,
    //         userEmail: session?.user?.email,
    //         fullSession: session
    //     });
    // }, [session?.user?.id]);

    // Use a ref instead of state to prevent re-renders
    const isFetchedFresh = useRef(false);
    const [isRegistrationGtmEventSent, setIsRegistrationGtmEventSent] = useState(true);
    const hasTrackedRegisteredEvent = useRef(false);

    // Inside the component, add this hook
    const { updateModelMap } = useUserContext();

    // This effect will load additional user data that wasn't included in the JWT
    const fetchUserData = useCallback(async () => {
        if (!session?.user?.id || isFetchedFresh.current) return;

        try {
            // console.log("Fetching complete user data for:", session.user.id);
            const res = await fetch(`/api/user/${session.user.id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) throw new Error("Failed to fetch user");

            const data = await res.json();
            
            if (data.user.registrationGtmSent !== undefined) {
                setIsRegistrationGtmEventSent(data.user.registrationGtmSent);
            }
            
            // Update session with user data (but not modelMap)
            await update({
                user: {
                    ...session.user,
                    name: data.user.name,
                    email: data.user.email,
                    emailVerified: data.user.emailVerified,
                    credits: data.user.credits,
                    subscription: data.user.subscription,
                    feedbackSubmitted: data.user.feedbackSubmitted,
                    serviceModalShown: data.user.serviceModalShown,
                    // No modelMap here
                },
            });
            
            // Also update the model map via context
            await updateModelMap();
            
            isFetchedFresh.current = true; // prevent double refetch
        } catch (error) {
            console.error("Failed refreshing session:", error);
        }
    }, [session]);

    // Send registration GTM event
    const sendRegistrationGtmEvent = useCallback((event: string) => {
        if (!session?.user?.id) return;
        trackGtmEvent(event, {
          ecommerce: {
            usid: session.user.id,
          },
        });
    }, [session]);

    // Update user register GTM status in database
    const updateUserRegisterGtm = useCallback(async () => {
        try {
            const response = await fetch('api/user/update/registerGtm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: session?.user?.id,
                }),
            });
    
            const data = await response.json();
            if (data.message === 'Register gtm updated successfully') {
                await fetchUserData();
            }
        } catch (error) {
            console.error('Error updating registration GTM status:', error);
        }
    }, [session]);

    // Track registration events
    useEffect(() => {
        if (session && session?.user?.authMethod === 'google' && !hasTrackedRegisteredEvent.current && !isRegistrationGtmEventSent) {
            sendRegistrationGtmEvent('register');
            updateUserRegisterGtm();
            hasTrackedRegisteredEvent.current = true;
            console.log('google registration event sent');
        } else if (session && session?.user?.authMethod === 'email' && !hasTrackedRegisteredEvent.current && !isRegistrationGtmEventSent) {
            sendRegistrationGtmEvent('register');
            updateUserRegisterGtm();
            hasTrackedRegisteredEvent.current = true;
            console.log('email registration event sent');
        }
    }, [session, isRegistrationGtmEventSent, sendRegistrationGtmEvent, updateUserRegisterGtm]);

    // Fetch user data once when session is available and not fetched yet
    useEffect(() => {
        if (session?.user?.id && !isFetchedFresh.current) {
            fetchUserData();
        }
    }, [session]);

    const [plan, setPlan] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user) {
            setPlan(session.user.subscription ?? "No plan");
        }
    }, [session]);

    // Track whether mobile menu should be opened
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
          setScrolled(window.scrollY > 10);
        };
      
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    // Track whether login component should be opened
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);

    const toggleLoginModal = () => {
		setLoginModalOpen(!isLoginModalOpen);
	};

    const handleNavigation = (path: string) => {
        router.push(path);

        if (isMenuOpen) {
            setIsMenuOpen(false);
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Function to return text on pricing button
    const buttonText = () => {
        if (!session?.user || !plan) {
            return "Get started";
        } else if (plan === 'Free') {
            return "Buy plan";
        } else if (plan === 'Muse' || plan === 'Glow' || plan === 'Studio' || plan === 'Icon') {
            return "More";
        }
    };

    // Close the menu when the screen is no longer mobile
    useEffect(() => {
        if (!isMobile && isMenuOpen) {
        setIsMenuOpen(false);
        }
    }, [isMobile, isMenuOpen]);

    useEffect(() => {
        if (isMenuOpen) setIsMenuOpen(false);
    }, [pathname]);

    const getCurrentMonthName = () => {
        return new Date().toLocaleString("en-US", { month: "long" }); // "March", "April", etc.
    };

    // Add this useEffect
    useEffect(() => {
        // Parse cookies
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.split('=').map(c => c.trim());
            acc[key] = value;
            return acc;
        }, {} as {[key: string]: string});
        
        // Check if we should track the Google auth event
        if (cookies['track_auth_google'] === 'true') {
            trackGtmEvent('auth_google', { ecommerce: { usid: session?.user?.id } });
          
            // Clear the cookie after tracking
            document.cookie = 'track_auth_google=; Max-Age=0; path=/;';
            }
    }, [session?.user?.id]);

    return (
        <>
            <nav className={`${styles.navbar} ${scrolled ? styles.navbar_scrolled : ""} ${isMenuOpen && isMobile ? styles.navbar_mobile : ""}`}>

                <div className={styles.navbar_header}>
                    {/* Logo Section */}
                    <Link
                        href="/"
                        className={styles.logo_wrapper}
                        onClick={() => {
                            if (isMenuOpen) setIsMenuOpen(false);
                        }}
                    >
                        <Logo className={styles.logo_wrapper_svg} />
                    </Link>

                    {session && !isMobile && (
                        <StudioTypeSelector />
                    )}

                    {/* Button */}
                    <div className={styles.offer_section}>

                        {!session && (
                            <div
                                className={styles.login_button}
                                onClick={(e) => {
                                    e.preventDefault();
                                    trackGtmEvent("header_log_in", {
                                        ecommerce: { usid: "guest" },
                                    });
                                    toggleLoginModal();
                                }}
                            >
                                Log in
                            </div>
                        )}

                        {/* {session && (
                            <div
                                className={styles.login_button}
                                onClick={(e) => {
                                    e.preventDefault();
                                    trackGtmEvent("header_log_out", {
                                        ecommerce: { usid: "guest" },
                                    });
                                    signOut();
                                }}
                            >
                                Sign out
                            </div>
                        )} */}

                        <button
                            className={styles.buy_button}
                            onClick={() => {
                                if (!session?.user?.id) {
                                    toggleLoginModal();
                                    return
                                }
                                const eventName = buttonText() === "Get started" ? "header_get_started" : "header_upgrade";

                                trackGtmEvent(eventName, {
                                    ecommerce: { usid: session?.user?.id },
                                });
                                handleNavigation("/pricing");
                            }}
                        >
                            <span className={styles.button_text}>{buttonText()}</span>
                            <ArrowIcon className={styles.arrow_icon} />
                        </button>

                        {/* Hamburger Button for Mobile Navbar*/}
                        {isMobile && session && (
                            <div
                                className={`${styles.menu_toggle} ${isMenuOpen ? styles.nav_open : ""}`}
                                onClick={toggleMenu}
                            >
                                <span className={`${styles.menu_toggle_bar} ${styles.menu_toggle_bar_top}`}></span>
                                <span className={`${styles.menu_toggle_bar} ${styles.menu_toggle_bar_bottom}`}></span>
                            </div>
                        )}

                    </div>

                    {(!isMobile && session?.user?.id) && (
                        <UserProfile 
                            onMenuToggle={() => setIsMenuOpen(false)} 
                            showDesktopLinks={true}
                        />
                    )}
                </div>

                {/* Mobile navigation content */}
                {isMenuOpen && isMobile && (
                    <div className={`${styles.mobile_nav_content} ${isMenuOpen && isMobile ? styles.mobile_nav_content_opened : ""}`}>

                        <div className={styles.mobile_nav_links}>
                            {session?.user?.id &&
                                <UserProfile 
                                    onMenuToggle={() => setIsMenuOpen(false)} 
                                />
                            }
                        </div>

                        <div className={styles.mobile_nav_ineer_navigation_links}>
                            <button 
                                className={styles.mobile_nav_menu_button}
                                onClick={() => {
                                    const button = document.getElementById('photoshot-btn');
                                    if (button) button.classList.add(styles.button_active);
                                    setTimeout(() => {
                                        toggleMenu();
                                        router.push("/photoshoot");
                                    }, 150);
                                }}
                                id="photoshot-btn"
                            >
                                <div className={styles.button_content}>
                                    <NavMenuStarsIcon className={styles.menu_icon} />
                                    <span>AI Photoshot</span>
                                </div>
                            </button>

                            <button 
                                className={styles.mobile_nav_menu_button}
                                onClick={() => {
                                    const button = document.getElementById('studio-btn');
                                    if (button) button.classList.add(styles.button_active);
                                    setTimeout(() => {
                                        toggleMenu();
                                        router.push("/studio");
                                    }, 150);
                                }}
                                id="studio-btn"
                            >
                                <div className={styles.button_content}>
                                    <NavMenuGlobeIcon className={styles.menu_icon} />
                                    <span>Creative Studio</span>
                                </div>
                            </button>

                            {/* <button 
                                className={styles.mobile_nav_menu_button}
                                onClick={() => {
                                    const button = document.getElementById('gallery-btn');
                                    if (button) button.classList.add(styles.button_active);
                                    setTimeout(() => {
                                        toggleMenu();
                                        router.push("/gallery");
                                    }, 150);
                                }}
                                id="gallery-btn"
                            >
                                <div className={styles.button_content}>
                                    <NavMenuCommunityIcon className={styles.menu_icon} />
                                    <span>Community gallery</span>
                                </div>
                            </button> */}
                        </div>

                        <div className={styles.mobile_nav_spacer}></div>

                        <div className={styles.mobile_nav_ineer_navigation_links}>
                            <button 
                                className={styles.mobile_nav_menu_button}
                                onClick={() => {
                                    const button = document.getElementById('settings-btn');
                                    if (button) button.classList.add(styles.button_active);
                                    setTimeout(() => {
                                        toggleMenu();
                                        router.push("/settings");
                                    }, 150);
                                }}
                                id="settings-btn"
                            >
                                <div className={styles.button_content}>
                                    <NavMenuFolderIcon className={styles.menu_icon} />
                                    <span>Settings</span>
                                </div>
                            </button>

                            <button 
                                className={styles.mobile_nav_menu_button}
                                onClick={() => {
                                    const button = document.getElementById('terms-of-service-btn');
                                    if (button) button.classList.add(styles.button_active);
                                    setTimeout(() => {
                                        toggleMenu();
                                        router.push("/legal/terms-of-service");
                                    }, 150);
                                }}
                                id="terms-of-service-btn"
                            >
                                <div className={styles.button_content}>
                                    <NavMenuTermsIcon className={styles.menu_icon} />
                                    <span>Terms of servive</span>
                                </div>
                            </button>

                            <button 
                                className={styles.mobile_nav_menu_button}
                                onClick={() => {
                                    const button = document.getElementById('privacy-policy-btn');
                                    if (button) button.classList.add(styles.button_active);
                                    setTimeout(() => {
                                        toggleMenu();
                                        router.push("/legal/privacy-policy");
                                    }, 150);
                                }}
                                id="privacy-policy-btn"
                            >
                                <div className={styles.button_content}>
                                    <NavMenuPrivacyIcon className={styles.menu_icon} />
                                    <span>Privacy policy</span>
                                </div>
                            </button>
                        </div>
                        
                        <button 
                            className={styles.mobile_nav_menu_button_log_out}
                            onClick={() => {
                                toggleMenu();
                                    signOut();
                                    router.push("/");
                            }}
                        >
                            Log out
                        </button>
                    </div>
                )}

            </nav>
            <LoginModal isOpen={isLoginModalOpen} onClose={toggleLoginModal} order='default' />
        </>
    );
};
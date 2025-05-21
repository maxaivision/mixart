"use client";

import React from "react";
import { useState, useEffect } from "react";

// Next specific import
import { signIn, signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Styles import
import styles from "./ControlMenu.module.css";

// Import context
import { useControlMenuContext } from "@/app/context/ControlMenuContext";

// Centralized image import
import StarsIcon from "@/public/images/icons/controller/stars-icon.svg";
import VideoIcon from "@/public/images/icons/controller/video-icon.svg";
import BrushIcon from "@/public/images/icons/controller/brush-icon.svg";
import ImageIcon from "@/public/images/icons/controller/image-icon.svg";

// Components import
import GeneratorControls from "./GeneratorControls";
import CanvasControls from "./CanvasControls";
import UpscaleControls from "./UpscaleControls";
import VideoControls from "./VideoControls";
import UpgradeBanner from "../UpgradeBanner/UpgradeBanner";

export default function StudioControlMenu () {

    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const tab = searchParams.get("tab") || null;


    // Use the context
    const {
        resetToDefault,
    } = useControlMenuContext();

    const handleMenuClick = (selectedTab: string) => {
        const params = new URLSearchParams(window.location.search);
        params.set("tab", selectedTab);
        resetToDefault();
        router.push(`?${params.toString()}`, { scroll: false });
    };
    
    const navigateToCreation = () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("tab");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className={styles.controls_menu_inner}>

            {!tab && (
                <div className={styles.menuListWrapper}>
                    <div className={styles.studio_header}>
                        <span className={styles.studio_header_text}>Creative Studio</span>
                    </div>

                    {session?.user?.subscription === 'Free' && (
                        <UpgradeBanner />
                    )}

                    <ul className={styles.menuList}>
                        <li 
                            className={`${styles.menuItem}`}
                            onClick={() => handleMenuClick("generator")}
                        >
                            <span className={styles.icon}>
                                <StarsIcon />   
                            </span> Prompt Generator
                        </li>
                        <div className={styles.underline}></div>

                        <li 
                            className={styles.menuItem}
                            onClick={() => handleMenuClick("canvas")}
                        >
                            <span className={styles.icon}>
                                <BrushIcon />
                            </span> Canvas
                        </li>
                        <div className={styles.underline}></div>
                        
                        {/* <li className={styles.menuItem}>
                            <span className={styles.icon}>
                                <CommunityIcon />
                        </span> Community gallery
                        </li>
                        <div className={styles.underline}></div> */}

                        <li 
                            onClick={() => handleMenuClick("upscale")} 
                            className={styles.menuItem}
                        >
                            <span className={styles.icon}>
                                <ImageIcon />
                            </span> Image Upscale
                        </li>
                        <div className={styles.underline}></div>

                        {/* <li 
                            onClick={() => handleMenuClick("video")} 
                            className={styles.menuItem}
                        >
                           <span className={styles.icon}>
                                <VideoIcon />
                            </span> Video
                        </li>
                        <div className={styles.underline}></div> */}
                    </ul>
                </div>
            )}
                
            {tab === "generator" && <GeneratorControls navigateToCreation={navigateToCreation} />}
            {tab === "canvas" && <CanvasControls navigateToCreation={navigateToCreation} />}
            {tab === "upscale" && <UpscaleControls navigateToCreation={navigateToCreation} />}
            {tab === "video" && <VideoControls navigateToCreation={navigateToCreation} />}

        </div>
    );
};

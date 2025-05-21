"use client";

import React from "react";
import { useState, useEffect } from "react";

// Next specific import
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from 'next-auth/react';

// Import icons
import ReturnIcon from "@/public/images/icons/controller/return-icon.svg";
import ResetIcon from "@/public/images/icons/controller/reset-icon.svg";

// Import context
import { useControlMenuContext } from "@/app/context/ControlMenuContext";

// Import styles
import styles from "./ControlMenu.module.css";

// Import components
import UpscaleImage from "../UpscaleImage/UpscaleImage";
import VideoPromptInput from "../Prompt/VideoPromptInput";
import UpgradeBanner from "../UpgradeBanner/UpgradeBanner";

// Functions
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

interface VideoControlsProps {
    navigateToCreation: () => void;
}

type SelectedUpscaleType = "2x" | "4x";

export default function VideoControls ({navigateToCreation} : VideoControlsProps) {

    const { data: session } = useSession();

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    // Use the context
    const {
        videoPrompt,
        setVideoPrompt,
        upscaleSelectedValue,
        setUpscaleSelectedValue,
        resetToDefault,
    } = useControlMenuContext();

    const [resetHighlight, setResetHighlight] = useState(false);

    const upscaleMap: Record<SelectedUpscaleType, number> = { "2x": 1, "4x": 2 };
    const inverseUpscaleMap: Record<number, SelectedUpscaleType> = { 1: "2x", 2: "4x" };

    const handleReset = () => {
        resetToDefault();

        // Highlight reset button for 0.2 seconds
        setResetHighlight(true);
        setTimeout(() => setResetHighlight(false), 200);
    };

    const handleGenerate = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        console.log("Generate button clicked");
    };

    return (
        <div className={styles.generator_controls_wrapper}>

            <div className={styles.generator_controls_header}>
                <ReturnIcon 
                    className={styles.controls_return_button}
                    onClick={navigateToCreation}
                />
                <span className={styles.controls_return_text}>Video Generation</span>
            </div>

            <div className={styles.generator_controls_inner_wrapper}>

                {session?.user?.subscription === 'Free' && (
                    <UpgradeBanner />
                )}
                
                <VideoPromptInput
                    value={videoPrompt}
                    onChange={setVideoPrompt}
                    color="var(--text-color-gray)"
                />
                
                <UpscaleImage 
                    showDescription={true}
                    description="Upload an image to enhance its resolution and quality using AI upscaling."
                    color="var(--text-color-gray)"
                />

                {isMobile && (
                    <div className={styles.controls_generation_button_group}>
                        <div className={styles.reset_group_wrapper}>
                            <div
                                className={`${styles.reset_group} ${resetHighlight ? styles.reset_highlight : ''}`}
                                onClick={handleReset}
                            >
                                <ResetIcon className={styles.reset_group_icon} />
                                <span className={styles.reset_group_text}>Reset to default</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {!isMobile && (
                <div className={styles.controls_generation_button_group}>
                    <div className={styles.reset_group_wrapper}>
                        <div
                            className={`${styles.reset_group} ${resetHighlight ? styles.reset_highlight : ''}`}
                            onClick={handleReset}
                        >
                            <ResetIcon className={styles.reset_group_icon} />
                            <span className={styles.reset_group_text}>Reset to default</span>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.controls_generation_actions_wrapper}>
                <small className={styles.controls_gemeration_small_text}>
                    You need 2 credits for this generation.
                </small>
                <div className={styles.controls_generation_actions}>
                    <button
                        className={styles.controls_generation_button}
                        onClick={handleGenerate}
                    >
                        <span className={styles.button_text}>
                            {!session ? "Create free account" : "Generate"}
                        </span>
                    </button>
                </div>
            </div>

        </div>
    );
};
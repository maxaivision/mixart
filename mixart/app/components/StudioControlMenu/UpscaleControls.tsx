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
import { eventBus } from "@/app/lib/event/eventBus";

// Import styles
import styles from "./ControlMenu.module.css";

// Import components
import UpscaleImage from "../UpscaleImage/UpscaleImage";
import CustomSlider from "../CustomSlider/CustomSlider";
import UpscaleHelpBanner from "../UpscaleHelpBanner/UpscaleHelpBanner";
import UpgradeBanner from "../UpgradeBanner/UpgradeBanner";
import LoginModal from "../LoginModal/LoginModal";
import SubscriptionPopup from "../SubscriptionPopup/SubscriptionPopup";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Functions
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

interface UpscaleControlsProps {
    navigateToCreation: () => void;
}

type SelectedUpscaleType = "2x" | "4x";

type ResolutionLabel = 'None' | '2x' | '4x';

const resolutionPrices: Record<ResolutionLabel, number> = {
	"None": 1,
	"2x": 2,
	"4x": 4
};

export default function UpscaleControls ({navigateToCreation} : UpscaleControlsProps) {

    const { data: session, status, update } = useSession();

    // Use the context
    const {
        prompt,
        steps,
        neg_prompt,
        cfg,
        model,
        size,
        denoise,
        weights_interpretator,
        upscale,
        facelock_weight,
        facelock_type,
        pose_weight,
        inpaint_what,
        loras,
        userImage,
        upscaleSelectedValue,
        setUpscaleSelectedValue,
        resetToDefault,
    } = useControlMenuContext();

    const requiredTokens = upscaleSelectedValue === "2x" || upscaleSelectedValue === '4x'
    ? resolutionPrices[upscaleSelectedValue]
    : 1;

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    const [resetHighlight, setResetHighlight] = useState(false);

    const [generationAllowed, setGenerationAllowed] = useState(true);

    const upscaleMap: Record<SelectedUpscaleType, number> = { "2x": 1, "4x": 2 };
    const inverseUpscaleMap: Record<number, SelectedUpscaleType> = { 1: "2x", 2: "4x" };

    const handleReset = () => {
        resetToDefault();

        // Highlight reset button for 0.2 seconds
        setResetHighlight(true);
        setTimeout(() => setResetHighlight(false), 200);
    };

    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
        
    const toggleLoginModal = () => {
        setLoginModalOpen(!isLoginModalOpen);
    };

    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const togglePricingModal = () => setIsPricingModalOpen((v) => !v);

    const handleGenerate = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setGenerationAllowed(false);
              
        if (!session?.user?.id) return;

        if (session?.user?.subscription === "Free") {
            togglePricingModal();
            setGenerationAllowed(true);
            return;
        }
        
        if (session?.user?.credits === 0) {
            // checkFeedbackModalOpenCase();
            toast.error('You do not have enough tokens to generate these images.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGenerationAllowed(true);
            return;
        }
        
        // if (session?.user?.emailVerified !== true) {
        //     // checkFeedbackModalOpenCase();
        //     toast.error('Please verify your email to generate images. If you already did - please reopen our site.', {
        //         position: "top-right",
        //         autoClose: 5000,
        //         hideProgressBar: false,
        //         closeOnClick: true,
        //         pauseOnHover: true,
        //         draggable: true,
        //         progress: undefined,
        //         theme: "dark",
        //     });
        //     setGenerationAllowed(true);
        //     return;
        // }
        
        let type_gen = "img2upscale";

        let requiredTokens = 1;

        if (upscaleSelectedValue === "2x" || upscaleSelectedValue === '4x') {
            requiredTokens = requiredTokens * resolutionPrices[upscaleSelectedValue] 
        }

        if ((session?.user?.credits ?? 0) < requiredTokens) {
            toast.error('You do not have enough tokens to generate these images.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGenerationAllowed(true);
            return;
        }
        
        let imageId;

        try {
        
            const blobFromBase64 = (base64: string): Blob => {
                const byteString = atob(base64.split(',')[1]);
                const byteArray = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    byteArray[i] = byteString.charCodeAt(i);
                }
                return new Blob([byteArray], { type: 'image/png' });
            };

            const deductionResponse = await fetch('/api/user/tokens/subtract', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: session.user.email, tokensToDeduct: requiredTokens }),
            });
            
            const deductionData = await deductionResponse.json();
            // console.log('deductionData', deductionData);
            if (deductionData.message !== 'User credits updated successfully') throw new Error(deductionData.message);
            // if (!deductionResponse.ok) throw new Error(deductionData.message);
            
            // Update session with new token count
            await update({ user: { ...session?.user, credits: deductionData.newTokenCount } });
        
            const createImageResponse = await fetch('/api/image/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: session.user.id,
                    type_gen,
                    prompt: 'upscale',
                    model,
                    steps,
                    cfg,
                    denoise,
                    weights_interpretator,
                    upscale: upscaleSelectedValue,
                    facelock_weight,
                    facelock_type,
                    pose_weight,
                    inpaint_what,
                    size,
                    seed: null,
                    style: 'null',
                    tool: 'Upscale',
                    neg_prompt,
                    pipeline: "Upscale",
                    loras,
                    favorite: false,
                    cost: 1,
                    user_shared_settings: false,
                }),
            });
    
            const imageData = await createImageResponse.json();
    
            if (imageData.message !== 'Image document added successfully') {
                throw new Error(imageData.message);
            }
            
            imageId = imageData.imageId;
            
            // Step 2: Prepare formData for generation
            const formData = new FormData();
            
            if (userImage.image && userImage.imageType === 'upscale') {
                formData.append('image', blobFromBase64(userImage.image), 'image.png');
            }       
    
            // formData.append('params', JSON.stringify({ upscale: upscaleSelectedValue }));
            formData.append('params', upscaleSelectedValue);
            formData.append('type_gen', type_gen);
            formData.append('type_user',  session?.user?.subscription === "Free" ? "free" : "vip");
            formData.append('id_gen', imageId);
    
            // Step 3: Send to generation endpoint
            const genRes  = await fetch('/api/gen/image/upscale', {
                method: 'POST',
                body: formData,
            });
    
            if (!genRes.ok) {
                const errorText = await genRes.text();
                throw new Error(`Error submitting image: ${errorText}`);
            }
        
            toast.success(`Image submitted!`);
            eventBus.dispatchEvent(new Event("generation-start"));
            resetToDefault();
              
        } catch (err) {

            const addResponse = await fetch('/api/user/tokens/add', {
                method: 'PUT',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: session.user.email, tokensToAdd: requiredTokens }),
            });

            const addData = await addResponse.json();
            // console.log('addData', addData);
        
            if (addData.message !== 'User credits updated successfully') throw new Error(addData.message);
        
            // Update session with new token count
            await update({ user: { ...session?.user, credits: addData.newTokenCount } });
            // console.log('addData.newTokenCount', addData.newTokenCount);
            // console.log('session', session);

            if (imageId) {
                const deleteResponse = await fetch('/api/image/delete', {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({imageId})
                });

                const deleteResult = await deleteResponse.json();
                if (deleteResult.message !== 'Image deleted successfully') throw new Error(deleteResult.message);
            }

            console.error('❌ Generation failed:', err);
            toast.error(`Generation failed: ${(err as Error).message}`);
            setGenerationAllowed(true);
        }
    }

    useEffect(() => {
        async function handleUnblockGeneration() {
            console.log("🚀 Heard 'generation-finish' event, unblocking generation");
            setGenerationAllowed(true);
        }
                              
        // Subscribe to the event
        eventBus.addEventListener("generation-finish", handleUnblockGeneration);
        // Or using window directly:
        // window.addEventListener("generation-finish", handleUnblockGeneration);
                              
        return () => {
            eventBus.removeEventListener("generation-finish", handleUnblockGeneration);
            // Or:
            // window.removeEventListener("generation-finish", handleUnblockGeneration);
        };
    }, [session?.user?.id]);
        
    useEffect(() => {
        async function handleBlockGeneration() {
            console.log("🚀 Heard 'generation-start' event, unblocking generation");
            setGenerationAllowed(false);
        }
                            
        // Subscribe to the event
        eventBus.addEventListener("generation-start", handleBlockGeneration);
        // Or using window directly:
        // window.addEventListener("generation-start", handleUnblockGeneration);
                            
        return () => {
            eventBus.removeEventListener("generation-start", handleBlockGeneration);
                // Or:
            // window.removeEventListener("generation-start", handleUnblockGeneration);
        };
    }, [session?.user?.id]);

    return (
        <div className={styles.generator_controls_wrapper}>

            <div className={styles.generator_controls_header}>
                <ReturnIcon 
                    className={styles.controls_return_button}
                    onClick={navigateToCreation}
                />
                <span className={styles.controls_return_text}>Image Upscale</span>
            </div>

            <div className={styles.generator_controls_inner_wrapper}>

                {session?.user?.subscription === 'Free' && (
                    <UpgradeBanner />
                )}

                <UpscaleImage 
                    showDescription={true}
                    description="Upload an image to enhance its resolution and quality using AI upscaling."
                    color="var(--text-color-gray)"
                />

                {/* Slider */}
                <div className={styles.slider_wrapper}>
                    <CustomSlider
                        value={upscaleMap[upscaleSelectedValue]}
                        onValueChange={(val) => setUpscaleSelectedValue(inverseUpscaleMap[val as number])}
                        sliderHeight={3}
                        thumbDiameter={12}
                        min={1}
                        max={2}
                        step={1}
                        showDescription={true}
                        description='Choose how much to enhance your image: 2x for faster, lighter upscaling, or 4x for maximum detail and resolution.'
                        descriptionOffset='-1px'
                        showValue={true}
                        showLabel={true}
                        label='Upscale'
                        color="var(--text-color-gray)"
                        showValueMap={true}
                        valueMap={inverseUpscaleMap}
                    />
                </div>

                <div className={styles.content_spacer}></div>

                <UpscaleHelpBanner />

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
                    You need {requiredTokens} credit{requiredTokens > 1 ? 's' : ''} for this generation.
                </small>
                <div className={styles.controls_generation_actions}>
                    <button
                        disabled={!generationAllowed}
                        className={`${styles.controls_generation_button} ${!generationAllowed ? styles.controls_generation_button_disabled : ''}`}
                        onClick={e => {
                            if (session?.user?.id) {
                                handleGenerate(e);
                            } else {
                                toggleLoginModal();
                            }
                        }}
                    >
                        <span className={styles.button_text}>
                            {!session ? "Create free account" : "Generate"}
                        </span>
                    </button>
                </div>
                
                <LoginModal isOpen={isLoginModalOpen} onClose={toggleLoginModal} order='default'/>
                <SubscriptionPopup isOpen={isPricingModalOpen} onClose={togglePricingModal} />
                
            </div>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
};
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

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import styles
import styles from "./ControlMenu.module.css";

// Import components
import PromptInput from "../Prompt/PromptInput";
import MaskImage from "../MaskImage/MaskImage";
import MaskBaseImage from "../MaskBaseImage/MaskBaseImage";
import CanvasHelpBanner from "../CanvasHelpBanner/CanvasHelpBanner";
import UpgradeBanner from "../UpgradeBanner/UpgradeBanner";
import LoginModal from "../LoginModal/LoginModal";
import SubscriptionPopup from "../SubscriptionPopup/SubscriptionPopup";

// Functions
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";
import { user } from "@heroui/theme";

interface CanvasControlsProps {
    navigateToCreation: () => void;
}

export default function CanvasControls ({navigateToCreation} : CanvasControlsProps) {

    const { data: session, status, update } = useSession();

    const [generationAllowed, setGenerationAllowed] = useState(true);

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    // Use the context
        const {
            prompt,
            setPrompt,
            steps,
            neg_prompt,
            cfg,
            resetToDefault,
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
            poseImage,
            maskImage,
            maskBaseImage,
        } = useControlMenuContext();

    const [resetHighlight, setResetHighlight] = useState(false);

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
    
        if (prompt === '') {
            toast.warn('Please provide a prompt for the generation.', {
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

        if (!maskImage.image) {
            toast.warn('Please provide mask image', {
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

        if (!maskBaseImage) {
            toast.warn('Please draw and save mask image', {
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
    
        let type_gen = "img2inpaint";

        let requiredTokens = 1;

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
    
            const blobFromBase64 = (base64: string): Blob => {
                const byteString = atob(base64.split(',')[1]);
                const byteArray = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    byteArray[i] = byteString.charCodeAt(i);
                }
                return new Blob([byteArray], { type: 'image/png' });
            };
    
            const createImageResponse = await fetch('/api/image/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                userId: session.user.id,
                type_gen,
                prompt,
                model,
                steps,
                cfg,
                denoise,
                weights_interpretator,
                upscale,
                facelock_weight,
                facelock_type,
                pose_weight,
                inpaint_what,
                size,
                seed: null,
                style: 'null',
                tool: 'Canvas',
                neg_prompt,
                pipeline: "Canvas",
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
        
            if (maskImage.image && maskImage.imageType === 'canvas') {
                formData.append('image', blobFromBase64(maskImage.image), 'image.png');
            }
            if (maskBaseImage) {
                formData.append('pose', blobFromBase64(maskBaseImage), 'mask.png');
            }
        
            const params = {
                prompt,
                negprompt: neg_prompt,
                model,
                resolution: size,
                steps,
                cfg,
                denoise,
                weights_interpretator,
                upscale,
                facelock_weight,
                facelock_type,
                pose_weight,
                inpaint_what,
                loras,
            };
        
            let JSONparams = JSON.stringify(params).toString();

            formData.append('params', JSONparams);
            formData.append('type_gen', type_gen);
            formData.append('type_user',  session?.user?.subscription === "Free" ? "free" : "vip");
            formData.append('id_gen', imageId);

            // Step 3: Send to generation endpoint
            const genRes  = await fetch('/api/gen/image/instant', {
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
    };

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
                <span className={styles.controls_return_text}>Canvas</span>
            </div>

            <div className={styles.generator_controls_inner_wrapper}>

                {session?.user?.subscription === 'Free' && (
                    <UpgradeBanner />
                )}

                <PromptInput
                    value={prompt}
                    onChange={setPrompt}
                    showDescription={true}
                    description="What do you want to see? You can use a single word or a full sentence."
                    color="var(--text-color-gray)"
                />

                <MaskImage 
                    showDescription={true}
                    description="Mask Image is a base image which is used to determine which parts of initial image to leave the same."
                    color="var(--text-color-gray)"
                />

                <MaskBaseImage 
                    showDescription={true}
                    description="Mask is used to specify areas of the input image that you want to modify. Leave blank and provide mask prompt for automatic detection."
                    color="var(--text-color-gray)"
                />

                <div className={styles.content_spacer}></div>

                <CanvasHelpBanner />

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
                    You need 1 credit for this generation.
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
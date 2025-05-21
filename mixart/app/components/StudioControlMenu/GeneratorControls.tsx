"use client";

import React from "react";
import { useState, useEffect } from "react";

// Next specific import
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from 'next-auth/react';

// Import icons
import ReturnIcon from "@/public/images/icons/controller/return-icon.svg";
import ArrowDownIcon from "@/public/images/icons/controller/arrow-down.svg";
import ArrowUpIcon from "@/public/images/icons/controller/arrow-up.svg";
import ResetIcon from "@/public/images/icons/controller/reset-icon.svg";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import context
import { useControlMenuContext } from "@/app/context/ControlMenuContext";

import { eventBus } from "@/app/lib/event/eventBus";

// Import styles
import styles from "./ControlMenu.module.css";

import LoginModal from "../LoginModal/LoginModal";
import SubscriptionPopup from "../SubscriptionPopup/SubscriptionPopup";

// Import components
import PromptInput from "../Prompt/PromptInput";
import ModelSelector from "../Model/ModelSelector";
import ImageOptions from "../ImageOptions/ImageOptions";
import SizeOptions from "../SizeOptions/SizeOptions";
import ResolutionOptions from "../ResolutionOptions/ResolutionOptions";
import ImageNumberOptions from "../ImageNumberOptions/ImageNumberOptions";
import NegativePromptInput from "../Prompt/NegativePromptInput";
import PoseOptions from "../PoseOptions/PoseOptions";
import CustomSlider from "../CustomSlider/CustomSlider";
import WeightsInterpretatorOptions from "../WeightInterpretatorOptions/WeightInterpretatorOptions";
import UpgradeBanner from "../UpgradeBanner/UpgradeBanner";

// Functions
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

interface GeneratorControlsProps {
    navigateToCreation: () => void;
}

type ResolutionLabel = 'None' | '2x' | '4x';

const resolutionPrices: Record<ResolutionLabel, number> = {
	"None": 1,
	"2x": 2,
	"4x": 4
};

export default function GeneratorControls ({navigateToCreation} : GeneratorControlsProps) {

    const { data: session, status, update } = useSession();
    const router = useRouter();

    // Use the context
    const {
        prompt,
        setPrompt,
        steps,
        setSteps,
        neg_prompt,
        setNegPrompt,
        cfg,
        setCfg,
        allowPublicGallery,
        setAllowPublicGallery,
        resetToDefault,
        model,
        size,
        denoise,
        weights_interpretator,
        upscale,
        facelock_weight,
        facelock_type,
        setFacelockType,
        pose_weight,
        inpaint_what,
        loras,
        userImage,
        poseImage,
        maskImage,
        numberOfImages,
        setNumberOfImages
    } = useControlMenuContext();

    const requiredTokens = upscale === "2x" || upscale === '4x'
    ? (resolutionPrices[upscale] * numberOfImages)
    : numberOfImages;

    // State for tracking advanced settings visibility
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [generationAllowed, setGenerationAllowed] = useState(true);

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
		// 	// checkFeedbackModalOpenCase();
		// 	toast.error('Please verify your email to generate images. If you already did - please reopen our site.', {
		// 		position: "top-right",
		// 		autoClose: 5000,
		// 		hideProgressBar: false,
		// 		closeOnClick: true,
		// 		pauseOnHover: true,
		// 		draggable: true,
		// 		progress: undefined,
		// 		theme: "dark",
		// 	});
        //     setGenerationAllowed(true);
		// 	return;
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

        let type_gen;
        let facelockType;

        if (userImage.image && userImage.imageType === 'facelock') {
            type_gen = "txt2img";
            facelockType = 'faceswap';
        } else if (userImage.image && userImage.imageType === 'image') {
            type_gen = "img2img";
            facelockType = 'None';
        } else {
            type_gen = "txt2img";
            facelockType = 'None';
        }

        const initialImagesNumber = numberOfImages;
        let requiredTokens = initialImagesNumber;
        let tokensPerImage = requiredTokens / initialImagesNumber;

        if (upscale === "2x" || upscale === '4x') {
            tokensPerImage = tokensPerImage * resolutionPrices[upscale] 
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

        try {

            const blobFromBase64 = (base64: string): Blob => {
                const byteString = atob(base64.split(',')[1]);
                const byteArray = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    byteArray[i] = byteString.charCodeAt(i);
                }
                return new Blob([byteArray], { type: 'image/png' });
            };

            for (let i = 0; i < numberOfImages; i++) {

                let imageId;
                try {
                    const deductionResponse = await fetch('/api/user/tokens/subtract', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: session.user.email, tokensToDeduct: tokensPerImage }),
                    });
                    
                    const deductionData = await deductionResponse.json();
                    // console.log('deductionData', deductionData);
                    if (deductionData.message !== 'User credits updated successfully') throw new Error(deductionData.message);
                    // if (!deductionResponse.ok) throw new Error(deductionData.message);
                    
                    // Update session with new token count
                    await update({ user: { ...session?.user, credits: deductionData.newTokenCount } });
    
                    // Step 1: Create image document in DB
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
                        facelock_type: facelockType,
                        pose_weight,
                        inpaint_what,
                        size,
                        seed: null,
                        style: 'null',
                        tool: 'Studio',
                        neg_prompt,
                        pipeline: "Studio",
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
            
                    if (userImage.image && userImage.imageType === 'image') {
                        formData.append('image', blobFromBase64(userImage.image), 'image.png');
                    }
                    if (poseImage.image) {
                        formData.append('pose', blobFromBase64(poseImage.image), 'pose.png');
                    }
                    if (userImage.image && userImage.imageType === 'facelock') {
                        formData.append('facelock', blobFromBase64(userImage.image), 'facelock.png');
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
                        facelock_type: facelockType,
                        pose_weight,
                        inpaint_what,
                        loras,
                    };
            
                    let JSONparams = JSON.stringify(params).toString();
    
                    formData.append('params', JSONparams);
                    formData.append('type_gen', type_gen);
                    formData.append('type_user', session?.user?.subscription === "Free" ? "free" : "vip");
                    formData.append('id_gen', imageId);
    
                    // Step 3: Send to generation endpoint
                    const genRes  = await fetch('/api/gen/image/instant', {
                        method: 'POST',
                        body: formData,
                    });
    
                    if (!genRes.ok) {
                        const errorText = await genRes.text();
                        throw new Error(`Error submitting image ${i + 1}: ${errorText}`);
                    }
                } catch (error) {
                    const addResponse = await fetch('/api/user/tokens/add', {
                        method: 'PUT',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: session.user.email, tokensToAdd: tokensPerImage }),
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

                    console.error('❌ Generation failed:', error);
                    toast.error(`Generation failed: ${(error as Error).message}`);
                    setGenerationAllowed(true);
                }
            }

            toast.success(`${numberOfImages} image${numberOfImages > 1 ? 's' : ''} submitted!`);
            eventBus.dispatchEvent(new Event("generation-start"));
            resetToDefault();
      
        } catch (err) {
            console.error('❌ Generation failed:', err);
            toast.error(`Generation failed: ${(err as Error).message}`);
            setGenerationAllowed(true);
        }
    };

    useEffect(() => {
        async function handleUnblockGeneration() {
            // console.log("🚀 Heard 'generation-finish' event, unblocking generation");
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
            // console.log("🚀 Heard 'generation-finish' event, unblocking generation");
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

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;
    const [resetHighlight, setResetHighlight] = useState(false);

    const handleReset = () => {
        resetToDefault();

        // Highlight reset button for 0.2 seconds
        setResetHighlight(true);
        setTimeout(() => setResetHighlight(false), 200);
    };

    return (
        <div className={styles.generator_controls_wrapper}>

            <div className={styles.generator_controls_header}>
                <ReturnIcon 
                    className={styles.controls_return_button}
                    onClick={navigateToCreation}
                />
                <span className={styles.controls_return_text}>Prompt Generator</span>
            </div>

            <div className={styles.generator_controls_inner_wrapper}>
                {session?.user?.subscription === 'Free' && (
                    <UpgradeBanner />
                )}

                <PromptInput
                    value={prompt}
                    onChange={setPrompt}
                    color="var(--text-color-gray)"
                />
                <ModelSelector />
                <ImageOptions />
                <SizeOptions />
                <ResolutionOptions />
                <ImageNumberOptions />

                <div className={styles.content_spacer}></div>

                <button
                    className={styles.advanced_settings_toggle}
                    onClick={() => setIsAdvancedOpen((prev) => !prev)}
                >
            
                    {isAdvancedOpen ? (
                        <ArrowUpIcon className={styles.toggle_icon} />
                    ) : (
                        <ArrowDownIcon className={styles.toggle_icon} />
                    )}

                    <span className={styles.toggle_text}>Advanced settings</span>

                </button>

                {isAdvancedOpen && (
                    <div className={styles.advanced_settings_container}>

                        <NegativePromptInput
                            value={neg_prompt}
                            onChange={setNegPrompt}
                        />

                        <PoseOptions />

                        {/* Slider */}
                        <div className={styles.slider_wrapper}>
                            <CustomSlider
                                value={cfg}
                                onValueChange={setCfg}
                                sliderHeight={3}
                                thumbDiameter={12}
                                min={2}
                                max={10}
                                step={0.5}
                                decimal={true}
                                showDescription={true}
                                description='Increasing the Cfg value can lead to images that more closely match the details specified in the prompt, while lowering it allows for more creative and abstract interpretations by the model.'
                                descriptionOffset='-1px'
                                showValue={true}
                                showLabel={true}
                                label='Classification guidance'
                                color="var(--text-color-gray)"
                            />
                        </div>

                        {/* Slider */}
                        <div className={styles.slider_wrapper}>
                            <CustomSlider
                                value={steps}
                                onValueChange={setSteps}
                                sliderHeight={3}
                                thumbDiameter={12}
                                min={20}
                                max={50}
                                showDescription={true}
                                description='Select the number of steps that are taken during image generation process.'
                                descriptionOffset='-1px'
                                showValue={true}
                                showLabel={true}
                                label='Steps'
                                color="var(--text-color-gray)"
                            />
                        </div>

                        <WeightsInterpretatorOptions />

                    </div>
                )}

                {isMobile && (
                    <div className={styles.controls_generation_button_group}>
                        <div className={styles.public_gallery_group_wrapper}>
                            <div className={styles.public_gallery_group_text_wrapper}>
                                <span className={styles.public_gallery_group_text_up}>
                                    Public gallery
                                </span>
                                <span className={styles.public_gallery_group_text_down}>
                                    Share your images in public gallery.
                                </span>
                            </div>
                            {/* Toggle Switch */}
                            <label className={styles.switch}>
                                <input
                                type="checkbox"
                                checked={allowPublicGallery}
                                onChange={(e) => setAllowPublicGallery(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
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
                    <div className={styles.public_gallery_group_wrapper}>
                        <div className={styles.public_gallery_group_text_wrapper}>
                            <span className={styles.public_gallery_group_text_up}>
                                Public gallery
                            </span>
                            <span className={styles.public_gallery_group_text_down}>
                                Share your images in public gallery.
                            </span>
                        </div>
                        {/* Toggle Switch */}
                        <label className={styles.switch}>
                            <input
                            type="checkbox"
                            checked={allowPublicGallery}
                            onChange={(e) => setAllowPublicGallery(e.target.checked)}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
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
"use client";

import React, { useState, useEffect, useRef } from "react";

// Next specific import
import { signIn, signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from "next/navigation";

// Styles import
import styles from "./PhotoshootControls.module.css";

// Import context
import { useControlMenuContext } from "@/app/context/ControlMenuContext";
import { useUserContext } from '@/app/context/UserContext';

// Functions
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

// Centralized image import
import ResetIcon from "@/public/images/icons/controller/reset-icon.svg";

import PhotoshootTypeData from "@/app/lib/data/PhotoshootTypeData";

import Loader from '@/public/assets/icons/loader.svg';

import { trackGtmEvent } from "@/app/lib/analytics/google/trackGtmEvent";

// Components import
import UpgradeBanner from "../UpgradeBanner/UpgradeBanner";
import PhotoshootPromptInput from "../Prompt/PhotoshootPromptInput";
import SizeOptions from "../SizeOptions/SizeOptions";
import PhotoshootModelSelector from "../PhotoshootModelSelector/PhotoshootModelSelector";
import LoginModal from "../LoginModal/LoginModal";
import SubscriptionPopup from "../SubscriptionPopup/SubscriptionPopup";

import { eventBus } from "@/app/lib/event/eventBus";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Add these imports at the top of the file
import DeleteIcon from "@/public/assets/icons/delete-icon.svg";
import RightArrow from "@/public/assets/icons/right-arrow.svg";
import Image from "next/image";

export default function PhotoshootControls({ 
    openedFromController = false, 
    onStyleSelect,
    onGenerate,
}: { 
    openedFromController?: boolean;
    onStyleSelect?: () => void;
    onGenerate?: () => void;
}) {

    const { data: session, status, update } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    const [isLoraTraining, setIsLoraTraining] = useState(false);

    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    
    const toggleLoginModal = () => {
        setLoginModalOpen(!isLoginModalOpen);
    };

    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const togglePricingModal = () => setIsPricingModalOpen((v) => !v);

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
        type_gen,
        resetToDefault,
        selectedTypeIndex, 
        setSelectedTypeIndex,
        selectedPhotoshootModelIndex,
        setSelectedPhotoshootModelIndex,
        selectedGenderFilter,
        setSelectedGenderFilter,
    } = useControlMenuContext();

    const [resetHighlight, setResetHighlight] = useState(false);
    const [generationAllowed, setGenerationAllowed] = useState(true);

    const reportedReadyModels = useRef<Set<string>>(new Set());

    const { modelMap, updateModelMap } = useUserContext();

    useEffect(() => {
        const map = modelMap;
        map.forEach((m) => {
          if (m.status === "ready") {
            reportedReadyModels.current.add(m.id_gen || m._id || m.name_lora);
          }
        });
    }, [modelMap]);
    
    useEffect(() => {
        const handleLoraStart = async () => {
          // Fetch updated user data including modelMap
          await updateModelMap();
          setIsLoraTraining(true);
        };
      
        eventBus.addEventListener("generation-lora-start", handleLoraStart);
      
        return () => {
          eventBus.removeEventListener("generation-lora-start", handleLoraStart);
        };
    }, [updateModelMap]);

    useEffect(() => {
        if (!isLoraTraining) return;
      
        const interval = setInterval(async () => {
          await updateModelMap();
      
          // Process model map data
          modelMap.forEach((model) => {
            if (model.status === "ready") {
              const id = model.id_gen || model._id || model.name_lora;
              if (!reportedReadyModels.current.has(id)) {
                trackGtmEvent("added_model", {
                  ecommerce: { usid: session?.user?.id }
                });
                reportedReadyModels.current.add(id);
              }
            }
          });
      
          // Check if still training
          const stillTraining = modelMap.some(
            (m) => m.status === "generating" || (m.status === "ready" && !m.model_image)
          );
      
          if (!stillTraining) {
            setIsLoraTraining(false);
            clearInterval(interval);
          }
        }, 10000);
      
        return () => clearInterval(interval);
    }, [isLoraTraining, modelMap, updateModelMap, session?.user?.id]);

    const handleReset = () => {
        resetToDefault();

        // Highlight reset button for 0.2 seconds
        setResetHighlight(true);
        setTimeout(() => setResetHighlight(false), 200);
    };

    const handleGenerate = async (
        event: React.MouseEvent<HTMLButtonElement> | { preventDefault(): void },
        forcedIndex?: number // 🆕
      ) => {
        event.preventDefault();
        if (!generationAllowed) return;
        setGenerationAllowed(false);
      
        if (!session?.user?.id) {
            return;
        };

        if (session?.user?.subscription === "Free") {
            togglePricingModal();
            setGenerationAllowed(true);
            return;
        }

        if (session?.user?.credits === 0) {
            // checkFeedbackModalOpenCase();
            toast.error('You do not have enough tokens to generate these images.', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
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
        //         autoClose: 3000,
        //         hideProgressBar: false,
        //         closeOnClick: true,
        //         pauseOnHover: false,
        //         draggable: true,
        //         progress: undefined,
        //         theme: "dark",
        //     });
        //     setGenerationAllowed(true);
        //     return;
        // }
        
      
        const userModels = modelMap;
        const selectedModel = userModels?.[selectedPhotoshootModelIndex];

        if (selectedModel?.status === 'generating') {
            toast.info('Please wait around 5 minutes for model to finish training.', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGenerationAllowed(true);
            return;
        }

        const actualIndex = typeof forcedIndex === 'number' ? forcedIndex : selectedTypeIndex;
        const selectedPhotoshootType = PhotoshootTypeData[selectedGenderFilter]?.[actualIndex ?? 0];
      
        const genderKey = selectedGenderFilter.toLowerCase() as 'female' | 'male';

        const useCustomPrompt = prompt && prompt.trim().length > 0;

        // console.log('useCustomPrompt', useCustomPrompt)
        
        if (!selectedModel) {
            toast.error('Please choose your model.', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGenerationAllowed(true);
            return;
        }

        if (!useCustomPrompt && (selectedTypeIndex === -1 || !selectedPhotoshootType)) {
            toast.error('Please select style or enter prompt.', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGenerationAllowed(true);
            return;
        }

        if (!useCustomPrompt && (!selectedModel || !selectedPhotoshootType)) {
            toast.error('Please select photoshoot style.', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setGenerationAllowed(true);
            return;
        }

        const promptsForGender = selectedPhotoshootType?.prompts?.[genderKey];

        const promptsToUse = useCustomPrompt ? [prompt.trim()] : promptsForGender || [];
        // console.log('promptsToUse', promptsToUse);
        const totalImages = useCustomPrompt ? 1 : promptsToUse.length * 2;

        const tokensPerImage = 1;
        const totalCost = tokensPerImage * totalImages;

        if ((session?.user?.credits ?? 0) < totalCost) {
            toast.error('You do not have enough tokens to generate these images.', {
                position: "top-right",
                autoClose: 3000,
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
            // 🔁 Loop through each prompt
            for (const promptToUse of promptsToUse) {

                // console.log('prompt of promptsToUse', promptToUse);

                const loops = useCustomPrompt ? 1 : 2;
                // console.log('loops', loops);

                for (let i = 0; i < loops; i++) {
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
    
                        // Step 1: Create image doc
                        const createImageRes = await fetch("/api/image/add", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                            userId: session.user.id,
                            type_gen: "txt2img",
                            prompt: promptToUse,
                            model: 'realism',
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
                            neg_prompt,
                            loras,
                            cost: 1,
                            style: useCustomPrompt ? 'None' : selectedPhotoshootType.type,
                            tool: "Photoshoot",
                            pipeline: "Photoshoot",
                            favorite: false,
                            user_shared_settings: false,
                            }),
                        });
                
                        const createData = await createImageRes.json();
                        // console.log('createData', createData);

                        const id_gen = createData.imageId;
                        imageId = createData.imageId;

                        const genderToSend =
                            useCustomPrompt && selectedModel?.gender
                                ? selectedModel.gender
                                : selectedGenderFilter === 'Male'
                                ? 'man'
                                : 'woman';
                
                        // Step 2: Trigger LoRA generation
                        const formData = new FormData();
                        formData.append("userId", session.user.id);
                        formData.append("id_gen", id_gen);
                        formData.append("name_lora", selectedModel.name_lora);
                        formData.append("prompt", promptToUse);
                        formData.append("resolution", size);
                        formData.append("gender", genderToSend);

                        // console.log('formData', formData);
                
                        const generateRes = await fetch("/api/gen/image/lora/gen", {
                            method: "POST",
                            body: formData,
                        });
                
                        if (!generateRes.ok) {
                            const errText = await generateRes.text();
                            throw new Error(errText);
                        }
                
                        const result = await generateRes.json();
                        // console.log('result', result);
                        // console.log(`✅ Generated for prompt: "${promptToUse}" (run ${i + 1}/2):`, result);
                    } catch (error) {
                        // console.log('error', error);
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
                    }
                }
            }
        
            toast.success(`Your image${useCustomPrompt ? "" : "s"} will be generated soon!`);
            eventBus.dispatchEvent(new Event("generation-start"));
        
        } catch (err) {
        console.error("❌ LoRA Generation failed:", err);
        toast.error(`Generation failed: ${(err as Error).message}`);
        setGenerationAllowed(true);
        }
    };
    
    useEffect(() => {
        const fromCard = (e: Event) => {
            const customEvent = e as CustomEvent<{ index: number }>;
            const newIndex = customEvent.detail?.index;
            if (typeof newIndex === 'number') {
                setSelectedTypeIndex(newIndex); // optional: still useful for highlighting UI
                handleGenerate({ preventDefault() {} } as any, newIndex);
            }
        };        
    
        eventBus.addEventListener('photoshoot-card-generate', fromCard);
        return () => eventBus.removeEventListener('photoshoot-card-generate', fromCard);
    }, [handleGenerate]);

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
            // console.log("🚀 Heard 'generation-start' event, unblocking generation");
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

    const handleMenuClick = (index: number) => {
        setActiveIndex(index);
    
        const paths = [
            "/studio/generator",
            "/studio/canvas",
            "/studio/upscale",
            "/studio/video",
        ];
    
        const path = paths[index];
        if (path) {
            resetToDefault();
            router.push(path);
        }
    };

    // Function to navigate back to `/studio`
    const navigateToCreation = () => {
        router.push("/");
    };

    const models = modelMap;
    const hasTrainingModel = models.some(
        model =>
          model.status === "generating" ||
          (model.status === "ready" && !model.model_image)
      );

    return (
        <div className={`${openedFromController ? styles.controls_menu_inner_mobile : styles.controls_menu_inner}`}>
            <div className={styles.generator_controls_wrapper}>

                <div className={styles.generator_controls_header}>
                    <span className={styles.controls_return_text}>AI Photoshoot</span>
                </div>

                <div className={styles.generator_controls_inner_wrapper}>

                    {session?.user?.subscription === 'Free' && (
                        <UpgradeBanner />
                    )}

                    <PhotoshootModelSelector />

                    {openedFromController && (
                        <div className={styles.selected_style_mobile}>
                            <label className={styles.style_controls_label} htmlFor="style">
                                Your selection style
                            </label>
                            <div className={styles.selected_style_container}>
                                {selectedTypeIndex >= 0 ? (
                                    // When style is selected
                                    <>
                                        <div className={styles.selected_style_content}>
                                            <div className={styles.selected_style_image_container}>
                                                <Image 
                                                    src={PhotoshootTypeData[selectedGenderFilter][selectedTypeIndex].mainImage}
                                                    alt={PhotoshootTypeData[selectedGenderFilter][selectedTypeIndex].type}
                                                    className={styles.selected_style_image}
                                                    width={69}
                                                    height={90}
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            </div>
                                            <div className={styles.selected_style_name}>
                                                {PhotoshootTypeData[selectedGenderFilter][selectedTypeIndex].type}
                                            </div>
                                        </div>
                                        <div 
                                            className={styles.delete_icon_container}
                                            onClick={() => setSelectedTypeIndex(-1)}
                                        >
                                            <DeleteIcon className={styles.delete_icon} />
                                        </div>
                                    </>
                                ) : (
                                    // When no style is selected
                                    <>
                                        <div 
                                            className={styles.selected_style_content}
                                            onClick={onStyleSelect}
                                        >
                                            <div className={styles.selected_style_placeholder}>
                                                <Image 
                                                    src="/assets/images/pixelated-model.png"
                                                    alt="Select style"
                                                    className={styles.placeholder_image}
                                                    width={69}
                                                    height={90}
                                                    style={{ objectFit: 'cover' }}
                                                />
                                                <div className={styles.placeholder_overlay}></div>
                                            </div>
                                            <div className={styles.select_style_text}>
                                                Select your style
                                            </div>
                                        </div>
                                        <div 
                                            className={styles.right_arrow_container}
                                            onClick={onStyleSelect}
                                        >
                                            <RightArrow className={styles.right_arrow} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {(isLoraTraining || hasTrainingModel) && (
                        <div className={styles.lora_loader_wrapper}>
                            <span className={styles.lora_loader_text}>
                                Training will be ready within 15 minutes and then added to your model
                            </span>
                            <div className={styles.spinner_loader_wrapper}>
                                <Loader className={styles.lora_loader} />
                            </div>
                        </div>
                    )}

                    <PhotoshootPromptInput
                        value={prompt}
                        onChange={setPrompt}
                        color="var(--text-color-gray)"
                    />

                    <SizeOptions />

                    <div className={styles.content_spacer}></div>

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
                </div>
                
                <div className={styles.controls_generation_actions_wrapper}>
                    <small className={styles.controls_gemeration_small_text}>
                        You need 2 credits for this generation.
                    </small>
                    <div className={styles.controls_generation_actions}>
                        <button
                            disabled={!generationAllowed}
                            className={`${styles.controls_generation_button} ${!generationAllowed ? styles.controls_generation_button_disabled : ''}`}
                            onClick={e => {
                                if (session?.user?.id) {
                                    trackGtmEvent("Generate_shoot", {
                                        ecommerce: { usid: session.user.id }
                                    });
                                    // console.log('Generate_shoot gtm sent');
                                    handleGenerate(e);

                                    if (openedFromController && onGenerate) {
                                        onGenerate();
                                    }
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
                </div>
                
                <LoginModal isOpen={isLoginModalOpen} onClose={toggleLoginModal} order='default'/>
                <SubscriptionPopup isOpen={isPricingModalOpen} onClose={togglePricingModal} />

            </div>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
};

'use client';

import React, { useState, useRef, useEffect } from "react";

import Image from 'next/image';

import styles from './NewModelModal.module.css';

import ArrowIcon from "@/public/assets/icons/arrow-down.svg";
import CloseIcon from '@/public/images/icons/controller/close-icon.svg';
import ModelUploadIcon from '@/public/assets/icons/upload-model-base.svg';
import DeleteIcon from "@/public/images/icons/controller/delete-icon.svg";

import { eventBus } from "@/app/lib/event/eventBus";

import { signIn, signOut, useSession } from "next-auth/react";

import { useControlMenuContext } from "@/app/context/ControlMenuContext";

import { trackGtmEvent } from "@/app/lib/analytics/google/trackGtmEvent";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    gender: 'Male' | 'Female';
    setGender: (value: 'Male' | 'Female') => void;
}

export default function NewModelModal({ isOpen, onClose, gender, setGender }: Props) {
    const { data: session, status, update } = useSession();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [page, setPage] = useState<1 | 2>(1);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { userModelTrainImages, setUserModelTrainImages, isTrainingLoading, setIsTrainingLoading } = useControlMenuContext();

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const fileUrls = files.map(file => URL.createObjectURL(file));
        setUserModelTrainImages((prev: string[]) => [...prev, ...fileUrls].slice(0, 10));
      };
      
      const removeImage = (indexToRemove: number) => {
        setUserModelTrainImages((prev: string[]) => prev.filter((_, i: number) => i !== indexToRemove));
      };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const basePath = `/assets/images/models/modal/${gender.toLowerCase()}`;

    const modalRef = useRef<HTMLDivElement>(null);
    
    const handleClose = () => {
        setPage(1);                          
        setName('');                         
        setAge('');                          
        setUserModelTrainImages([]);         
        onClose();                           
    };

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                handleClose();
            }
        };
    
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const refreshUserSession = async () => {
        if (!session?.user?.id) return;
      
        try {
          const response = await fetch(`/api/user/${session.user.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
      
          const data = await response.json();
          if (response.ok) {
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
                registrationGtmSent: data.user.registrationGtmSent,
                modelMap: data.user.modelMap,
              },
            });
          } else {
            console.error("❌ Failed to refresh session:", data.message);
          }
        } catch (err) {
          console.error("❌ Error refreshing session:", err);
        }
    };

    const handleTrainModel = async () => {
        if (userModelTrainImages.length !== 10 || !name || !age || !session?.user?.id) {
            toast.error('Please fill all fields and upload exactly 10 images.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            return;
          }

          const checkResp = await fetch(
            `/api/model/allow?userId=${encodeURIComponent(session.user.id)}`,   // GET!
            { cache: 'no-store' }                                               // avoid stale result
          );
          
          const check = await checkResp.json();
        
          if (!check.allowed) {
            toast.error('Please consider upgrading plan to generate more AI Profiles', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            return;                                  //  <-- stop right here
          }

        try {

        //   setIsTrainingLoading(true);
        eventBus.dispatchEvent(new Event("generation-lora-start"));
        handleClose();
      
            const { ObjectId } = await import('bson');
            const id_gen = new ObjectId().toHexString();
            const base = name.toLowerCase().replace(/\s+/g, "-");
            const name_lora = `${base}_${id_gen}`;
      
            const genderLabel = gender === 'Male' ? 'man' : 'woman';

          // Step 1: Save model metadata in user DB
          await fetch("/api/user/lora/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session.user.id,
              id_gen,
              name_lora,
              name,
              age,
              gender: genderLabel,
            }),
          });
      
          // Step 2: Prepare image FormData for training
          const formData = new FormData();
          formData.append("userId", session.user.id);
          formData.append("id_gen", id_gen);
          formData.append("name_lora", name_lora);
          formData.append("name", name);
          formData.append("age", age);
          formData.append("gender", genderLabel);
      
          const files = await Promise.all(
            userModelTrainImages.map(async (url, i) => {
              const blob = await fetch(url).then(res => res.blob());
              return new File([blob], `image_${i}.png`, { type: blob.type });
            })
          );
          files.forEach((file) => formData.append("images", file));
      
          // Step 3: Send to training backend
          const res = await fetch("/api/lora/train", {
            method: "POST",
            body: formData,
          });
      
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Training failed");
      
          console.log("Training triggered:", json);
          
          await refreshUserSession();

        } catch (err) {
            console.error("❌ Training error:", err);
            toast.error(`Model training failed: ${(err as Error).message}`);
        } finally {
        //   setIsTrainingLoading(false);
        }
      };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} ref={modalRef}>

                <div className={styles.popover_content_header}>
                    <CloseIcon 
                        className={styles.header_close} 
                        onClick={handleClose}
                    />
                </div>
                
                {page === 1 && (
                    <div className={styles.firstPageModalContent}>
                        {/* Placeholder content */}
                        <div className={styles.modalHeader}>
                            <div className={styles.modalImages}>
                                <Image
                                    src={`${basePath}/modal_image_1.png`}
                                    alt="left"
                                    className={styles.leftImage}
                                    width={154}
                                    height={171}
                                />
                                <Image
                                    src={`${basePath}/modal_image_2.png`}
                                    alt="center"
                                    className={styles.centerImage}
                                    width={154}
                                    height={171}
                                />
                                <Image
                                    src={`${basePath}/modal_image_3.png`}
                                    alt="right"
                                    className={styles.rightImage}
                                    width={154}
                                    height={171}
                                />
                            </div>

                            <div className={styles.modalText}>
                                <div className={styles.title}>Create new model</div>
                                <div className={styles.subtitle}>New model - 50 generations</div>
                            </div>
                        </div>

                        <div className={styles.modalForm}>

                            <div className={styles.inputGroup} ref={dropdownRef}>
                                <label className={styles.inputLabel}>Gender</label>
                                <div className={styles.dropdownWrapper}>
                                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className={styles.trigger}>
                                        <span>{gender}</span>
                                        <ArrowIcon className={`${styles.arrow} ${dropdownOpen ? styles.arrowOpen : ''}`} />
                                    </button>

                                    {dropdownOpen && (
                                        <div className={styles.dropdown}>
                                        {['Male', 'Female'].map((option) => (
                                            <div
                                            key={option}
                                            onClick={() => {
                                                setGender(option as 'Male' | 'Female');
                                                setDropdownOpen(false);
                                            }}
                                            className={`${styles.option} ${option === gender ? styles.optionSelected : ''}`}
                                            >
                                            {option}
                                            </div>
                                        ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Your name</label>
                                <input
                                    className={styles.inputField}
                                    placeholder="Name your model"
                                    maxLength={10}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Age</label>
                                <input
                                    className={styles.inputField}
                                    type="number"
                                    placeholder="Age of model"
                                    value={age}
                                    onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*$/.test(value)) {
                                        setAge(value);
                                    }
                                    }}
                                />
                            </div>

                            <button 
                                className={styles.nextButton}
                                onClick={() => setPage(2)}
                            >
                                    Next
                            </button>
                        </div>
                    </div>
                )}

                {page === 2 && (
                    <div className={styles.secondPageModalContent}>

                        <div className={styles.second_page_header}>
                            <ModelUploadIcon className={styles.second_page_header_icon}/>
                            {!userModelTrainImages.length && (
                                <div className={styles.second_page_text}>
                                    Get the Best Results 
                                    <br />
                                    Upload 10 High-Quality Photos
                                </div>
                            )}
                        </div>

                        {userModelTrainImages.length > 0 ? (
                            <>
                                <div className={styles.imageCounter}>
                                    {userModelTrainImages.length}/<span className={styles.gradientText}>10</span>
                                </div>

                                <div className={styles.uploadedImagesList}>
                                    {userModelTrainImages.map((src, index) => (
                                    <div key={index} className={styles.uploadedImageRow}>
                                        <div className={styles.uploadedImagePreview}>
                                            <Image src={src} alt={`Uploaded ${index}`} width={40} height={40} />
                                        </div>
                                        <button
                                            className={styles.deleteButton}
                                            onClick={() => removeImage(index)}
                                        >
                                        <DeleteIcon className={styles.image_options_delete_button}  />
                                        </button>
                                    </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className={styles.photoExamplesSection}>
                                <div className={styles.photoBlock}>
                                    <div className={styles.photoBlockTitle}>✅ Good photos</div>
                                    <div className={styles.photoRow}>
                                        {['High resolution', 'No accessories', 'Neutral expression', 'One person'].map((label, index) => {
                                            const imgIndex = index + 1;

                                            return (
                                                <div className={styles.photoItem} key={imgIndex}>
                                                    <div className={styles.photoImageWrapper}>
                                                        <Image
                                                            src={`/assets/images/models/modal/${gender.toLowerCase()}/good/good_${imgIndex}.png`}
                                                            alt={label}
                                                            className={`${styles.photoImage}`}
                                                            width={136}
                                                            height={150}
                                                        />
                                                        <div className={styles.photoLabel}>{label}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={styles.photoBlock}>
                                    <div className={styles.photoBlockTitle}>❌ Avoid</div>
                                    <div className={styles.photoRow}>
                                        {['Low-quality images', 'Sunglasses, masks', 'Extreme facial', 'Group photos'].map((label, index) => {
                                            const imgIndex = index + 1;
                                            return (
                                                <div className={styles.photoItem} key={index}>
                                                    <div className={styles.photoImageWrapper}>
                                                        <Image
                                                            src={`/assets/images/models/modal/${gender.toLowerCase()}/avoid/avoid_${imgIndex}.png`}
                                                            alt={label}
                                                            className={`${styles.photoImage} ${imgIndex === 1 ? styles.blurred : ''}`}
                                                            width={136}
                                                            height={150}
                                                        />
                                                        <div className={styles.photoLabel}>{label}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className={styles.uploadButtonWrapper}>
                            {userModelTrainImages.length < 10 ? (
                                <>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        id="uploadInput"
                                        onChange={handleImageUpload}
                                    />
                                    <button
                                        className={styles.uploadButton}
                                        onClick={() => document.getElementById("uploadInput")?.click()}
                                    >
                                        Upload a photo for 50 generations
                                    </button>
                                    {/* <div className={styles.uploadHint}>Please upload 10 images for better model training</div> */}
                                </>
                            ) : (
                                <button
                                    className={styles.uploadButton}
                                    onClick={() => {
                                        if (session?.user) {
                                            trackGtmEvent("train_model", {
                                              ecommerce: { usid: session.user.id }
                                            });
                                            // console.log('train_model gtm sent');
                                        }
                                        handleTrainModel();
                                    }}
                                >
                                    Train model
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}
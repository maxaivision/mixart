'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tabs, Tab } from "@heroui/react";

import { useUserImages } from "@/app/context/UserImagesContext";
import { useControlMenuContext } from "@/app/context/ControlMenuContext";

// Components
import ModelCategorySelector from "../components/ModelCategorySelector/ModelCategorySelector";
import GenderFilterDropdown from "../components/GenderFilterDropdown/GenderFilterDropdown";
import PhotoshootCard from "../components/PhotoshootCard/PhotoshootCard";
import PhotoshootTypeData from "../lib/data/PhotoshootTypeData";
import SpinningLoader from "../components/SpinningLoader/SpinningLoader";
import ModelDetailsModal from "../components/ModelDetailsModal/ModelDetailsModal";
import GeneratedImage from "../components/GeneratedImage/GeneratedImage";
import ImageDetailsModal from "../components/ImageDetailsModal/ImageDetailsModal";
import Footer from "../components/Footer/Footer";
import PhotoshootControls from "../components/PhotoshootControls/PhotoshootControls";

import { deleteImageById } from "../lib/api/imageActions";

import { eventBus } from "../lib/event/eventBus";

import { signIn, signOut, useSession } from "next-auth/react";

import styles from "./page.module.css";

// Functions import
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

import { fetchUserImages, ImageMetadata } from "../lib/api/fetchUserImages";

// Import icons
import FilterIcon from "@/public/assets/icons/filter-icon.svg";
import ArrowIcon from "@/public/assets/icons/arrow-down-photoshoot.svg";
import Image from "next/image";

const NEXT_PUBLIC_USER_IMAGES_URL = process.env.NEXT_PUBLIC_USER_IMAGES_URL!;
const IMAGES_PER_PAGE = 20;

// Controller Arrow Button Component
const ControllerArrowButton = ({ isOpen }: { isOpen: boolean }) => {
    return (
        <div className={`${styles.controller_arrow} ${isOpen ? styles.controller_arrow_open : ''}`}>
            <Image 
                src="/assets/icons/controller-icon-arrow.svg" 
                alt="Controller toggle"
                width={24}
                height={24}
            />
        </div>
    );
};

export default function Photoshoot() {

    const { data: session } = useSession();
    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 1000;

    // Add state for controller panel
    const [isControllerOpen, setIsControllerOpen] = useState(false);
    const [isPanelClosing, setIsPanelClosing] = useState(false);
    const toggleController = () => {
        if (isControllerOpen) {
            // Start closing animation
            setIsPanelClosing(true);
            // Panel will be closed after animation completes
        } else {
            setIsControllerOpen(true);
        }
    };

    useEffect(() => {
        if (isControllerOpen) {
            // Lock scrolling on body when panel is open
            document.body.style.overflow = 'hidden';
        } else {
            // Re-enable scrolling when panel is closed
            document.body.style.overflow = '';
        }
        
        return () => {
            // Cleanup - ensure scrolling is re-enabled when component unmounts
            document.body.style.overflow = '';
        };
    }, [isControllerOpen]);

    const categories = [
        'All', 
        'Popular & Trending', 
        'Business & Professional Style', 
        'Romantic & Wedding',
        'Fashion & Editorial',
        'Nature & Outdoor',
        'Black & White Photography',
        'Creative & Fantasy',
        'Sport & Active Lifestyle',
        'Career & Professions',
        'Hairstyle & Beauty'
    ];

    const [selectedCategory, setSelectedCategory] = useState('All');
    
    const { 
        prompt,
        setPrompt,
        selectedGenderFilter, 
        setSelectedGenderFilter, 
        isTrainingLoading, 
        setIsTrainingLoading, 
        selectedTypeIndex, 
        setSelectedTypeIndex, 
    } = useControlMenuContext();
        
    const [activeTab, setActiveTab] = useState<'AI Photoshoot' | 'My Photoshoot'>('AI Photoshoot');
    const [shouldRefetch, setShouldRefetch] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedMainImage, setSelectedMainImage] = useState<string | null>(null);
    const [selectedAdditionalImages, setSelectedAdditionalImages] = useState<string[]>([]);

    const handleDetailsClick = (type: string) => {
        const selectedModel = PhotoshootTypeData[selectedGenderFilter].find(item => item.type === type);
        if (!selectedModel) return;
      
        setSelectedType(selectedModel.type);
        setSelectedMainImage(selectedModel.mainImage);
        setSelectedAdditionalImages(selectedModel.additionalImages);
        setIsModalOpen(true);
    };

    // Filter cards by selected category
    const filteredPhotoshoots = PhotoshootTypeData[selectedGenderFilter].filter(
        (item) => selectedCategory === 'All' || item.category.some(category => category.toLowerCase().includes(selectedCategory.toLowerCase()))
    );

    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (value: "Male" | "Female") => {
        setSelectedGenderFilter(value);
        setIsOpen(false);

    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const masonryRef = useRef<HTMLDivElement>(null);
    const lastImageRef = useRef<HTMLDivElement | null>(null);
    const [columns, setColumns] = useState<ImageMetadata[][]>([]);
    const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);

    const {
        images,
        setImages,
        fetchMoreImages,
        refetchImages,
        loading,
        hasMore,
        resetImages,
      } = useUserImages();

    const getNumberOfColumns = () => {
        if (window.innerWidth < 768) return 1;
        if (window.innerWidth >= 1600) return 5;
        return 3;
    };
      
    const createColumns = (images: ImageMetadata[], numCols: number): ImageMetadata[][] => {
        const cols = Array.from({ length: numCols }, () => [] as ImageMetadata[]);
        images.forEach((img, i) => {
            cols[i % numCols].push(img);
        });
        return cols;
    };
      
    const updateLayout = (images: ImageMetadata[]) => {
        const numCols = getNumberOfColumns();
        setColumns(createColumns(images, numCols));
    };

    // listen for image generation start event from studio control menu and start image refetching 
    const onGenerationStart = useCallback(async () => {
        if (!session?.user?.id) return;

        setActiveTab("My Photoshoot");

        // immediate first fetch
        const freshly = await refetchImages();
        updateLayout(freshly);

        setShouldRefetch(true); // start 10-s polling loop
    }, [session?.user?.id, activeTab, refetchImages]);

    useEffect(() => {
        eventBus.addEventListener('generation-start', onGenerationStart);
        return () => eventBus.removeEventListener('generation-start', onGenerationStart);
    }, [onGenerationStart]);
      
    useEffect(() => {
        if (!shouldRefetch) return;
      
        const interval = setInterval(async () => {
            const fetched = await refetchImages();
            updateLayout(fetched);
            const stillGenerating = fetched.some(img => img.status === 'generating');
      
          if (!stillGenerating) {
            clearInterval(interval);
            setShouldRefetch(false);
            eventBus.dispatchEvent(new Event("generation-finish"));
          }
        }, 10000);
      
        return () => clearInterval(interval);
    }, [shouldRefetch]);
      
    useEffect(() => {
        const handleResize = () => updateLayout(images);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [images]);
      
    useEffect(() => {
        if (!lastImageRef.current || activeTab !== 'My Photoshoot') return;
      
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            fetchMoreImages();
          }
        }, { threshold: 0.5 });
      
        observer.observe(lastImageRef.current);
        return () => observer.disconnect();
    }, [columns, loading, hasMore, fetchMoreImages, activeTab]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchMoreImages().then(() => {
                updateLayout(images);
            });
        }
    }, [session?.user?.id]);

    useEffect(() => {
        if (images.length > 0) {
          updateLayout(images);
        }
    }, [images]);

    const handleDeleteImage = async (imageId: string) => {
        await deleteImageById(imageId, setImages);
        refetchImages();
    };

    useEffect(() => {
        if (prompt && prompt.trim().length > 0) {
            setSelectedTypeIndex(-1);
        }
    }, [prompt]);
    
    const sendGenerateFromCard = (index: number) => {
        // pick / highlight the style the user clicked
        setPrompt('');
        setSelectedTypeIndex(index);
        // notify PhotoshootControls
        eventBus.dispatchEvent(new CustomEvent('photoshoot-card-generate', {
            detail: { index }
        }));
    };

    // Add this effect to handle animation end
    useEffect(() => {
        const handleAnimationEnd = () => {
            if (isPanelClosing) {
                setIsControllerOpen(false);
                setIsPanelClosing(false);
            }
        };

        const panel = document.querySelector(`.${styles.controller_panel}`);
        if (panel) {
            panel.addEventListener('animationend', handleAnimationEnd);
        }
        
        return () => {
            if (panel) {
                panel.removeEventListener('animationend', handleAnimationEnd);
            }
        };
    }, [isPanelClosing]);

    const handleStyleSelectFromController = () => {
        // Start closing animation for the panel
        setIsPanelClosing(true);
        
        // Switch to AI Photoshoot tab
        setActiveTab('AI Photoshoot');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGenerateFromController = () => {
        // Start closing animation for the panel
        setIsPanelClosing(true);
        
        // Switch to My Photoshoot tab
        setActiveTab('My Photoshoot');
    };

    return (
        <div className={styles.page_wrapper}>
            <div className={styles.page_working_area}>
                {!isMobile && (
                    <div className={styles.controls__outer}>
                        <PhotoshootControls openedFromController={false} />
                    </div>
                )}
                
                <div className={styles.creation_page_content}>
                    <div className={styles.generator_page_wrapper}>
                        <div className={styles.model_tab_selector}>
                            <button
                                className={`${styles.model_tab} ${activeTab === 'AI Photoshoot' ? styles.active_tab : ''}`}
                                onClick={() => setActiveTab('AI Photoshoot')}
                            >
                                AI Photoshoot
                            </button>
                            <button
                                className={`${styles.model_tab} ${activeTab === 'My Photoshoot' ? styles.active_tab : ''}`}
                                onClick={() => setActiveTab('My Photoshoot')}
                            >
                                My Photoshoot
                            </button>
                        </div>

                        <div className={styles.models_page_inner_wrapper} style={{ display: activeTab === 'AI Photoshoot' ? '' : 'none' }}>
                            {!isMobile && (
                                <div className={styles.photoshoot_header_wrapper_dsk}>
                                    <div className={styles.photoshoot_header}>
                                        Select your style
                                    </div>

                                    <GenderFilterDropdown
                                        selectedGender={selectedGenderFilter}
                                        setSelectedGender={setSelectedGenderFilter}
                                    />
                                </div>
                            )}

                            {!isMobile ? (
                                <div className={styles.model_category_wrapper_combined}>

                                    <ModelCategorySelector
                                        categories={categories}
                                        selectedCategory={selectedCategory}
                                        onSelect={setSelectedCategory}
                                    />

                                </div>
                            ) : (
                                <div className={styles.model_category_wrapper_combined}>
                                    <ModelCategorySelector
                                        categories={categories}
                                        selectedCategory={selectedCategory}
                                        onSelect={setSelectedCategory}
                                    />

                                    <div className={styles.photoshoot_header_wrapper}>
                                        <div className={styles.photoshoot_header}>
                                            Select your style
                                        </div>

                                        <GenderFilterDropdown
                                            selectedGender={selectedGenderFilter}
                                            setSelectedGender={setSelectedGenderFilter}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className={styles.photoshoot_grid_wrapper}>
                                <div className={styles.photoshoot_grid}>
                                    {filteredPhotoshoots.map((item, index) => (
                                        <PhotoshootCard
                                            key={index}
                                            type={item.type}
                                            imageSrc={item.mainImage}
                                            isSelected={selectedTypeIndex === index}
                                            onClick={() => {
                                                setPrompt('');
                                                if (selectedTypeIndex === index) {
                                                setSelectedTypeIndex(-1);
                                                } else {
                                                setSelectedTypeIndex(index);
                                                }
                                            }}
                                            onDetailsClick={() => handleDetailsClick(item.type)}
                                            onGenerate={() => sendGenerateFromCard(index)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div 
                            className={styles.masonry_scroll_wrapper}
                            style={{ display: activeTab === 'My Photoshoot' ? '' : 'none' }}
                        >
                            <div className={styles.masonry} ref={masonryRef}>
                                {columns.map((col, colIndex) => (
                                    <div key={colIndex} className={styles.column}>
                                        {col.map((image, idx) => {
                                            const isLast = images.indexOf(image) === images.length - 1;
                                            return (
                                                <GeneratedImage
                                                    key={image._id}
                                                    ref={isLast ? lastImageRef : null}
                                                    src={`${NEXT_PUBLIC_USER_IMAGES_URL}${image.res_image}`}
                                                    status={image.status}
                                                    isFavorite={false}
                                                    onToggleFavorite={() => console.log('Favorite', image._id)}
                                                    onDelete={() => handleDeleteImage(image._id)}
                                                    onGenerateSimilar={() => console.log('Similar', image._id)}
                                                    onReuse={() => console.log('Reuse', image._id)}
                                                    onReusePrompt={() => console.log('Prompt', image._id)}
                                                    onClickDetails={() => setSelectedImage(image)}
                                                    downloadName={`${image._id}.png`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedType && selectedMainImage && (
                            <ModelDetailsModal
                                isOpen={isModalOpen}
                                onClose={() => setIsModalOpen(false)}
                                type={selectedType}
                                gender={selectedGenderFilter}
                                mainImage={selectedMainImage}
                                additionalImages={selectedAdditionalImages}
                            />
                        )}

                        <ImageDetailsModal
                            isOpen={!!selectedImage}
                            image={selectedImage}
                            onClose={() => setSelectedImage(null)}
                        />
                    </div>
                </div>
            </div>
            
            {/* Controller Button & Panel - Only visible on mobile */}
            {isMobile && (
                <div className={styles.controller_wrapper}>
                    <div 
                        className={styles.controller_button}
                        onClick={toggleController}
                        style={{ display: isControllerOpen ? 'none' : 'flex' }}
                    >
                        <ControllerArrowButton isOpen={false} />
                    </div>

                    {(isControllerOpen || isPanelClosing) && (
                        <div className={`${styles.controller_panel} ${isPanelClosing ? styles.panel_closing : ''}`}>
                            <div 
                                className={styles.controller_button_top}
                                onClick={toggleController}
                            >
                                <ControllerArrowButton isOpen={true} />
                            </div>
                            <div className={styles.controls__outer}>
                                <PhotoshootControls 
                                    openedFromController={true} 
                                    onStyleSelect={handleStyleSelectFromController}
                                    onGenerate={handleGenerateFromController}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <Footer />
        </div>
    );
}
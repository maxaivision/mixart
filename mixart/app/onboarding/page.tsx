'use client';

import React, {
      useState,
      useRef,
      useEffect,
      useLayoutEffect,
      useCallback,
    } from "react";

import { useSession } from "next-auth/react";

import styles from './page.module.css';

import Image from 'next/image';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { useControlMenuContext } from "@/app/context/ControlMenuContext";

import ArrowIcon from "@/public/assets/icons/arrow-down.svg";

// Functions import
import { useWindowSize } from "@/app/lib/hooks/useWindowSize";

import ModelCategorySelector from "../components/ModelCategorySelector/ModelCategorySelector";
import GenderFilterDropdown from "../components/GenderFilterDropdown/GenderFilterDropdown";
import PhotoshootCard from "../components/PhotoshootCard/PhotoshootCard";
import ModelDetailsModal from "../components/ModelDetailsModal/ModelDetailsModal";
import SpinningLoader from "../components/SpinningLoader/SpinningLoader";

import ModelUploadIcon from '@/public/assets/icons/upload-model-base.svg';
import DeleteIcon from "@/public/images/icons/controller/delete-icon.svg";
import UploadPhotoIcon from "@/public/assets/icons/upload-photo-icon.svg";

import PhotoshootTypeData from "../lib/data/PhotoshootTypeData";

import { trackGtmEvent } from "../lib/analytics/google/trackGtmEvent";
import LoginModal from "../components/LoginModal/LoginModal";

// New simplified ImageSlider without vertical line and labels
interface ImageSliderProps {
  image: string;
  containerWidth?: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({ 
  image, 
  containerWidth = '100%'
}) => {
  return (
    <div 
      className={styles.sliderContainer}
      style={{ 
        '--container-width': containerWidth,
      } as React.CSSProperties}
    >
      {/* Full width image without slider */}
      <div className={styles.baseImage}>
        <Image 
          src={image} 
          alt="AI Generated Image" 
          fill 
          style={{ 
            objectFit: 'contain',
          }} 
          priority
        />
      </div>
    </div>
  );
};

export default function OnboardingPage() {

    const { data: session } = useSession();

    const searchParams = useSearchParams();
    const router       = useRouter();
    const pathname     = usePathname(); 

    const stepFromUrl  = Number(searchParams.get('step') ?? 1);

    const hasTrackedStep = useRef<{ [step: number]: boolean }>({});
    const pageWrapperRef = useRef<HTMLDivElement>(null);

    // Get window size using custom hook
    const windowSize = useWindowSize();
    const isMobile = windowSize.width <= 768;

    // Track whether login component should be opened
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);

    const toggleLoginModal = () => {
		setLoginModalOpen(!isLoginModalOpen);
	};
    
    const { selectedGenderFilter, setSelectedGenderFilter, userModelTrainImages, setUserModelTrainImages, isTrainingLoading, setIsTrainingLoading } = useControlMenuContext();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [step, setStep] = useState(stepFromUrl);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const uploadInputRef = useRef<HTMLInputElement>(null);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const basePath = `/assets/images/models/modal/female`;

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
    const [selectedTypeIndex, setSelectedTypeIndex] = useState<number | null>(0);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedMainImage, setSelectedMainImage] = useState<string | null>(null);
    const [selectedAdditionalImages, setSelectedAdditionalImages] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // New images from scroll_1.png to scroll_8.png
    const scrollImages = [
        "/assets/images/onboarding/scroll_1.png",
        "/assets/images/onboarding/scroll_2.png",
        "/assets/images/onboarding/scroll_3.png",
        "/assets/images/onboarding/scroll_4.png",
        "/assets/images/onboarding/scroll_5.png",
        "/assets/images/onboarding/scroll_6.png",
        "/assets/images/onboarding/scroll_7.png",
        "/assets/images/onboarding/scroll_8.png"
    ];

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const fileUrls = files.map(file => URL.createObjectURL(file));
        setUserModelTrainImages((prev: string[]) => [...prev, ...fileUrls].slice(0, 1));
    };

    // Filter cards by selected category
    const filteredPhotoshoots = PhotoshootTypeData[selectedGenderFilter].filter(
        (item) => selectedCategory === 'All' || item.category.some(category => category.toLowerCase().includes(selectedCategory.toLowerCase()))
    )
    .slice(0, 12);

    const handleDetailsClick = (type: string) => {
        const selectedModel = PhotoshootTypeData[selectedGenderFilter].find(item => item.type === type);
        if (!selectedModel) return;
      
        setSelectedType(selectedModel.type);
        setSelectedMainImage(selectedModel.mainImage);
        setSelectedAdditionalImages(selectedModel.additionalImages);
        setIsModalOpen(true);
    };

    const removeImage = (indexToRemove: number) => {
        setUserModelTrainImages((prev: string[]) => prev.filter((_, i: number) => i !== indexToRemove));
    };

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('step', String(step));
      
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }, [step, pathname, router, searchParams]);

    useEffect(() => {
        if (session?.user && !hasTrackedStep.current[1]) {
          trackGtmEvent("welcome_p1", {
            ecommerce: { usid: session.user.id }
          });
          hasTrackedStep.current[1] = true;
        //   console.log('welcome_p1 gtm sent');
        }
    }, [session]);

    useEffect(() => {
        if (!session?.user) return;
      
        const eventMap: Record<number, string> = {
          2: "welcome_p2",
          3: "welcome_p3",
          4: "welcome_p4",
        };
      
        const eventName = eventMap[step];
        if (eventName && !hasTrackedStep.current[step]) {
          trackGtmEvent(eventName, {
            ecommerce: { usid: session.user.id }
          });
          hasTrackedStep.current[step] = true;
        //   console.log(`welcome_p${step} gtm sent`);
        }
    }, [step, session]);

    useLayoutEffect(() => {
        if (pageWrapperRef.current) {
            pageWrapperRef.current.scrollTop = 0;
        }
        
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        }
    }, [step]);

    // Mobile slider states
    const mobileSliderRef = useRef<HTMLDivElement>(null);
    const [mobileActiveSlideIndex, setMobileActiveSlideIndex] = useState(0);

    // Desktop slider states
    const desktopSliderRef = useRef<HTMLDivElement>(null);
    const [desktopActiveSlideIndex, setDesktopActiveSlideIndex] = useState(3);

    // Scroll to slide for mobile
    const scrollToMobileSlide = useCallback((index: number) => {
      const container = mobileSliderRef.current;
      if (!container) return;

      const card = container.querySelector<HTMLElement>(`.${styles.sliderItem}`);
      if (!card) return;

      const cardWidth = card.offsetWidth;
      const gap = parseFloat(getComputedStyle(container).columnGap || '0');
      container.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
    }, []);

    // Scroll to slide for desktop
    const scrollToDesktopSlide = useCallback((index: number) => {
      const container = desktopSliderRef.current;
      if (!container) return;

      const slides = container.querySelectorAll<HTMLElement>(`.${styles.desktopSliderItem}`);
      if (slides.length <= index) return;
      
      const slide = slides[index];
      if (!slide) return;
      
      // Calculate the scroll position to center the target slide
      const containerWidth = container.clientWidth;
      const slideRect = slide.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Determine how far to scroll so the target slide is centered
      const targetScrollLeft = slide.offsetLeft - (containerWidth / 2) + (slideRect.width / 2);
      
      // Scroll to position
      container.scrollTo({ 
        left: targetScrollLeft, 
        behavior: 'smooth' 
      });
      
      setDesktopActiveSlideIndex(index);
    }, []);

    // Handle scroll for mobile
    const handleMobileScroll = () => {
      const container = mobileSliderRef.current;
      if (!container) return;
      const card = container.querySelector<HTMLElement>(`.${styles.sliderItem}`);
      if (!card) return;

      const cardWidth = card.offsetWidth;
      const gap = parseFloat(getComputedStyle(container).columnGap || '0');
      const index = Math.round(container.scrollLeft / (cardWidth + gap));
      if (index !== mobileActiveSlideIndex) setMobileActiveSlideIndex(index);
    };

    // Add these at the top of your component
    const scrollTimeoutRef = useRef<number | null>(null);
    const isScrollingRef = useRef(false);

    // Optimized scroll handler
    const handleDesktopScroll = () => {
      // Skip if we're already processing a scroll event
      if (isScrollingRef.current) return;
      
      isScrollingRef.current = true;
      
      // Use requestAnimationFrame for smoother visual updates
      requestAnimationFrame(() => {
        const container = desktopSliderRef.current;
        if (!container) {
          isScrollingRef.current = false;
          return;
        }
        
        // Find the slide closest to the center
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        
        let closestSlide = 0;
        let minDistance = Infinity;
        
        const slides = container.querySelectorAll(`.${styles.desktopSliderItem}`);
        slides.forEach((slide, index) => {
          const slideRect = slide.getBoundingClientRect();
          const slideCenter = slideRect.left + slideRect.width / 2;
          const distance = Math.abs(containerCenter - slideCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestSlide = index;
          }
        });
        
        if (closestSlide !== desktopActiveSlideIndex) {
          setDesktopActiveSlideIndex(closestSlide);
        }
        
        // Throttle to prevent too many updates
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
        }, 50) as unknown as number;
      });
    };

    // Initialize with the correct slide
    useEffect(() => {
      if (!isMobile && desktopSliderRef.current) {
        // Set initial index
        setDesktopActiveSlideIndex(3);
        
        // Need a short delay to ensure the DOM is ready
        requestAnimationFrame(() => {
          // Use a smooth scroll to the desired slide
          const container = desktopSliderRef.current;
          if (!container) return;
          
          const slides = container.querySelectorAll(`.${styles.desktopSliderItem}`);
          if (slides.length <= 3) return;
          
          const targetSlide = slides[3] as HTMLElement;
          if (!targetSlide) return;
          
          const containerWidth = container.clientWidth;
          const slideOffsetLeft = targetSlide.offsetLeft;
          const slideWidth = targetSlide.offsetWidth;
          
          // Calculate position to center the slide
          const scrollPosition = slideOffsetLeft - (containerWidth / 2) + (slideWidth / 2);
          
          // Use scrollTo with smooth behavior
          container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        });
      }
    }, [isMobile]);

    // File selection handler
    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedImage(URL.createObjectURL(file));

        setTimeout(() => {
            toggleLoginModal();                         // <-- open the modal
        }, 1_000);
    };

    // Helper to open file dialog
    const openFileDialog = () => uploadInputRef.current?.click();

    // Calculate the number of slides for dots
    const desktopSlideCount = Math.max(0, scrollImages.length - 2); // 3 visible items, so total - 2 sliding positions
    
    return (
        <div ref={pageWrapperRef} className={styles.onboarding_page_wrapper}>
            {step === 1 && (
                <div className={styles.onboardingContentStepOne}>
                    <div className={styles.onboardingTopContentWrapper}>
                        <div className={styles.headerWrapper}>
                            <h1 className={styles.heroText}>
                                AI Photos from <span className={styles.highlightText}>Your selfies</span>
                            </h1>
                        
                            <p className={styles.subText}>
                                These portraits were made with real uploads
                            </p>
                        </div>

                        {/* Mobile version with horizontal scroll */}
                        {isMobile ? (
                            <div className={styles.sliderSection}>
                                {/* SLIDER TRACK */}
                                <div
                                    className={styles.sliderContainer}
                                    ref={mobileSliderRef}
                                    onScroll={handleMobileScroll}
                                >
                                    {scrollImages.map((image, i) => (
                                        <div key={i} className={styles.sliderItem}>
                                            <ImageSlider image={image} />
                                        </div>
                                    ))}
                                </div>

                                {/* DOTS */}
                                <div className={styles.dotsWrapper}>
                                    {scrollImages.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.dotItem} ${
                                                mobileActiveSlideIndex === i ? styles.activeDot : ''
                                            }`}
                                            onClick={() => scrollToMobileSlide(i)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Desktop version with centered larger image */
                            <div className={styles.desktopSliderSection}>
                                <div
                                    className={styles.desktopSliderContainer}
                                    ref={desktopSliderRef}
                                    onScroll={handleDesktopScroll}
                                >
                                    {scrollImages.map((src, i) => (
                                        <div 
                                            key={i} 
                                            className={`${styles.desktopSliderItem} ${
                                                desktopActiveSlideIndex === i ? styles.centerSliderItem : ''
                                            }`}
                                        >
                                            <img 
                                                src={src}
                                                alt="AI example"
                                                className={styles.desktopSliderImg}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                        )}
                        <div className={styles.nextButtonStepOneWrapper}>
                            <button
                                className={styles.nextButtonStepOne}
                                onClick={() => setStep(2)}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* <div className={styles.nextButtonStepOneWrapper}>
                        <button
                            className={styles.nextButtonStepOne}
                            onClick={() => setStep(2)}
                        >
                            Next
                        </button>
                    </div> */}
                </div>
            )}

            {step === 2 && (
                <div className={styles.onboardingContentStepTwo}>

                    <div className={styles.stepTwoContentTopWrapper}>
                        <div className={styles.stepTwoContentTopWrapperInner}>
                            <h1 className={styles.stepTwoTitle}>
                                Transform Your Selfies <br/> into Stunning <span className={styles.highlightText}>AI Photos</span>
                            </h1>

                            <div className={styles.visualRowWrapper}>
                                <div className={styles.visualSteps}>

                                    {/* Step 1 */}
                                    <div className={styles.stepItem}>
                                        <div className={styles.imageCard}>
                                            <Image
                                                src="/assets/images/onboarding/onboarding_step_1.png"
                                                alt="Wedding style"
                                                width={170}
                                                height={208}
                                                className={styles.imageCardImage}
                                            />
                                            <div className={styles.imageLabel}>Wedding style</div>
                                        </div>
                                        <div className={styles.stepTextWrapper}>
                                            <div className={styles.stepNumber}>1</div>
                                            <div className={styles.stepTitle}>Choose Your Look</div>
                                            <div className={styles.stepSub}>
                                                Select from business, casual, wedding, travel, or any custom style
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div className={styles.stepItem}>
                                        <div className={styles.imageCard}>
                                            <Image
                                                src="/assets/images/onboarding/onboarding_step_2.png"
                                                alt="Upload photos"
                                                width={170}
                                                height={208}
                                                className={styles.imageCardImage}
                                            />
                                        </div>
                                        <div className={styles.stepTextWrapper}>
                                            <div className={styles.stepNumber}>2</div>
                                            <div className={styles.stepTitle}>Upload Your Photo</div>
                                            <div className={styles.stepSub}>
                                                Upload a few photos or simply describe what you want. AI will bring your idea to life
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div className={styles.stepItem}>
                                        <div className={styles.imageCard}>
                                            <Image
                                                src="/assets/images/onboarding/onboarding_step_3.png"
                                                alt="AI Result"
                                                width={170}
                                                height={208}
                                                className={styles.imageCardImage}
                                            />
                                            <div className={styles.imageLabel}>AI Result</div>
                                        </div>
                                        <div className={styles.stepTextWrapper}>
                                            <div className={styles.stepNumber}>3</div>
                                            <div className={styles.stepTitle}>Get Instant Results</div>
                                            <div className={styles.stepSub}>
                                                Receive 50+ AI-generated high-quality photos in minutes
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.nextButtonStepOneWrapper}>
                        <button
                            className={styles.nextButtonStepTwo}
                            onClick={() => setStep(3)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className={styles.stepFourContent}>
                    {!isMobile && (
                        <div className={styles.photoshoot_header_wrapper_dsk_column}>
                            <div className={styles.photoshoot_header_wrapper_dsk}>
                                <div className={styles.photoshoot_header_styles}>
                                    <div className={styles.photoshoot_header}>
                                        Pick a style you love
                                    </div>
                                </div>

                                <GenderFilterDropdown
                                    selectedGender={selectedGenderFilter}
                                    setSelectedGender={setSelectedGenderFilter}
                                />
                            </div>
                            <div className={styles.photoshoot_header_dsk}>
                                AI will create your photo in that look.
                            </div>
                        </div>
                    )}

                    {isMobile && (
                         <div className={styles.model_category_wrapper_combined}>

                            <div className={styles.photoshoot_header_wrapper}>
                                <div className={styles.photoshoot_header}>
                                    Pick a style you love
                                </div>

                                <GenderFilterDropdown
                                    selectedGender={selectedGenderFilter}
                                    setSelectedGender={setSelectedGenderFilter}
                                />
                            </div>

                            <div className={styles.photoshoot_header_dsk}>
                                AI will create your photo in that look.
                            </div>
                        </div>
                    )}

                    <div className={styles.photoshoot_grid_container}>
                        <div className={styles.photoshoot_grid_wrapper}>
                            <div className={styles.photoshoot_grid}>
                                {filteredPhotoshoots.map((item, index) => (
                                    <PhotoshootCard
                                    key={index}
                                    type={item.type}
                                    imageSrc={item.mainImage}
                                    isSelected={selectedTypeIndex === index}
                                    onClick={() => {
                                        setSelectedTypeIndex(index);
                                        setStep(4);
                                    }}
                                    onDetailsClick={() => handleDetailsClick(item.type)}
                                    showGenerateButton={false}
                                    showChooseButton={true}
                                    onChooseClick={() => setStep(4)}
                                    />
                                ))}
                            </div>
                        </div>
                        {/* <button 
                            className={styles.nextButtonStyleStepThree}
                            onClick={() => setStep(4)}
                        >
                            Next
                        </button> */}
                    </div>
                </div> 
            )}

            {step === 4 && (
                <div className={styles.stepFiveContent}>

                    <div className={styles.stepFiveTopContentWrapper}>

                        <div className={styles.second_page_header}>
                            <div className={styles.second_page_text}>See your AI photo</div>
                            <div className={styles.second_page_text_bottom}>
                                Just upload one selfie to begin
                            </div>
                        </div>

                        {/* NEW ROW ─ upload box (30 %) + examples panel (70 %) */}
                        <div className={styles.examplesRow}>

                            {/* ───── Left : upload box ───── */}
                            <div className={styles.uploadBox} onClick={openFileDialog}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={uploadInputRef}
                                    style={{ display: 'none' }}
                                    onChange={onFileSelect}
                                />

                                {uploadedImage ? (
                                    /* ---- preview ---- */
                                    <img
                                        src={uploadedImage}
                                        alt="uploaded"
                                        className={styles.uploadPreview}
                                    />
                                ) : (
                                    /* ---- dashed box with button/text ---- */
                                    <div className={styles.uploadInner}>
                                        <button className={styles.uploadBtn} type="button">
                                            <UploadPhotoIcon width={20} height={20} />
                                            <span>Upload photo</span>
                                        </button>

                                        <div className={styles.dragText}>
                                            Or drag and drop your photos
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ───── Right : good / avoid examples ───── */}
                            <div className={styles.photoExamplesSection}>
                            {uploadedImage ? (
                                <div className={styles.examplesCtaWrapper}>
                                    <span className={styles.examplesCtaText}>
                                        Create your account to see your photos
                                    </span>

                                    <button
                                        className={styles.createAccountBtn}
                                        onClick={() => {
                                        if (session?.user) {
                                            router.push('/pricing?onb=1');
                                        } else {
                                            toggleLoginModal();
                                        }
                                        }}
                                    >
                                        Create it now
                                    </button>
                                    </div>
                                ) : (
                                <>
                                    {/* ✅ Good */}
                                    <div className={styles.photoBlock}>
                                        <div className={styles.photoBlockTitle}>✅ Good photos</div>
                                        <div className={styles.photoRow}>
                                            {['High resolution','No accessories','Neutral expression','One person']
                                                .map((label, idx) => (
                                                <div className={styles.photoItem} key={idx}>
                                                    <div className={styles.photoImageWrapper}>
                                                        <Image
                                                            src={`/assets/images/models/modal/${selectedGenderFilter.toLowerCase()}/good/good_${idx+1}.png`}
                                                            alt={label}
                                                            width={136}
                                                            height={150}
                                                            className={styles.photoImage}
                                                        />
                                                        <div className={styles.photoLabel}>{label}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ❌ Avoid */}
                                    <div className={styles.photoBlock}>
                                        <div className={styles.photoBlockTitle}>❌ Avoid</div>
                                        <div className={styles.photoRow}>
                                            {['Low-quality images','Sunglasses, masks','Extreme facial','Group photos']
                                                .map((label, idx) => (
                                                <div className={styles.photoItem} key={idx}>
                                                    <div className={styles.photoImageWrapper}>
                                                        <Image
                                                            src={`/assets/images/models/modal/${selectedGenderFilter.toLowerCase()}/avoid/avoid_${idx+1}.png`}
                                                            alt={label}
                                                            width={136}
                                                            height={150}
                                                            className={styles.photoImage}
                                                        />
                                                        <div className={styles.photoLabel}>{label}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                                )}
                            </div>{/* /photoExamplesSection */}
                        </div>{/* /examplesRow */}
                    </div>
                </div>
            )}

            {selectedType && selectedMainImage && (
                <ModelDetailsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    type={selectedType}
                    gender={selectedGenderFilter}
                    mainImage={selectedMainImage}
                    additionalImages={selectedAdditionalImages}
                    showGenerateButton={false}
                />
            )}

            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={toggleLoginModal} 
                order='default'
                returnTo="/pricing?onb=1" 
            />

        </div>
    );
}
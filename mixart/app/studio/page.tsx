'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './page.module.css';

import GeneratedImage from '../components/GeneratedImage/GeneratedImage';
import ImageDetailsModal from '../components/ImageDetailsModal/ImageDetailsModal';

import { useUserImages } from '@/app/context/UserImagesContext';
import { useControlMenuContext } from '../context/ControlMenuContext';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { eventBus } from '@/app/lib/event/eventBus';
import { toggleFavoriteImage, deleteImageById } from '../lib/api/imageActions';
import CanvasArea from '@/app/components/CanvasArea/CanvasArea';

import { ImageMetadata } from '../lib/api/fetchUserImages';

const NEXT_PUBLIC_USER_IMAGES_URL = process.env.NEXT_PUBLIC_USER_IMAGES_URL!;

export default function Creation() {
  /* ------------------------------------------------------------------ */
  /* context & state                                                    */
  /* ------------------------------------------------------------------ */
  const {
    images,
    setImages,
    fetchMoreImages,
    refetchImages,
    loading,
    hasMore,
  } = useUserImages();

  const {
    maskBaseImage,
    setMaskBaseImage,
    maskImage,
    setMaskImage,
  } = useControlMenuContext();

  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  const [activeCanvasTab, setActiveCanvasTab] =
    useState<'Canvas' | 'Gallery'>('Canvas');

  /* ---------- NEW: reset Canvas/Gallery when the menu tab changes ---- */
  useEffect(() => {
    if (activeTab === 'canvas') {
      setActiveCanvasTab('Canvas');
    }
  }, [activeTab]);
  /* ------------------------------------------------------------------ */

  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [columns, setColumns] = useState<ImageMetadata[][]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);

  const masonryRef = useRef<HTMLDivElement>(null);
  const lastImageRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */
  const getNumberOfColumns = () => {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth >= 1600) return 5;
    return 3;
  };

  const createColumns = (imgs: ImageMetadata[], numCols: number) => {
    const cols = Array.from({ length: numCols }, () => [] as ImageMetadata[]);
    imgs.forEach((img, i) => cols[i % numCols].push(img));
    return cols;
  };

  const updateLayout = (imgs: ImageMetadata[]) => {
    setColumns(createColumns(imgs, getNumberOfColumns()));
  };

  /* ------------------------------------------------------------------ */
  /* initial load & resize                                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const handleResize = () => updateLayout(images);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [images]);

  useEffect(() => {
    if (session?.user?.id) {
      refetchImages().then((fresh) => updateLayout(fresh));
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (images.length) updateLayout(images);
  }, [images]);

  /* ------------------------------------------------------------------ */
  /* generation-start listener & polling                                */
  /* ------------------------------------------------------------------ */
  const onGenerationStart = useCallback(async () => {
    if (!session?.user?.id) return;

    if (activeTab === 'canvas') setActiveCanvasTab('Gallery');

    const fresh = await refetchImages();
    updateLayout(fresh);
    setShouldRefetch(true);
  }, [session?.user?.id, activeTab, refetchImages]);

  useEffect(() => {
    eventBus.addEventListener('generation-start', onGenerationStart);
    return () =>
      eventBus.removeEventListener('generation-start', onGenerationStart);
  }, [onGenerationStart]);

  useEffect(() => {
    if (!shouldRefetch) return;
    const int = setInterval(async () => {
      const fresh = await refetchImages();
      updateLayout(fresh);
      const stillGenerating = fresh.some((img) => img.status === 'generating');
      if (!stillGenerating) {
        clearInterval(int);
        setShouldRefetch(false);
        eventBus.dispatchEvent(new Event('generation-finish'));
      }
    }, 10_000);
    return () => clearInterval(int);
  }, [shouldRefetch]);

  /* ------------------------------------------------------------------ */
  /* infinite scroll                                                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!lastImageRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) fetchMoreImages();
      },
      { threshold: 0.5 }
    );
    observer.observe(lastImageRef.current);
    return () => observer.disconnect();
  }, [columns, loading, hasMore, fetchMoreImages]);

  /* ------------------------------------------------------------------ */
  /* actions                                                            */
  /* ------------------------------------------------------------------ */
  const handleToggleFavorite = async (id: string, res: string) => {
    await toggleFavoriteImage(id, session?.user?.id!, res, setImages);
    const fresh = await refetchImages();
    updateLayout(fresh);
  };

  const handleDeleteImage = async (id: string) => {
    await deleteImageById(id, setImages);
    const fresh = await refetchImages();
    updateLayout(fresh);
  };

  /* ------------------------------------------------------------------ */
  /* canvas callbacks                                                   */
  /* ------------------------------------------------------------------ */
  const [predictions, setPredictions] = useState<any[]>([]);
  const handleDraw = (d: string) => {};
  const handleSave = (d: string) => setMaskBaseImage(d);

  /* ------------------------------------------------------------------ */
  /* render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className={styles.mansory_page_wrapper}>
      {activeTab === 'canvas' && (
        <div className={styles.model_tab_selector}>
          <button
            className={`${styles.model_tab} ${
              activeCanvasTab === 'Canvas' ? styles.active_tab : ''
            }`}
            onClick={() => setActiveCanvasTab('Canvas')}
          >
            Canvas
          </button>
          <button
            className={`${styles.model_tab} ${
              activeCanvasTab === 'Gallery' ? styles.active_tab : ''
            }`}
            onClick={() => setActiveCanvasTab('Gallery')}
          >
            Gallery
          </button>
        </div>
      )}

      {activeTab === 'canvas' && activeCanvasTab === 'Canvas' && (
        <div className={styles.ai_generator_canvas_wrapper}>
          <div className={styles.ai_generator_canvas}>
            <CanvasArea
              userUploadedImage={maskImage.image}
              predictions={predictions}
              onDraw={handleDraw}
              onSave={handleSave}
              onImageUpload={(img) =>
                setMaskImage({ image: img, imageType: 'canvas' })
              }
            />
          </div>
        </div>
      )}

      <div
        className={styles.masonry_scroll_wrapper}
        style={{
          display:
            activeTab === 'canvas' && activeCanvasTab === 'Canvas'
              ? 'none'
              : '',
        }}
      >
        <div className={styles.masonry} ref={masonryRef}>
          {columns.map((col, colIdx) => (
            <div key={colIdx} className={styles.column}>
              {col.map((img, idx) => {
                const isLast = images.indexOf(img) === images.length - 1;
                return (
                  <GeneratedImage
                    key={img._id}
                    ref={isLast ? lastImageRef : null}
                    src={`${NEXT_PUBLIC_USER_IMAGES_URL}${img.res_image}`}
                    status={img.status}
                    isFavorite={img.favorite}
                    onToggleFavorite={() =>
                      handleToggleFavorite(img._id, img.res_image)
                    }
                    onDelete={() => handleDeleteImage(img._id)}
                    onGenerateSimilar={() => console.log('Similar', img._id)}
                    onReuse={() => console.log('Reuse', img._id)}
                    onReusePrompt={() => console.log('Prompt', img._id)}
                    onClickDetails={() => setSelectedImage(img)}
                    downloadName={`${img._id}.png`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ImageDetailsModal
        isOpen={!!selectedImage}
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
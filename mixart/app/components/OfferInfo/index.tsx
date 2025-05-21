import Button from "../Button";
import styles from "./offerInfo.module.css";

export default function OfferInfo() {
  return (
    <div className={styles.offer_info}>
      <span className={styles.offer_description}>
        AI-Generated Portraits That Look 100% Real
      </span>
      <h1 className={styles.h1}>Perfect Photos Without the Hassle</h1>
      <ul className={styles.list}>
        <li>No studio, no photographer – just effortless perfection.</li>
        <li>Look like you’ve had a professional photoshoot.</li>
        <li>
          Ideal for work profiles, social media, dating, and personal branding.
        </li>
      </ul>
      <Button>Get Your AI Photos Now</Button>
    </div>
  );
}
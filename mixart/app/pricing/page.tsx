'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from 'next-auth/react';
import FaqInfo from '../components/FaqInfo/FaqInfo';
import PricingPlans from '../components/PricingPlans/PricingPlans';
import styles from './Pricing.module.css';

export default function PricingPage() {
    const searchParams = useSearchParams();
    const [hideContact, setHideContact] = useState(searchParams.get("onb") === "1");
    
    return (
        <div className={styles.pageWrapper}>            
            {/* <PricingPlans /> */}

            {!hideContact && (
                <div className={styles.website_faq_email}>
                Contact us at <span className={styles.website_faq_span}>hi@mixart.ai</span> for any additional queries and concerns
                </div>
            )}
            
            <FaqInfo />
        </div>
    );
}
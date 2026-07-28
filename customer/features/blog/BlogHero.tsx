import Button from '@/shared/ui/Button'
import Image from 'next/image'
import React from 'react'

const BlogHero = () => {
    return (
        <div className='w-full h-screen relative flex justfy-center items-center'>

            {/* <Image src="/images/home/hero-2.jpeg" alt='products hero' fill className='object-cover object-top' /> */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover object-top"
            >
                <source src="/videos/home-hero.mp4" type="video/mp4" />
            </video>

            <div className='absolute w-full h-full top-0 left-0 bg-primary/30'></div>



        </div>
    )
}

export default BlogHero
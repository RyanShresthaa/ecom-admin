import Image from 'next/image'
import React from 'react'

const History = () => {
  return (
    <div className='h-[70vh] max-w-[1450px] rounded-2xl w-full  mx-auto relative'>
      <Image src="/images/hero/divider/banner.png" alt='banner' fill className='object-cover object-top' />
    </div>
  )
}

export default History
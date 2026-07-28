import Image from 'next/image';
import type { Artisan } from '@/shared/data/productData';

interface ArtisanSectionProps {
  artisan: Artisan;
}

export default function ArtisanSection({ artisan }: ArtisanSectionProps) {
  return (
    <section className="mt-16 sm:mt-24 pt-16 border-t border-primary/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Artisan Image */}
        <div className="relative aspect-5/3.5 rounded-2xl overflow-hidden border-2 border-primary/10">
          <Image
            src={artisan.image}
            alt={artisan.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </div>

        {/* Artisan Info */}
        <div className="flex flex-col gap-5">
          <span className="font-secondary text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">
            Meet the Artisan
          </span>

          <h2 className="font-heading text-3xl sm:text-4xl font-normal leading-tight text-primary-dark">
            {artisan.name}
          </h2>

          <div className="flex flex-col gap-4">
            {artisan.bio.map((paragraph, idx) => (
              <p
                key={idx}
                className="font-secondary text-sm leading-relaxed text-body/80"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-16 pt-4 mt-2 border-t border-primary/10">
            <div className="flex flex-col">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-primary leading-none">
                {artisan.stats.yearsOfCraft}+
              </span>
              <span className="font-secondary text-[10px] sm:text-[11px] text-body/60 mt-1">
                Years of craft
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-primary leading-none">
                {artisan.stats.itemsCreated}+
              </span>
              <span className="font-secondary text-[10px] sm:text-[11px] text-body/60 mt-1">
                Pieces created
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-primary leading-none">
                {artisan.stats.apprentices}
              </span>
              <span className="font-secondary text-[10px] sm:text-[11px] text-body/60 mt-1">
                Apprentices mentored
              </span>
            </div>
          </div>

          {/* Link */}
          {/* <div className="pt-2">
            <span className="inline-flex items-center gap-2 font-secondary text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark transition-colors group cursor-pointer border-b border-transparent hover:border-current pb-0.5">
              <span>Read {artisan.name}&apos;s full story</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </div> */}
        </div>
      </div>
    </section>
  );
}

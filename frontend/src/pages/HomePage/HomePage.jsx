import useProducts from '../../hooks/useProducts';
import Hero from '../../components/Hero/Hero';
import FeaturedDrops from '../../components/home/FeaturedDrops';
import NewArrivals from '../../components/home/NewArrivals';
import ShopByCategory from '../../components/home/ShopByCategory';
import BrandStory from '../../components/home/BrandStory';
import Newsletter from '../../components/home/Newsletter';

export default function HomePage() {
  const { products, status } = useProducts();

  return (
    <>
      <Hero />
      <FeaturedDrops products={products} status={status} />
      <NewArrivals products={products} status={status} />
      <ShopByCategory />
      <BrandStory />
      <Newsletter />
    </>
  );
}
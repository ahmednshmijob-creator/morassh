
import { posts } from '@/blog/posts';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { PostCard } from '@/components/blog/PostCard';


export default function BlogPage() {
  const sortedPosts = [...posts].sort((a, b) => new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime());

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 sm:px-6" dir="rtl">
        <BlogHeader 
            title="مدونة النمو الرقمي"
            description="دليلك المتكامل لبناء مشروع تجاري ناجح ومستدام في قطاع الأغذية والمشروبات السعودي."
        />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {sortedPosts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      <section className="bg-primary/5 rounded-[2.5rem] p-8 md:p-12 text-center border border-primary/10">
          <h2 className="text-2xl md:text-3xl font-black mb-4">هل أنت صاحب مطعم أو مقهى؟</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">انضم إلى آلاف المشاريع التي تستخدم أدواتنا الذكية لزيادة أرباحها وتبسيط عملياتها الرقمية.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register" className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform">ابدأ مجاناً اليوم</a>
              <a href="/pricing" className="bg-white border-2 px-8 py-4 rounded-2xl font-black hover:bg-gray-50 transition-colors">اكتشف المميزات</a>
          </div>
      </section>
    </div>
  );
}

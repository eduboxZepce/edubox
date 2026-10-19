import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import EmptyState from '@/components/feedback/EmptyState';
import BlogList from '@/components/blog/BlogList';
import { blogCategories } from '@/lib/blog';
import { listBlogPosts } from '@/lib/server/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Blog — savjeti za učenje i teme iz struke',
  description:
    'Kratki tekstovi o tome kako učiti, što se traži na tržištu rada i kako izgleda posao u IT-u, programiranju, poslovanju i ličnom razvoju.',
  path: '/blog',
});

/**
 * Static, refreshed on demand: every admin write calls `revalidateBlog()`, and
 * the hourly fallback catches an edit made straight in the database.
 */
export const revalidate = 3600;

/**
 * The blog index - filter pills + search, a featured post, then a
 * paginated grid of the rest. See BlogList for the interactive part;
 * this stays a Server Component so the posts are read on the server and
 * the page metadata/shell need no client JS of their own.
 */
export default async function BlogIndexPage() {
  const posts = await listBlogPosts();

  return (
    <PageContainer>
      <PageHeader
        title="Savjeti za učenje i teme iz struke"
        description="Kratki tekstovi o tome kako učiti, što se traži na tržištu i kako izgleda rad u pojedinim oblastima."
      />

      {posts.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={<ArticleOutlinedIcon />}
            title="Još nema objavljenih tekstova"
            description="Prvi tekstovi stižu uskoro."
          />
        </ContentCard>
      ) : (
        <BlogList posts={posts} categories={blogCategories(posts)} />
      )}
    </PageContainer>
  );
}

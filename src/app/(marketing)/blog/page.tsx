import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import EmptyState from '@/components/feedback/EmptyState';
import BlogList from '@/components/blog/BlogList';
import { BLOG_POSTS, BLOG_CATEGORIES } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Blog — savjeti za učenje i teme iz struke',
  description:
    'Kratki tekstovi o tome kako učiti, šta se traži na tržištu rada i kako izgleda posao u IT-u, menadžmentu, marketingu i drugim oblastima.',
  path: '/blog',
});

/**
 * The blog index - filter pills + search, a featured post, then a
 * paginated grid of the rest. See BlogList for the interactive part;
 * this stays a Server Component so the page metadata/shell need no
 * client JS of their own.
 */
export default function BlogIndexPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Savjeti za učenje i teme iz struke"
        description="Kratki tekstovi o tome kako učiti, šta se traži na tržištu i kako izgleda rad u pojedinim oblastima."
      />

      {BLOG_POSTS.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={<ArticleOutlinedIcon />}
            title="Još nema objavljenih tekstova"
            description="Prvi tekstovi stižu uskoro."
          />
        </ContentCard>
      ) : (
        <BlogList posts={BLOG_POSTS} categories={BLOG_CATEGORIES} />
      )}
    </PageContainer>
  );
}

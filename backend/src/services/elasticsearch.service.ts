import { getElasticsearchClient, EMAIL_INDEX } from '../config/elasticsearch';
import type { Email } from '@prisma/client';

class ElasticsearchService {
  /**
   * Index a single email document.
   */
  async indexEmail(email: Email): Promise<void> {
    try {
      const client = getElasticsearchClient();
      await client.index({
        index: EMAIL_INDEX,
        id: email.id,
        body: {
          id: email.id,
          userId: email.userId,
          fromAddress: email.fromAddress,
          toAddress: email.toAddress,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt.toISOString(),
          sentAt: email.sentAt?.toISOString() || null,
          createdAt: email.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.warn('⚠️  ES indexing failed:', (error as Error).message);
    }
  }

  /**
   * Bulk index multiple emails.
   */
  async bulkIndex(emails: Email[]): Promise<void> {
    if (emails.length === 0) return;

    try {
      const client = getElasticsearchClient();
      const operations = emails.flatMap((email) => [
        { index: { _index: EMAIL_INDEX, _id: email.id } },
        {
          id: email.id,
          userId: email.userId,
          fromAddress: email.fromAddress,
          toAddress: email.toAddress,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt.toISOString(),
          sentAt: email.sentAt?.toISOString() || null,
          createdAt: email.createdAt.toISOString(),
        },
      ]);

      await client.bulk({ body: operations });
    } catch (error) {
      console.warn('⚠️  ES bulk indexing failed:', (error as Error).message);
    }
  }

  /**
   * Full-text search across emails for a user.
   */
  async searchEmails(
    userId: string,
    query: string,
    from = 0,
    size = 20
  ): Promise<{ hits: Array<{ _id: string; _source: Record<string, unknown> }>; total: number }> {
    try {
      const client = getElasticsearchClient();
      const result = await client.search({
        index: EMAIL_INDEX,
        body: {
          from,
          size,
          query: {
            bool: {
              must: [
                { term: { userId } },
                {
                  multi_match: {
                    query,
                    fields: ['subject^2', 'body', 'toAddress', 'fromAddress'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
          sort: [{ createdAt: { order: 'desc' } }],
        },
      });

      const hits = (result.hits.hits as Array<{ _id: string; _source: Record<string, unknown> }>);
      const total =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : (result.hits.total as { value: number })?.value || 0;

      return { hits, total };
    } catch (error) {
      console.warn('⚠️  ES search failed:', (error as Error).message);
      return { hits: [], total: 0 };
    }
  }
}

export const elasticsearchService = new ElasticsearchService();

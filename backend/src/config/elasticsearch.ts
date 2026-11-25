import { Client } from '@elastic/elasticsearch';
import { env } from './env';

let esClient: Client | null = null;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    esClient = new Client({
      node: env.elasticsearchUrl,
    });
  }
  return esClient;
}

export const EMAIL_INDEX = 'emails';

export async function initElasticsearch(): Promise<void> {
  const client = getElasticsearchClient();

  try {
    const indexExists = await client.indices.exists({ index: EMAIL_INDEX });

    if (!indexExists) {
      await client.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              fromAddress: { type: 'keyword' },
              toAddress: { type: 'keyword' },
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Elasticsearch index "emails" created');
    } else {
      console.log('✅ Elasticsearch index "emails" already exists');
    }
  } catch (error) {
    console.warn('⚠️  Elasticsearch not available, search will be disabled:', (error as Error).message);
  }
}

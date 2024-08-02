export interface HubSpotDataSourceOptions {
  hubSpotToken: string,
}

export const HUBSPOT_COMMON_COLLECTIONS_TO_API = {
  companies: 'companies',
  contacts: 'contacts',
  deals: 'deals',
  feedback_submissions: 'feedbackSubmissions',
  line_items: 'lineItems',
  products: 'products',
  quotes:'quotes',
  tickets: 'tickets',
}